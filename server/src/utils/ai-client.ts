import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_API_KEY } from '../config.js';

const GROQ_API_KEY = process.env.GROQ_API_KEY ?? '';

export type AIProvider = 'claude-sonnet' | 'claude-haiku' | 'groq-llama' | 'static-fallback';

interface AIResponse {
  text: string;
  provider: AIProvider;
  latencyMs: number;
}

interface AIOptions {
  maxTokens?: number;
  temperature?: number;
  preferHaiku?: boolean;
  timeout?: number;
}

// ── Provider usage stats ──

const providerStats: Record<string, number> = {};

export function getProviderStats(): Record<string, number> {
  return { ...providerStats };
}

function trackProvider(provider: AIProvider): void {
  providerStats[provider] = (providerStats[provider] ?? 0) + 1;
}

// ── Main function ──

export async function aiComplete(
  systemPrompt: string,
  userMessage: string,
  options: AIOptions = {},
): Promise<AIResponse> {
  const start = Date.now();
  const maxTokens = options.maxTokens ?? 1000;
  const timeout = options.timeout ?? 30_000;

  // ── Tier 1: Claude ──
  if (ANTHROPIC_API_KEY) {
    try {
      const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
      const model = options.preferHaiku
        ? 'claude-haiku-4-5-20251001'
        : 'claude-sonnet-4-5-20250929';

      const msg = await client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature: options.temperature ?? 0.3,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });

      const text = msg.content.find(b => b.type === 'text')?.text ?? '';
      const provider: AIProvider = options.preferHaiku ? 'claude-haiku' : 'claude-sonnet';
      trackProvider(provider);
      return { text, provider, latencyMs: Date.now() - start };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[AI] Claude failed (${errMsg}), trying Groq fallback...`);
    }
  }

  // ── Tier 2: Groq (free Llama 3.1 8B) ──
  if (GROQ_API_KEY) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          max_tokens: maxTokens,
          temperature: options.temperature ?? 0.3,
        }),
        signal: AbortSignal.timeout(timeout),
      });

      if (res.ok) {
        const data = await res.json() as any;
        const text = data.choices?.[0]?.message?.content ?? '';
        trackProvider('groq-llama');
        return { text, provider: 'groq-llama', latencyMs: Date.now() - start };
      }
      console.warn(`[AI] Groq returned ${res.status}`);
    } catch (err) {
      console.warn('[AI] Groq failed:', err instanceof Error ? err.message : err);
    }
  }

  // ── Tier 3: Static fallback ──
  console.warn('[AI] All providers failed, returning static fallback');
  trackProvider('static-fallback');
  return {
    text: JSON.stringify({ error: 'AI analysis temporarily unavailable', providers_tried: ['claude', 'groq'] }),
    provider: 'static-fallback',
    latencyMs: Date.now() - start,
  };
}
