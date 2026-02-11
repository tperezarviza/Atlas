import * as cheerio from 'cheerio';

/** Safely extract plain text from HTML using cheerio's parser */
export function stripHTML(html: string): string {
  if (!html) return '';
  return cheerio.load(html).text().trim();
}
