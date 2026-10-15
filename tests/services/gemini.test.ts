import { afterEach, describe, expect, it, vi } from 'vitest';
import { embedText, generateJson, generateText } from '../../src/services/gemini.js';
import { AiUnavailableError } from '../../src/utils/errors.js';
import type { Env } from '../../src/types/env.js';

const NO_KEY_ENV: Env = {};
const WITH_KEY_ENV: Env = { GEMINI_API_KEY: 'test-key' };

afterEach(() => {
  vi.restoreAllMocks();
});

describe('generateText', () => {
  it('throws AiUnavailableError when GEMINI_API_KEY is not set', async () => {
    await expect(generateText(NO_KEY_ENV, 'test_feature', 'hello')).rejects.toBeInstanceOf(
      AiUnavailableError,
    );
  });

  it('returns the model text on a successful response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: 'Hello from Gemini' }] } }],
          }),
          { status: 200 },
        ),
      ),
    );

    const text = await generateText(WITH_KEY_ENV, 'test_feature', 'hello');
    expect(text).toBe('Hello from Gemini');
  });

  it('throws when the API responds with a non-OK status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('error', { status: 500 })));
    await expect(generateText(WITH_KEY_ENV, 'test_feature', 'hello')).rejects.toThrow();
  });
});

describe('generateJson', () => {
  it('parses valid JSON returned by the model', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: '{"fitScore": 80}' }] } }],
          }),
          { status: 200 },
        ),
      ),
    );
    const result = await generateJson<{ fitScore: number }>(WITH_KEY_ENV, 'test_feature', 'prompt');
    expect(result).toEqual({ fitScore: 80 });
  });

  it('falls back to { raw } when the model does not return valid JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ candidates: [{ content: { parts: [{ text: 'not json at all' }] } }] }),
            { status: 200 },
          ),
        ),
    );
    const result = await generateJson(WITH_KEY_ENV, 'test_feature', 'prompt');
    expect(result).toEqual({ raw: 'not json at all' });
  });
});

describe('embedText', () => {
  it('returns null when GEMINI_API_KEY is not set', async () => {
    expect(await embedText(NO_KEY_ENV, 'text')).toBeNull();
  });

  it('returns null on a failed request instead of throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    expect(await embedText(WITH_KEY_ENV, 'text')).toBeNull();
  });
});
