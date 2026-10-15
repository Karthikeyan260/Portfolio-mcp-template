import type { Env } from '../types/env.js';
import { hasGeminiKey } from '../utils/config.js';
import { AiUnavailableError, PortfolioError } from '../utils/errors.js';
import { logger, serializeError } from '../utils/logger.js';
import { scrubSecrets } from '../utils/sanitize.js';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const CHAT_MODEL = 'gemini-2.5-flash';
const EMBEDDING_MODEL = 'gemini-embedding-001';

function requireKey(env: Env, feature: string): string {
  if (!hasGeminiKey(env)) throw new AiUnavailableError(feature);
  return env.GEMINI_API_KEY as string;
}

/** Sends a single-turn prompt to Gemini and returns the generated text. */
export async function generateText(env: Env, feature: string, prompt: string): Promise<string> {
  const apiKey = requireKey(env, feature);
  const url = `${GEMINI_API_BASE}/models/${CHAT_MODEL}:generateContent?key=${apiKey}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
      }),
    });
  } catch (error) {
    logger.error('gemini.network_error', { feature, error: serializeError(error) });
    throw new PortfolioError(
      'Could not reach the Gemini API. Please try again shortly.',
      'AI_NETWORK_ERROR',
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    logger.error('gemini.api_error', {
      feature,
      status: response.status,
      body: scrubSecrets(body).slice(0, 500),
    });
    throw new PortfolioError(
      `Gemini API request failed (status ${response.status}).`,
      'AI_API_ERROR',
    );
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  if (!text) {
    throw new PortfolioError('Gemini returned an empty response.', 'AI_EMPTY_RESPONSE');
  }
  return scrubSecrets(text);
}

/**
 * Sends a prompt instructing Gemini to reply with JSON only, and parses the result.
 * Falls back to `{ raw: text }` if parsing fails, so callers never crash on malformed output.
 */
export async function generateJson<T = unknown>(
  env: Env,
  feature: string,
  prompt: string,
): Promise<T | { raw: string }> {
  const text = await generateText(
    env,
    feature,
    `${prompt}\n\nRespond with ONLY valid JSON — no markdown fences, no commentary.`,
  );
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/, '')
    .replace(/```$/, '');
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    logger.warn('gemini.json_parse_failed', { feature });
    return { raw: text };
  }
}

/** Computes an embedding vector for the given text, or null if Gemini is unavailable. */
export async function embedText(env: Env, text: string): Promise<number[] | null> {
  if (!hasGeminiKey(env)) return null;
  const apiKey = env.GEMINI_API_KEY as string;
  const url = `${GEMINI_API_BASE}/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: { parts: [{ text }] } }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { embedding?: { values?: number[] } };
    return data.embedding?.values ?? null;
  } catch (error) {
    logger.warn('gemini.embedding_failed', { error: serializeError(error) });
    return null;
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < length; i++) {
    dot += a[i]! * b[i]!;
    magA += a[i]! * a[i]!;
    magB += b[i]! * b[i]!;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
