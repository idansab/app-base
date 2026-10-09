import { describe, it, expect } from 'vitest';
import { compareLabel, compareToPrevious } from './statsFormat';

describe('compareToPrevious', () => {
  it('shows nothing when both periods are empty', () => {
    expect(compareToPrevious(0, 0)).toEqual({ kind: 'none' });
    expect(compareLabel(compareToPrevious(0, 0))).toBe('');
  });

  it('says "new" instead of an infinite percentage when there is no baseline', () => {
    expect(compareToPrevious(5, 0)).toEqual({ kind: 'new' });
    expect(compareLabel(compareToPrevious(5, 0))).toBe('חדש');
  });

  it('computes rounded percentages up and down', () => {
    expect(compareToPrevious(150, 100)).toEqual({ kind: 'up', percent: 50 });
    expect(compareToPrevious(50, 100)).toEqual({ kind: 'down', percent: 50 });
    expect(compareToPrevious(1, 3)).toEqual({ kind: 'down', percent: 67 });
    expect(compareLabel(compareToPrevious(150, 100))).toBe('▲ 50%');
    expect(compareLabel(compareToPrevious(50, 100))).toBe('▼ 50%');
  });

  it('handles a drop to zero and equal values', () => {
    expect(compareToPrevious(0, 10)).toEqual({ kind: 'down', percent: 100 });
    expect(compareToPrevious(4, 4)).toEqual({ kind: 'same', percent: 0 });
  });

  it('tolerates missing or non-numeric input', () => {
    expect(compareToPrevious(undefined, undefined)).toEqual({ kind: 'none' });
    expect(compareToPrevious('7', '7')).toEqual({ kind: 'same', percent: 0 });
  });
});
