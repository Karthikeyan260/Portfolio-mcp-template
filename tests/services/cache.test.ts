import { describe, expect, it, vi } from 'vitest';
import { TtlCache } from '../../src/services/cache.js';

describe('TtlCache', () => {
  it('returns undefined for a missing key', () => {
    const cache = new TtlCache<string>(1000);
    expect(cache.get('missing')).toBeUndefined();
  });

  it('returns a stored value before expiry', () => {
    const cache = new TtlCache<string>(10_000);
    cache.set('key', 'value');
    expect(cache.get('key')).toBe('value');
  });

  it('expires a value after its TTL elapses', () => {
    vi.useFakeTimers();
    const cache = new TtlCache<string>(1000);
    cache.set('key', 'value');
    vi.advanceTimersByTime(1001);
    expect(cache.get('key')).toBeUndefined();
    vi.useRealTimers();
  });

  it('getOrCompute only computes once for a cached key', async () => {
    const cache = new TtlCache<number>(10_000);
    const compute = vi.fn().mockResolvedValue(42);
    const first = await cache.getOrCompute('key', compute);
    const second = await cache.getOrCompute('key', compute);
    expect(first).toBe(42);
    expect(second).toBe(42);
    expect(compute).toHaveBeenCalledTimes(1);
  });
});
