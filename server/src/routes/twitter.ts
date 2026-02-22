import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import { respondWithMeta } from '../utils/respond.js';
import type { TwitterIntelItem, TweetCategory } from '../types.js';

const VALID_CATEGORIES = new Set<TweetCategory>(['crisis', 'military', 'geopolitical', 'border', 'osint', 'trump']);

export function registerTwitterRoutes(app: FastifyInstance) {
  app.get('/api/twitter', async (req, reply) => {
    const result = respondWithMeta('twitter', req.query as Record<string, string>);
    const cat = (req.query as Record<string, string>).category;
    if (cat) {
      if (!VALID_CATEGORIES.has(cat as TweetCategory)) {
        return reply.code(400).send({ error: 'Invalid category', valid: [...VALID_CATEGORIES] });
      }
      const filtered = (Array.isArray(result.data) ? result.data : []).filter((t: any) => t.category === cat);
      return { data: filtered, meta: result.meta };
    }
    return result;
  });

  app.get('/api/twitter/trending', async (req) => {
    const tweets = cache.get<TwitterIntelItem[]>('twitter') ?? [];
    // Extract trending keywords from recent tweets
    const wordFreq = new Map<string, number>();
    const stopWords = new Set([
      // Articles, pronouns, prepositions, conjunctions, auxiliaries
      'the','a','an','is','are','was','were','in','on','at','to','for','of','and','or','but','not',
      'with','from','by','this','that','it','its','has','have','had','be','been','will','would',
      'could','should','can','may','rt','via','just','now','new','says','said','https','http',
      // Common pronouns & determiners
      'they','their','them','these','those','what','which','who','whom','whose','where','when',
      'how','why','your','you','your','yours','our','ours','his','her','hers','him','she','he',
      'we','me','my','mine','its','itself','himself','herself','themselves','ourselves',
      // Common verbs & auxiliaries
      'does','did','do','done','doing','get','gets','got','getting','got','make','made','makes',
      'making','take','takes','took','taken','taking','come','comes','came','coming','give',
      'gives','gave','given','giving','going','goes','went','gone','know','knows','knew','known',
      'think','thinks','thought','want','wants','wanted','see','sees','saw','seen','look','looks',
      'looked','looking','find','finds','found','tell','tells','told','ask','asks','asked',
      'need','needs','needed','seem','seems','seemed','feel','feels','felt','keep','keeps','kept',
      'let','lets','begin','begins','began','show','shows','showed','shown','hear','heard',
      'play','plays','played','run','runs','move','moves','live','lives','believe','hold',
      'bring','happen','happens','happened','write','wrote','writes','sit','stand','lose','pay',
      'meet','include','includes','including','continue','set','learn','change','lead','leads',
      'being','having','saying','going','getting','making','coming','taking','using',
      // Common adverbs & adjectives
      'also','very','often','however','too','much','many','more','most','than','then','only',
      'just','even','still','already','ever','never','always','sometimes','here','there',
      'about','after','before','between','both','each','other','some','such','into','over',
      'under','again','further','once','back','well','also','around','must','really','right',
      'still','might','through','while','same','different','small','large','long','little',
      'great','high','old','big','american','first','last','good','best','better','like',
      'real','sure','free','full','early','hard','late','safe','away','down','off','over',
      // Common nouns (too generic for trends)
      'people','time','year','years','day','days','week','weeks','world','life','thing','things',
      'part','place','case','point','group','number','fact','hand','state','today','work',
      'area','country','home','news','way','report','says','according','since','because',
      'during','another','without','until','being','against','through','don','didn','won',
      // Social media noise
      'follow','like','share','retweet','tweet','thread','breaking','update','updates',
      'read','watch','video','photo','image','link','click','source','sources','official',
    ]);

    for (const t of tweets) {
      const words = t.text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w));
      for (const w of words) wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
    }

    // Only return words that appear in 2+ tweets (avoid noise from single tweets)
    return [...wordFreq.entries()]
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([keyword, count]) => ({ keyword, count }));
  });
}
