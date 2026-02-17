import RSSParser from 'rss-parser';
import { FETCH_TIMEOUT_RSS, TTL } from '../config.js';
import { cache } from '../cache.js';
import { stripHTML } from '../utils.js';
import { translateTexts } from './translate.js';
import { aiComplete } from '../utils/ai-client.js';
import { isBigQueryAvailable, bqQuery } from './bigquery.js';
import { trackQueryBytes } from './bq-cost-tracker.js';
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
  {
    country: 'Palestine', code: 'PS',
    outlets: [
      { name: 'WAFA', domain: 'english.wafa.ps' },
      { name: 'Palestine Chronicle', domain: 'palestinechronicle.com' },
      { name: 'Quds News', domain: 'qudsnen.co' },
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

// Fetch headlines from BigQuery GKG by state media domain
async function fetchHeadlinesBQ(media: typeof STATE_MEDIA[number]): Promise<{ headlines: string[]; articleCount: number; avgTone: number } | null> {
  if (!isBigQueryAvailable()) return null;

  try {
    const domainPattern = media.outlets.map(o => o.domain.replace(/\./g, '\\\\.')).join('|');

    const rows = await bqQuery<{ url: string; tone: number }>(`
      SELECT
        DocumentIdentifier as url,
        SAFE_CAST(SPLIT(V2Tone, ',')[SAFE_OFFSET(0)] AS FLOAT64) as tone
      FROM \`gdelt-bq.gdeltv2.gkg_partitioned\`
      WHERE DATE(_PARTITIONTIME) >= DATE_SUB(CURRENT_DATE(), INTERVAL 2 DAY)
        AND REGEXP_CONTAINS(DocumentIdentifier, r'${domainPattern}')
      ORDER BY DATE(_PARTITIONTIME) DESC
      LIMIT 30
    `);

    // Estimate ~500MB per query
    trackQueryBytes(500_000_000);

    if (rows.length === 0) return null;

    // Extract headline-like text from URLs (last path segment, cleaned)
    const headlines = rows
      .map(r => {
        const path = new URL(r.url).pathname;
        const slug = path.split('/').pop() ?? '';
        return slug.replace(/[-_]/g, ' ').replace(/\.\w+$/, '').trim();
      })
      .filter(h => h.length > 10)
      .slice(0, 15);

    const avgTone = rows.reduce((sum, r) => sum + (r.tone ?? 0), 0) / rows.length;

    console.log(`[PROPAGANDA-BQ] ${media.country}: ${rows.length} GKG articles, ${headlines.length} usable headlines`);
    return { headlines, articleCount: rows.length, avgTone: Math.round(avgTone * 100) / 100 };
  } catch (err) {
    console.warn(`[PROPAGANDA-BQ] ${media.country} failed:`, err instanceof Error ? err.message : err);
    return null;
  }
}

export async function fetchPropaganda(): Promise<void> {
  console.log('[PROPAGANDA] Analyzing state media narratives...');

  try {
    const entries: PropagandaEntry[] = [];

    for (const media of STATE_MEDIA) {
      try {
        let headlines: string[] = [];
        let articleCount = 0;
        let avgTone = 0;

        // Try BigQuery GKG first for more precise domain matching
        const bqResult = await fetchHeadlinesBQ(media);

        if (bqResult && bqResult.headlines.length >= 3) {
          headlines = bqResult.headlines;
          articleCount = bqResult.articleCount;
          avgTone = bqResult.avgTone;
        } else {
          // Fallback: Google News RSS
          const siteQueries = media.outlets.map((o) => `site:${o.domain}`).join('+OR+');
          const rssUrl = `https://news.google.com/rss/search?q=when:3d+${siteQueries}&ceid=US:en&hl=en-US&gl=US`;

          const feed = await parser.parseURL(rssUrl);
          const articles = (feed.items ?? []).slice(0, 20);

          if (articles.length === 0) {
            console.warn(`[PROPAGANDA] No articles for ${media.country}`);
            await delay(1000);
            continue;
          }

          headlines = articles
            .map((a) => stripHTML(a.title ?? ''))
            .filter(Boolean)
            .slice(0, 10)
            .map((h) => h.replace(/[<>{}[\]]/g, '').slice(0, 200));

          articleCount = articles.length;
        }

        // Translate non-English headlines before AI analysis
        headlines = await translateTexts(headlines, `PROPAGANDA:${media.country}`);

        // Use AI to extract current narratives (Haiku — mechanical extraction)
        let narratives: string[] = [];

        if (headlines.length >= 3) {
          try {
            const response = await aiComplete(
              'You are an information warfare analyst. Given headlines from state media, extract the 3-5 main narratives being pushed. Return ONLY a JSON array of short narrative descriptions (strings). No markdown, no explanation.',
              `Extract propaganda narratives from these ${media.country} state media headlines:\n\n${headlines.join('\n')}`,
              { preferHaiku: true, maxTokens: 500 },
            );
            narratives = parseNarrativesJSON(response.text) ?? [];
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
          toneAvg: avgTone,
          articleCount,
          analysisDate: new Date().toISOString(),
        });

        console.log(`[PROPAGANDA] ${media.country}: ${articleCount} articles, ${narratives.length} narratives`);
      } catch (err) {
        console.warn(`[PROPAGANDA] ${media.country} failed:`, err instanceof Error ? err.message : err);
      }

      await delay(1000);
    }

    if (entries.length > 0) {
      await cache.setWithRedis('propaganda', entries, TTL.PROPAGANDA, 48 * 3600);
      console.log(`[PROPAGANDA] ${entries.length} state media entries cached`);
    } else {
      console.warn('[PROPAGANDA] No entries fetched, keeping cache/mock');
    }
  } catch (err) {
    console.error('[PROPAGANDA] Fetch failed:', err);
  }
}
