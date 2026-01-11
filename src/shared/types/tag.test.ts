/**
 * LingoRecall AI - Tag Types Tests
 * Story 4.4 - Task 1: Tag 数据模型测试
 *
 * @module shared/types/tag.test
 */

import { describe, it, expect } from 'vitest';
import {
  isValidHexColor,
  isValidTagName,
  normalizeTagName,
  isValidTag,
  getColorWithOpacity,
  PRESET_COLORS,
  DEFAULT_TAG_COLOR,
  MAX_TAG_NAME_LENGTH,
  type Tag,
} from './tag';

// ============================================================
// isValidHexColor Tests
// ============================================================

describe('isValidHexColor', () => {
  it('accepts valid 6-digit HEX colors', () => {
    expect(isValidHexColor('#3B82F6')).toBe(true);
    expect(isValidHexColor('#000000')).toBe(true);
    expect(isValidHexColor('#FFFFFF')).toBe(true);
    expect(isValidHexColor('#ffffff')).toBe(true);
    expect(isValidHexColor('#AbCdEf')).toBe(true);
  });

  it('accepts valid 3-digit HEX colors', () => {
    expect(isValidHexColor('#fff')).toBe(true);
    expect(isValidHexColor('#000')).toBe(true);
    expect(isValidHexColor('#F00')).toBe(true);
    expect(isValidHexColor('#abc')).toBe(true);
  });

  it('rejects invalid HEX colors', () => {
    expect(isValidHexColor('')).toBe(false);
    expect(isValidHexColor('red')).toBe(false);
    expect(isValidHexColor('rgb(0,0,0)')).toBe(false);
    expect(isValidHexColor('#GGGGGG')).toBe(false);
    expect(isValidHexColor('#12345')).toBe(false);
    expect(isValidHexColor('#1234567')).toBe(false);
    expect(isValidHexColor('3B82F6')).toBe(false); // Missing #
    expect(isValidHexColor('#')).toBe(false);
  });

  it('rejects non-string inputs', () => {
    expect(isValidHexColor(null as unknown as string)).toBe(false);
    expect(isValidHexColor(undefined as unknown as string)).toBe(false);
    expect(isValidHexColor(123 as unknown as string)).toBe(false);
  });
});

// ============================================================
// isValidTagName Tests
// ============================================================

describe('isValidTagName', () => {
  it('accepts valid tag names', () => {
    expect(isValidTagName('学术')).toBe(true);
    expect(isValidTagName('Work')).toBe(true);
    expect(isValidTagName('日常用语')).toBe(true);
    expect(isValidTagName('a')).toBe(true);
    expect(isValidTagName('a'.repeat(20))).toBe(true);
  });

  it('rejects empty or whitespace-only names', () => {
    expect(isValidTagName('')).toBe(false);
    expect(isValidTagName('   ')).toBe(false);
    expect(isValidTagName('\t\n')).toBe(false);
  });

  it('rejects names exceeding max length', () => {
    expect(isValidTagName('a'.repeat(21))).toBe(false);
    expect(isValidTagName('a'.repeat(100))).toBe(false);
  });

  it('rejects non-string inputs', () => {
    expect(isValidTagName(null as unknown as string)).toBe(false);
    expect(isValidTagName(undefined as unknown as string)).toBe(false);
    expect(isValidTagName(123 as unknown as string)).toBe(false);
  });

  it('handles names with whitespace correctly', () => {
    expect(isValidTagName('  hello  ')).toBe(true); // Trimmed to 'hello'
    expect(isValidTagName('hello world')).toBe(true);
  });
});

// ============================================================
// normalizeTagName Tests
// ============================================================

describe('normalizeTagName', () => {
  it('trims whitespace', () => {
    expect(normalizeTagName('  hello  ')).toBe('hello');
    expect(normalizeTagName('\thello\n')).toBe('hello');
  });

  it('preserves internal whitespace', () => {
    expect(normalizeTagName('hello world')).toBe('hello world');
  });

  it('handles empty input', () => {
    expect(normalizeTagName('')).toBe('');
    expect(normalizeTagName(null as unknown as string)).toBe('');
    expect(normalizeTagName(undefined as unknown as string)).toBe('');
  });
});

// ============================================================
// isValidTag Tests
// ============================================================

describe('isValidTag', () => {
  const validTag: Tag = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: '学术',
    color: '#3B82F6',
    createdAt: Date.now(),
  };

  it('accepts valid tag objects', () => {
    expect(isValidTag(validTag)).toBe(true);
  });

  it('rejects objects with missing fields', () => {
    expect(isValidTag({ ...validTag, id: undefined })).toBe(false);
    expect(isValidTag({ ...validTag, name: undefined })).toBe(false);
    expect(isValidTag({ ...validTag, color: undefined })).toBe(false);
    expect(isValidTag({ ...validTag, createdAt: undefined })).toBe(false);
  });

  it('rejects objects with invalid fields', () => {
    expect(isValidTag({ ...validTag, id: '' })).toBe(false);
    expect(isValidTag({ ...validTag, name: '' })).toBe(false);
    expect(isValidTag({ ...validTag, color: 'red' })).toBe(false);
    expect(isValidTag({ ...validTag, createdAt: -1 })).toBe(false);
    expect(isValidTag({ ...validTag, createdAt: 0 })).toBe(false);
  });

  it('rejects non-objects', () => {
    expect(isValidTag(null)).toBe(false);
    expect(isValidTag(undefined)).toBe(false);
    expect(isValidTag('string')).toBe(false);
    expect(isValidTag(123)).toBe(false);
    expect(isValidTag([])).toBe(false);
  });
});

// ============================================================
// getColorWithOpacity Tests
// ============================================================

describe('getColorWithOpacity', () => {
  it('converts 6-digit HEX to rgba', () => {
    expect(getColorWithOpacity('#3B82F6', 0.1)).toBe('rgba(59, 130, 246, 0.1)');
    expect(getColorWithOpacity('#000000', 0.5)).toBe('rgba(0, 0, 0, 0.5)');
    expect(getColorWithOpacity('#FFFFFF', 1)).toBe('rgba(255, 255, 255, 1)');
  });

  it('converts 3-digit HEX to rgba', () => {
    expect(getColorWithOpacity('#fff', 0.2)).toBe('rgba(255, 255, 255, 0.2)');
    expect(getColorWithOpacity('#000', 0.5)).toBe('rgba(0, 0, 0, 0.5)');
    expect(getColorWithOpacity('#f00', 0.8)).toBe('rgba(255, 0, 0, 0.8)');
  });

  it('handles invalid colors with fallback', () => {
    expect(getColorWithOpacity('invalid', 0.5)).toBe('rgba(0, 0, 0, 0.5)');
    expect(getColorWithOpacity('', 0.5)).toBe('rgba(0, 0, 0, 0.5)');
  });
});

// ============================================================
// Constants Tests
// ============================================================

describe('Constants', () => {
  it('has 12 preset colors', () => {
    expect(PRESET_COLORS).toHaveLength(12);
  });

  it('all preset colors are valid HEX colors', () => {
    PRESET_COLORS.forEach((color) => {
      expect(isValidHexColor(color)).toBe(true);
    });
  });

  it('default tag color is valid', () => {
    expect(isValidHexColor(DEFAULT_TAG_COLOR)).toBe(true);
  });

  it('default tag color is in preset colors', () => {
    expect(PRESET_COLORS).toContain(DEFAULT_TAG_COLOR);
  });

  it('max tag name length is 20', () => {
    expect(MAX_TAG_NAME_LENGTH).toBe(20);
  });
});
