import { describe, it, expect } from 'vitest';

import { getButtonPositionFromRange, isValidSelection } from './index';

describe('isValidSelection', () => {
  it('accepts selections between 1 and 2000 characters', () => {
    expect(isValidSelection('a')).toBe(true);
    expect(isValidSelection('a'.repeat(2000))).toBe(true);
  });

  it('rejects empty or whitespace-only selections', () => {
    expect(isValidSelection('')).toBe(false);
    expect(isValidSelection('   ')).toBe(false);
  });

  it('rejects selections longer than 2000 characters', () => {
    expect(isValidSelection('a'.repeat(2001))).toBe(false);
  });
});

describe('getButtonPositionFromRange', () => {
  it('returns position based on last rect of range with 8px offset', () => {
    const rect = { right: 100, top: 20 } as DOMRect;
    const range = {
      getClientRects: () => [rect],
      getBoundingClientRect: () => rect,
    } as unknown as Range;

    expect(getButtonPositionFromRange(range)).toEqual({ x: 108, y: 12 });
  });

  it('falls back to bounding rect when no client rects available', () => {
    const rect = { right: 100, top: 20 } as DOMRect;
    const range = {
      getClientRects: () => [],
      getBoundingClientRect: () => rect,
    } as unknown as Range;

    expect(getButtonPositionFromRange(range)).toEqual({ x: 108, y: 12 });
  });
});
