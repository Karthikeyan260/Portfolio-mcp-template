import { describe, expect, it } from 'vitest';
import { paginate } from '../../src/utils/pagination.js';

describe('paginate', () => {
  const items = Array.from({ length: 25 }, (_, i) => i);

  it('returns the first page by default', () => {
    const result = paginate(items);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.items).toHaveLength(20);
    expect(result.totalItems).toBe(25);
    expect(result.totalPages).toBe(2);
  });

  it('returns the requested page', () => {
    const result = paginate(items, { page: 2, pageSize: 20 });
    expect(result.items).toHaveLength(5);
    expect(result.items[0]).toBe(20);
  });

  it('clamps page beyond totalPages to the last page', () => {
    const result = paginate(items, { page: 99, pageSize: 10 });
    expect(result.page).toBe(3);
  });

  it('clamps pageSize to the maximum', () => {
    const result = paginate(items, { pageSize: 1000 });
    expect(result.pageSize).toBe(100);
  });
});
