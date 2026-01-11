import { describe, it, expect } from 'vitest';

import { getButtonPosition, isValidSelection } from './index';

describe('isValidSelection', () => {
  it('accepts selections between 1 and 50 characters', () => {
    expect(isValidSelection('a')).toBe(true);
    expect(isValidSelection('a'.repeat(50))).toBe(true);
  });

  it('rejects empty or whitespace-only selections', () => {
    expect(isValidSelection('')).toBe(false);
    expect(isValidSelection('   ')).toBe(false);
  });

  it('rejects selections longer than 50 characters', () => {
    expect(isValidSelection('a'.repeat(51))).toBe(false);
  });
});

describe('getButtonPosition', () => {
  it('returns top-right position with 8px offset', () => {
    const rect = { right: 100, top: 20 } as DOMRect;
    const range = { getBoundingClientRect: () => rect } as unknown as Range;

    expect(getButtonPosition(range)).toEqual({ x: 108, y: 12 });
  });
});
