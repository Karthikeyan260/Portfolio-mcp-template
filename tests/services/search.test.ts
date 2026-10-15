import { describe, expect, it } from 'vitest';
import { keywordScore, search } from '../../src/services/search.js';
import type { Env } from '../../src/types/env.js';

const NO_KEY_ENV: Env = {};

describe('keywordScore', () => {
  it('scores an exact substring match highly', () => {
    const score = keywordScore(
      'gemini vision',
      'NutrifyAI uses Gemini Vision multimodal inference.',
    );
    expect(score).toBeGreaterThan(0);
  });

  it('returns 0 for completely unrelated text', () => {
    const score = keywordScore('quantum blockchain', 'React Redux todo application.');
    expect(score).toBe(0);
  });

  it('returns 0 for an empty query', () => {
    expect(keywordScore('', 'anything')).toBe(0);
  });
});

describe('search (keyword fallback, no GEMINI_API_KEY)', () => {
  const items = [
    { id: 'a', text: 'Chess game with minimax AI engine' },
    { id: 'b', text: 'Weather dashboard with 5-day forecast' },
    { id: 'c', text: 'Snake game on HTML5 canvas' },
  ];

  it('ranks matching items above non-matching ones', async () => {
    const results = await search(NO_KEY_ENV, 'game', items, (i) => i.text);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.item.text.toLowerCase().includes('game'))).toBe(true);
  });

  it('excludes zero-score items', async () => {
    const results = await search(NO_KEY_ENV, 'blockchain', items, (i) => i.text);
    expect(results).toHaveLength(0);
  });
});
