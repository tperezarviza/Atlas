import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_API_KEY, FETCH_TIMEOUT_API, TTL } from '../config.js';
import { cache } from '../cache.js';
import { safeJson } from '../utils.js';
import type { PropagandaEntry } from '../types.js';

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
        const domainQuery = media.outlets.map((o) => o.domain).join(' OR ');
        const query = encodeURIComponent(`domain:(${domainQuery})`);
        const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=artlist&maxrecords=20&format=json&timespan=24h`;

        const res = await fetch(url, {
          signal: AbortSignal.timeout(FETCH_TIMEOUT_API),
          headers: { 'User-Agent': 'ATLAS/1.0' },
        });

        if (!res.ok) {
          console.warn(`[PROPAGANDA] GDELT ${media.country}: ${res.status}`);
          await delay(1500);
          continue;
        }

        const json = await safeJson<Record<string, unknown>>(res);
        const articles: { title?: string; tone?: number; domain?: string }[] = ((json.articles ?? []) as { title?: string; tone?: number; domain?: string }[]).slice(0, 50);

        if (articles.length === 0) {
          await delay(1500);
          continue;
        }

        const headlines = articles
          .map((a) => a.title ?? '')
          .filter(Boolean)
          .slice(0, 10)
          .map((h) => h.replace(/[<>{}[\]]/g, '').slice(0, 200));

        const avgTone = articles.reduce((sum, a) => sum + (a.tone ?? 0), 0) / articles.length;

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
          toneAvg: Math.round(avgTone * 100) / 100,
          articleCount: articles.length,
          analysisDate: new Date().toISOString(),
        });
      } catch (err) {
        console.warn(`[PROPAGANDA] ${media.country} failed:`, err instanceof Error ? err.message : err);
      }

      await delay(1500);
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
