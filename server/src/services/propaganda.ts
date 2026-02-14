import Anthropic from '@anthropic-ai/sdk';
import RSSParser from 'rss-parser';
import { ANTHROPIC_API_KEY, FETCH_TIMEOUT_RSS, TTL } from '../config.js';
import { cache } from '../cache.js';
import { stripHTML } from '../utils.js';
import type { PropagandaEntry } from '../types.js';

const parser = new RSSParser({ timeout: FETCH_TIMEOUT_RSS });

const STATE_MEDIA: { country: string; code: string; outlets: { name: string; domain: string }[] }[] = [
  {
    country: 'Russia', code: 'RU',
    outlets: [
      { name: 'RT', domain: 'rt.com' },
      { name: 'TASS', domain: 'tass.com' },
      { name: 'Sputnik', domain: 'sputniknews.com' },
    ],
  },
  {
    country: 'China', code: 'CN',
    outlets: [
      { name: 'Xinhua', domain: 'xinhuanet.com' },
      { name: 'Global Times', domain: 'globaltimes.cn' },
      { name: 'CGTN', domain: 'cgtn.com' },
    ],
  },
  {
    country: 'Iran', code: 'IR',
    outlets: [
      { name: 'PressTV', domain: 'presstv.ir' },
      { name: 'IRNA', domain: 'irna.ir' },
      { name: 'Tasnim', domain: 'tasnimnews.com' },
    ],
  },
  {
    country: 'Turkey', code: 'TR',
    outlets: [
      { name: 'Daily Sabah', domain: 'dailysabah.com' },
      { name: 'Anadolu Agency', domain: 'aa.com.tr' },
    ],
  },
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseNarrativesJSON(text: string): string[] | null {
  try {
    const parsed = JSON.parse(text.trim());
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch { /* not clean JSON */ }

  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      const parsed = JSON.parse(fenceMatch[1].trim());
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch { /* try next */ }
  }

  const firstBracket = text.indexOf('[');
  const lastBracket = text.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    try {
      const parsed = JSON.parse(text.slice(firstBracket, lastBracket + 1));
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch { /* extraction failed */ }
  }

  return null;
}

export async function fetchPropaganda(): Promise<void> {
  console.log('[PROPAGANDA] Analyzing state media narratives...');

  try {
    const client = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY }) : null;
    const entries: PropagandaEntry[] = [];

    for (const media of STATE_MEDIA) {
      try {
        // Use Google News RSS to get headlines from state media domains
        const siteQueries = media.outlets.map((o) => `site:${o.domain}`).join('+OR+');
        const rssUrl = `https://news.google.com/rss/search?q=when:3d+${siteQueries}&ceid=US:en&hl=en-US&gl=US`;

        const feed = await parser.parseURL(rssUrl);
        const articles = (feed.items ?? []).slice(0, 20);

        if (articles.length === 0) {
          console.warn(`[PROPAGANDA] No articles for ${media.country}`);
          await delay(1000);
          continue;
        }

        const headlines = articles
          .map((a) => stripHTML(a.title ?? ''))
          .filter(Boolean)
          .slice(0, 10)
          .map((h) => h.replace(/[<>{}[\]]/g, '').slice(0, 200));

        // Use Claude AI to extract narratives
        let narratives: string[] = [];

        if (client && headlines.length >= 3) {
          try {
            const message = await client.messages.create({
              model: 'claude-sonnet-4-5-20250929',
              max_tokens: 500,
              system: 'You are an information warfare analyst. Given headlines from state media, identify the top 3-5 propaganda narratives being pushed. Return ONLY a JSON array of short narrative descriptions (strings). No markdown, no explanation.',
              messages: [{
                role: 'user',
                content: `Identify propaganda narratives from these ${media.country} state media headlines:\n\n${headlines.join('\n')}`,
              }],
            });

            const textBlock = message.content.find((b) => b.type === 'text');
            const text = textBlock?.text ?? '[]';
            narratives = parseNarrativesJSON(text) ?? [];
          } catch (aiErr) {
            console.warn(`[PROPAGANDA] AI analysis failed for ${media.country}:`, aiErr instanceof Error ? aiErr.message : aiErr);
          }
        }

        const outletName = media.outlets.map((o) => o.name).join(' / ');
        entries.push({
          id: `prop-${media.code.toLowerCase()}`,
          country: media.country,
          countryCode: media.code,
          outlet: outletName,
          domain: media.outlets[0].domain,
          narratives,
          sampleHeadlines: headlines.slice(0, 5),
          toneAvg: 0, // Google News RSS doesn't provide tone
          articleCount: articles.length,
          analysisDate: new Date().toISOString(),
        });

        console.log(`[PROPAGANDA] ${media.country}: ${articles.length} articles, ${narratives.length} narratives`);
      } catch (err) {
        console.warn(`[PROPAGANDA] ${media.country} failed:`, err instanceof Error ? err.message : err);
      }

      await delay(1000);
    }

    if (entries.length > 0) {
      cache.set('propaganda', entries, TTL.PROPAGANDA);
      console.log(`[PROPAGANDA] ${entries.length} state media entries cached`);
    } else {
      console.warn('[PROPAGANDA] No entries fetched, keeping cache/mock');
    }
  } catch (err) {
    console.error('[PROPAGANDA] Fetch failed:', err);
  }
}
