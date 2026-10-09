import { describe, it, expect } from 'vitest';
import { getSessionId, shouldSend } from './trackPlace';

const fakeStore = () => {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
  };
};

describe('shouldSend', () => {
  it('sends the first time and remembers it', () => {
    const store = fakeStore();
    expect(shouldSend(store, 'k', 1_000_000)).toBe(true);
    expect(store.getItem('k')).toBe('1000000');
  });

  it('suppresses repeats inside the 30 minute window', () => {
    const store = fakeStore();
    shouldSend(store, 'k', 1_000_000);
    expect(shouldSend(store, 'k', 1_000_000 + 29 * 60 * 1000)).toBe(false);
  });

  it('sends again once the window has passed', () => {
    const store = fakeStore();
    shouldSend(store, 'k', 1_000_000);
    expect(shouldSend(store, 'k', 1_000_000 + 30 * 60 * 1000)).toBe(true);
  });

  it('keeps different places and events apart', () => {
    const store = fakeStore();
    expect(shouldSend(store, 'pt:1:view', 5)).toBe(true);
    expect(shouldSend(store, 'pt:2:view', 5)).toBe(true);
    expect(shouldSend(store, 'pt:1:call', 5)).toBe(true);
  });

  it('ignores corrupt stored values', () => {
    const store = fakeStore();
    store.setItem('k', 'not-a-number');
    expect(shouldSend(store, 'k', 10)).toBe(true);
  });
});

describe('getSessionId', () => {
  it('creates an id once and reuses it', () => {
    const store = fakeStore();
    let n = 0;
    const make = () => `id-${++n}-xxxxxxxx`;
    const first = getSessionId(store, make);
    expect(getSessionId(store, make)).toBe(first);
    expect(n).toBe(1);
  });

  it('produces ids the database accepts (8-64 chars)', () => {
    const id = getSessionId(fakeStore());
    expect(id.length).toBeGreaterThanOrEqual(8);
    expect(id.length).toBeLessThanOrEqual(64);
  });
});
