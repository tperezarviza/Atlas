import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_API_KEY, TTL } from '../config.js';
import { cache } from '../cache.js';
import type { BriefResponse, Conflict, NewsPoint, FeedItem, MarketSection } from '../types.js';

const SYSTEM_PROMPT = `You are ATLAS, a senior geopolitical intelligence analyst providing briefings for a decision-maker interested in global security, US national interests, Middle East stability, China threat assessment, border security, and market impacts of geopolitical events.

Your briefings should be:
- Direct, no-nonsense, factual
- Structured with clear sections
- Focused on actionable intelligence and what to watch
- Always connect geopolitical events to market implications
- Flag anything relevant to US national security interests
- Highlight wins for current US administration policy where data supports it
- Note threats from Iran, China, Russia, non-state actors
- Include border security developments when relevant

FORMAT (use HTML tags for formatting):
<h2>■ SITUATION OVERVIEW</h2>
<p>2-3 sentences, big picture</p>
<h2>■ CRITICAL DEVELOPMENTS</h2>
<ul><li>bullet points of last 24h developments</li></ul>
<h2>■ THREAT MATRIX</h2>
<p><strong>CRITICAL:</strong> items</p>
<p><strong>ELEVATED:</strong> items</p>
<p><strong>WATCH:</strong> items</p>
<h2>■ MARKET IMPLICATIONS</h2>
<p>How geopolitics affects markets today</p>
<h2>■ 72-HOUR OUTLOOK</h2>
<p>What to expect next</p>
<h2>■ RECOMMENDED MONITORING</h2>
<ul><li>Specific things to track</li></ul>`;

const FOCUS_PROMPTS: Record<string, string> = {
  mideast: '\n\nFocus exclusively on Middle East developments: Iran nuclear program, Israel-Palestine conflict, Houthi Red Sea attacks, Syria, Iraq, Gulf dynamics, Turkey. Filter out non-ME developments unless they directly impact the region.',
  ukraine: '\n\nFocus on Russia-Ukraine conflict: front-line changes, military operations, NATO response, sanctions effectiveness, energy implications, nuclear risk assessment. Filter out non-Ukraine developments unless directly relevant.',
  domestic: '\n\nFocus on US domestic developments: executive orders, Congress activity, border security metrics, economic indicators, polling trends, DOGE efficiency initiatives, trade policy. Filter out foreign policy unless it directly impacts domestic agenda.',
  intel: '\n\nFocus on intelligence and security: state media propaganda narratives, bilateral hostility indices, internet freedom incidents, diplomatic calendar events, intelligence community assessments, covert operations indicators, sanctions enforcement, espionage developments. Highlight disinformation campaigns, cyber-espionage, and signals intelligence where relevant.',
};

const ALLOWED_HTML_TAGS = new Set(['h1','h2','h3','h4','p','ul','ol','li','b','strong','em','i','br','span']);

/** Defense-in-depth: strip disallowed tags and attributes server-side (client also has DOMPurify). */
function sanitizeServerHtml(raw: string): string {
  return raw.replace(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*?)(\s*\/?)>/gi, (_match, slash, tag, attrs, selfClose) => {
    const tagLower = tag.toLowerCase();
    if (!ALLOWED_HTML_TAGS.has(tagLower)) return '';
    if (slash) return `</${tagLower}>`;
    // Only preserve class attribute, strip everything else
    const classMatch = (attrs as string).match(/\bclass\s*=\s*"([^"]*)"/i);
    const classAttr = classMatch ? ` class="${classMatch[1].replace(/[^a-zA-Z0-9_ -]/g, '')}"` : '';
    return `<${tagLower}${classAttr}${selfClose}>`;
  });
}

export async function fetchBrief(focus?: string): Promise<BriefResponse> {
  if (!ANTHROPIC_API_KEY) {
    console.warn('[AI-BRIEF] No ANTHROPIC_API_KEY configured, skipping');
    throw new Error('No API key');
  }

  console.log(`[AI-BRIEF] Generating intelligence brief${focus ? ` (focus: ${focus})` : ''}...`);

  const conflicts = cache.get<Conflict[]>('conflicts') ?? [];
  const news = cache.get<NewsPoint[]>('news') ?? [];
  const feed = cache.get<FeedItem[]>('feed') ?? [];
  const markets = cache.get<MarketSection[]>('markets') ?? [];

  const systemPrompt = SYSTEM_PROMPT + (focus && FOCUS_PROMPTS[focus] ? FOCUS_PROMPTS[focus] : '');

  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: `Generate intelligence brief based on this data:

CONFLICTS: ${JSON.stringify(conflicts.slice(0, 10))}

TOP NEWS (most negative tone): ${JSON.stringify([...news].sort((a, b) => a.tone - b.tone).slice(0, 15))}

LEADER STATEMENTS: ${JSON.stringify(feed.slice(0, 8))}

MARKETS: ${JSON.stringify(markets.map((s) => ({ title: s.title, items: s.items.map((i) => ({ name: i.name, price: i.price, delta: i.delta })) })))}

Current UTC: ${new Date().toISOString()}`,
    }],
  });

  const textBlock = message.content.find((b) => b.type === 'text');
  const html = sanitizeServerHtml(textBlock?.text ?? '<p>Brief generation failed</p>');

  const cacheKey = focus ? `brief:${focus}` : 'brief';
  const brief: BriefResponse = {
    html,
    generatedAt: new Date().toISOString(),
    model: 'claude-sonnet-4-5-20250929',
    sources: ['ACLED', 'GDELT', 'Market Data', 'Leader Feeds'],
  };

  cache.set(cacheKey, brief, TTL.BRIEF);
  console.log(`[AI-BRIEF] Brief generated and cached (key: ${cacheKey})`);
  return brief;
}
