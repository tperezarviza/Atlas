import * as cheerio from 'cheerio';

/** Safely extract plain text from HTML using cheerio's parser */
export function stripHTML(html: string): string {
  if (!html) return '';
  return cheerio.load(html).text().trim();
}

/** Parse response body as JSON with a timeout to prevent slow-drip attacks */
export async function safeJson<T>(res: Response, timeoutMs = 15_000): Promise<T> {
  const text = await Promise.race([
    res.text(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Response body read timeout')), timeoutMs)
    ),
  ]);
  return JSON.parse(text) as T;
}
