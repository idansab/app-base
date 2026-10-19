import { describe, it, expect, vi } from 'vitest';
import { PAGE_SIZE, fetchAllRows } from './fetchAllRows';

// A stand-in for a Supabase query builder over `total` rows that caps every response at `cap` rows.
function fakeTable(total, cap = PAGE_SIZE) {
  const rows = Array.from({ length: total }, (_, i) => ({ id: i }));
  const ranges = [];
  const makeQuery = vi.fn(() => ({
    range: async (from, to) => {
      ranges.push([from, to]);
      return { data: rows.slice(from, Math.min(to + 1, from + cap)), error: null };
    },
  }));
  return { makeQuery, ranges };
}

describe('fetchAllRows', () => {
  it('loads every row past the 1000-row cap', async () => {
    const { makeQuery, ranges } = fakeTable(1669);
    const all = await fetchAllRows(makeQuery);
    expect(all).toHaveLength(1669);
    expect(all.map((r) => r.id)).toEqual(Array.from({ length: 1669 }, (_, i) => i));
    expect(ranges).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  it('builds a fresh query for every page', async () => {
    const { makeQuery } = fakeTable(2500);
    await fetchAllRows(makeQuery);
    expect(makeQuery).toHaveBeenCalledTimes(3);
  });

  it('asks for one more page when the total is an exact multiple of the page size', async () => {
    const { makeQuery, ranges } = fakeTable(2000);
    const all = await fetchAllRows(makeQuery);
    expect(all).toHaveLength(2000);
    expect(ranges).toHaveLength(3);
  });

  it('stops after one request for a small table', async () => {
    const { makeQuery, ranges } = fakeTable(5);
    expect(await fetchAllRows(makeQuery)).toHaveLength(5);
    expect(ranges).toEqual([[0, 999]]);
  });

  it('handles an empty result and null data', async () => {
    const makeQuery = () => ({ range: async () => ({ data: null, error: null }) });
    expect(await fetchAllRows(makeQuery)).toEqual([]);
  });

  it('respects a custom page size', async () => {
    const { makeQuery, ranges } = fakeTable(25);
    expect(await fetchAllRows(makeQuery, 10)).toHaveLength(25);
    expect(ranges).toEqual([
      [0, 9],
      [10, 19],
      [20, 29],
    ]);
  });

  it('throws the Supabase error', async () => {
    const error = { message: 'boom' };
    const makeQuery = () => ({ range: async () => ({ data: null, error }) });
    await expect(fetchAllRows(makeQuery)).rejects.toBe(error);
  });
});
