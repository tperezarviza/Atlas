import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_API_KEY } from '../config.js';

// Singleton Anthropic client — prevent CLOSE_WAIT socket leak
const anthropicClient = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY, timeout: 30000 }) : null;

/** Detect non-English Latin-script languages by common words + diacritical characters. */
const NON_ENGLISH_INDICATORS = /\b(dell[aeo]|nell[aeo]|sull[aeo]|l'ambasciatore|governo|contro|anche|perch[eé]|après|aujourd'?hui|qu[ei]|dans|avec|pour|cette|serait|había|donde|tiene|sobre|está|también|según|pero|entre|todos|desde|como|más|años|governo|primo|ministro|presidente|durante|ancora|stato|essere|questa|quello|hanno|sono|tutto|sempre|giorno|molto|fatto|ogni|nuovo|altra|paese|mondo|dopo|prima|grande|perché|ancora|così|però|già|bene|mentre|senza|altra|trova|parte|bir|ile|için|olan|değil|oldu|üzerinde|karşı|sonra|kadar|olarak|ancak|gibi|daha|çok|büyük|savaş|ülke|przez|który|został|między|tylko|jednak|przed|teraz|także|bardzo|będzie|polski|wojsk|został|nach|über|gegen|nicht|haben|einen|diese|werden|bereits|unter|durch|seinem|keine|seine|seine|según|desde|hasta|porque|además|aunque|también|después|antes|todavía|mientras|donde|haber|dette|eller|være|efter|under|havde|flere|denne|mange|andre|disse|zoals|heeft|worden|onder|sinds|opnieuw|omdat|volgens|terwijl)\b/i;

/** Detect non-English by presence of accented/special Latin chars uncommon in English. */
const NON_ASCII_LATIN = /[àáéèëùúòóìíöüçşğıłśźżñãõâêîôûäëïæøåðþœ]/i;

/** Check if text is primarily Latin-script (English/European). */
export function isLatinText(text: string): boolean {
  const letters = text.replace(/[\s\d\p{P}\p{S}]/gu, '');
  if (letters.length === 0) return true;
  const latinChars = letters.replace(/[^\u0000-\u024F\u1E00-\u1EFF]/g, '');
  const isLatin = latinChars.length / letters.length > 0.7;
  // If text is Latin-script but contains non-English indicators, mark as non-Latin so it gets translated
  if (isLatin && (NON_ENGLISH_INDICATORS.test(text) || NON_ASCII_LATIN.test(text))) return false;
  return isLatin;
}

/** Translate a single batch of up to 50 texts via Claude Haiku. */
async function translateBatchRaw(
  client: Anthropic,
  texts: string[],
): Promise<Map<number, string>> {
  const numbered = texts.map((t, i) => `${i + 1}. ${t}`).join('\n');

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    system:
      'You are a headline translator. Translate each numbered headline to English. Keep it concise (news headline style). Output ONLY the numbered translations, one per line, matching the input numbering. Do not add commentary.',
    messages: [
      { role: 'user', content: `Translate these headlines to English:\n\n${numbered}` },
    ],
  });

  const responseText =
    message.content[0]?.type === 'text' ? message.content[0].text : '';
  const lines = responseText.split('\n').filter((l) => l.trim());
  const results = new Map<number, string>();

  for (const line of lines) {
    const m = line.match(/^(\d+)[.)]\s*(.+)/);
    if (m) {
      const idx = parseInt(m[1], 10) - 1;
      const translated = m[2].trim();
      if (idx >= 0 && idx < texts.length && translated) {
        results.set(idx, translated);
      }
    }
  }
  return results;
}

/**
 * Translate non-Latin texts to English using Claude Haiku.
 * Returns a new array with translations applied in-place;
 * Latin/English texts pass through unchanged.
 */
export async function translateTexts(
  texts: string[],
  label = 'TRANSLATE',
): Promise<string[]> {
  if (!anthropicClient || texts.length === 0) return texts;

  const toTranslate: { idx: number; text: string }[] = [];
  for (let i = 0; i < texts.length; i++) {
    if (texts[i] && !isLatinText(texts[i])) {
      toTranslate.push({ idx: i, text: texts[i] });
    }
  }

  if (toTranslate.length === 0) return texts;

  console.log(
    `[${label}] Translating ${toTranslate.length} non-English texts...`,
  );

  try {
    const client = anthropicClient!;
    const result = [...texts];
    let totalTranslated = 0;

    for (let start = 0; start < toTranslate.length; start += 50) {
      const batch = toTranslate.slice(start, start + 50);
      const translations = await translateBatchRaw(
        client,
        batch.map((b) => b.text),
      );

      for (const [batchIdx, translated] of translations) {
        result[batch[batchIdx].idx] = translated;
        totalTranslated++;
      }
    }

    console.log(
      `[${label}] Translated ${totalTranslated}/${toTranslate.length} texts`,
    );
    return result;
  } catch (err) {
    console.warn(`[${label}] Translation failed, keeping originals:`, err);
    return texts;
  }
}
