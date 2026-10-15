import type { Env } from '../types/env.js';
import { hasGeminiKey } from '../utils/config.js';
import { cosineSimilarity, embedText } from './gemini.js';
import { TtlCache } from './cache.js';

const EMBEDDING_TTL_MS = 24 * 60 * 60 * 1000;
const embeddingCache = new TtlCache<number[] | null>(EMBEDDING_TTL_MS);

const STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'of',
  'to',
  'in',
  'on',
  'for',
  'with',
  'is',
  'are',
  'i',
  'me',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+.#]+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

/** Deterministic keyword/fuzzy score — always available, no external calls. */
export function keywordScore(query: string, text: string): number {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return 0;
  const textLower = text.toLowerCase();
  const textTokens = new Set(tokenize(text));

  let score = 0;
  for (const token of queryTokens) {
    if (textTokens.has(token)) score += 2;
    else if (textLower.includes(token)) score += 1;
  }
  if (textLower.includes(query.toLowerCase())) score += 3;
  return score / queryTokens.length;
}

export interface SearchResult<T> {
  item: T;
  score: number;
}

/**
 * Ranks items against a query. Always applies keyword scoring; when GEMINI_API_KEY is
 * configured, blends in embedding cosine-similarity for a semantic boost. Per the spec,
 * keyword search is the guaranteed fallback and embeddings are additive, not required.
 */
export async function search<T>(
  env: Env,
  query: string,
  items: T[],
  getText: (item: T) => string,
): Promise<SearchResult<T>[]> {
  const keywordResults = items.map((item) => ({ item, score: keywordScore(query, getText(item)) }));

  if (!hasGeminiKey(env)) {
    return keywordResults.filter((r) => r.score > 0).sort((a, b) => b.score - a.score);
  }

  const queryEmbedding = await embeddingCache.getOrCompute(`query::${query}`, () =>
    embedText(env, query),
  );
  if (!queryEmbedding) {
    return keywordResults.filter((r) => r.score > 0).sort((a, b) => b.score - a.score);
  }

  const blended = await Promise.all(
    keywordResults.map(async ({ item, score }) => {
      const text = getText(item);
      const itemEmbedding = await embeddingCache.getOrCompute(`item::${text}`, () =>
        embedText(env, text),
      );
      const semanticScore = itemEmbedding ? cosineSimilarity(queryEmbedding, itemEmbedding) * 5 : 0;
      return { item, score: score + semanticScore };
    }),
  );

  return blended.filter((r) => r.score > 0).sort((a, b) => b.score - a.score);
}
