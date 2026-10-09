import { describe, it, expect } from 'vitest';
import { countUnseen, getSeenAt, hasApprovedClaim, markSeen } from './ownerOverview';

const memoryStore = () => {
  const data = new Map();
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)) };
};

describe('countUnseen', () => {
  const claims = [
    { status: 'approved', reviewed_at: '2026-10-10T10:00:00Z' },
    { status: 'pending', reviewed_at: null },
  ];
  const requests = [
    { status: 'rejected', reviewed_at: '2026-10-11T10:00:00Z' },
    { status: 'approved', reviewed_at: '2026-10-01T10:00:00Z' },
  ];

  it('counts every decision when the page was never opened', () => {
    expect(countUnseen(claims, requests, null)).toBe(3);
  });

  it('counts only decisions made after the last visit', () => {
    expect(countUnseen(claims, requests, '2026-10-05T00:00:00Z')).toBe(2);
    expect(countUnseen(claims, requests, '2026-10-10T12:00:00Z')).toBe(1);
    expect(countUnseen(claims, requests, '2026-10-12T00:00:00Z')).toBe(0);
  });

  it('never counts pending items', () => {
    expect(countUnseen([{ status: 'pending', reviewed_at: null }], [], null)).toBe(0);
  });

  it('tolerates missing lists', () => {
    expect(countUnseen(undefined, undefined, null)).toBe(0);
  });
});

describe('seen marker', () => {
  it('round-trips through storage', () => {
    const store = memoryStore();
    expect(getSeenAt(store)).toBeNull();
    markSeen(new Date('2026-10-09T12:00:00Z'), store);
    expect(getSeenAt(store)).toBe('2026-10-09T12:00:00.000Z');
  });

  it('survives blocked storage', () => {
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(getSeenAt(broken)).toBeNull();
    expect(() => markSeen(new Date(), broken)).not.toThrow();
  });
});

describe('hasApprovedClaim', () => {
  it('is true only with an approved claim', () => {
    expect(hasApprovedClaim([{ status: 'pending' }, { status: 'rejected' }])).toBe(false);
    expect(hasApprovedClaim([{ status: 'pending' }, { status: 'approved' }])).toBe(true);
    expect(hasApprovedClaim([])).toBe(false);
    expect(hasApprovedClaim(undefined)).toBe(false);
  });
});
