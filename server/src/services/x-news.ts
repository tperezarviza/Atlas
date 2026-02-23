import { X_BEARER_TOKEN, TTL } from '../config.js';
import { translateTexts } from './translate.js';
import { cache } from '../cache.js';
import type { NewsWireItem, NewsBullet } from '../types.js';

interface XNewsArticle {
  id: string;
  name: string;
  summary: string;
  category?: string;
  updated_at?: string;
  contexts?: { topics?: string[] };
}

interface XNewsResponse {
  data?: XNewsArticle[];
}

const QUERIES = ['geopolitics', 'argentina', 'military', 'economy'];

const QUERY_BULLET: Record<string, NewsBullet> = {
  geopolitics: 'high',
  military: 'high',
  argentina: 'medium',
  economy: 'accent',
};

async function fetchXNewsQuery(query: string): Promise<XNewsArticle[]> {
  const url = `https://api.x.com/2/news/search?query=${encodeURIComponent(query)}&max_results=10&news.fields=name,summary,category,keywords,updated_at`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${X_BEARER_TOKEN}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    console.warn(`[X-NEWS] Query "${query}" failed: ${res.status} ${res.statusText}`);
    return [];
  }
  const data: XNewsResponse = await res.json();
  return data.data ?? [];
}

export async function fetchXNews(): Promise<void> {
  if (!X_BEARER_TOKEN) return;
  console.log('[X-NEWS] Fetching X News API...');

  try {
    const results = await Promise.allSettled(
      QUERIES.map(q => fetchXNewsQuery(q))
    );

    const allArticles: { article: XNewsArticle; query: string }[] = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        for (const a of r.value) {
          allArticles.push({ article: a, query: QUERIES[i] });
        }
        console.log(`[X-NEWS] "${QUERIES[i]}": ${r.value.length} articles`);
      }
    });

    if (allArticles.length === 0) {
      console.warn('[X-NEWS] No articles received');
      return;
    }

    // Deduplicate by article ID
    const seen = new Set<string>();
    const unique = allArticles.filter(({ article }) => {
      if (seen.has(article.id)) return false;
      seen.add(article.id);
      return true;
    });

    // Convert to NewsWireItem
    const wireItems: NewsWireItem[] = unique.map(({ article, query }, i) => {
      const elapsed = article.updated_at
        ? Math.floor((Date.now() - new Date(article.updated_at).getTime()) / 60_000)
        : 0;
      const time = elapsed < 1 ? 'now' : elapsed < 60 ? `${elapsed}m` : `${Math.floor(elapsed / 60)}h`;

      return {
        id: `xnews-${i}`,
        bullet: QUERY_BULLET[query] ?? 'medium',
        source: 'X News',
        time,
        headline: article.name,
        tone: 0,
        url: undefined,
      };
    });

    // Translate non-English headlines
    const headlines = wireItems.map(w => w.headline);
    const translated = await translateTexts(headlines, 'X-NEWS');
    for (let i = 0; i < wireItems.length; i++) {
      wireItems[i].headline = translated[i];
    }

    cache.set('x_news', wireItems, TTL.NEWS);
    console.log(`[X-NEWS] ${wireItems.length} articles cached`);
  } catch (err) {
    console.error('[X-NEWS] Fetch failed:', err);
  }
}
