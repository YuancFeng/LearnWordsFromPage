/**
 * LingoRecall AI - Text Matcher Tests
 * Story 2.4 - AC2: Context Fallback Matching 测试
 *
 * @module content/textMatcher.test
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { findTextByContext, verifyRangeText } from './textMatcher';

describe('textMatcher', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('findTextByContext', () => {
    it('returns not found for empty text', () => {
      document.body.innerHTML = '<p>Hello world</p>';

      const result = findTextByContext('before', '', 'after');
      expect(result.found).toBe(false);
      expect(result.range).toBeNull();
      expect(result.method).toBe('none');
    });

    it('matches full context and returns exact range', () => {
      document.body.innerHTML = '<p>The quick brown fox.</p>';

      const result = findTextByContext('The ', 'quick', ' brown fox.');
      expect(result.found).toBe(true);
      expect(result.method).toBe('exact');
      expect(result.range?.toString()).toBe('quick');
      expect(result.confidence).toBe(1.0);
    });

    it('returns no match when full context is not found', () => {
      document.body.innerHTML = '<p>The quick brown fox.</p>';

      const result = findTextByContext('The ', 'quick', ' fox.');
      expect(result.found).toBe(false);
      expect(result.method).toBe('none');
      expect(result.range).toBeNull();
    });

    it('handles text in nested elements', () => {
      document.body.innerHTML = `
        <div>
          <p>First paragraph</p>
          <p>The <strong>quick brown</strong> fox jumps</p>
        </div>
      `;

      const result = findTextByContext('The ', 'quick brown', ' fox');
      expect(result.found).toBe(true);
      expect(result.range).not.toBeNull();
      expect(result.range!.toString()).toBe('quick brown');
    });

    it('handles empty context before', () => {
      document.body.innerHTML = '<p>Hello world</p>';

      const result = findTextByContext('', 'Hello', ' world');
      expect(result.found).toBe(true);
      expect(result.range!.toString()).toBe('Hello');
    });

    it('handles empty context after', () => {
      document.body.innerHTML = '<p>Hello world</p>';

      const result = findTextByContext('Hello ', 'world', '');
      expect(result.found).toBe(true);
      expect(result.range!.toString()).toBe('world');
    });

    it('handles Chinese text', () => {
      document.body.innerHTML = '<p>这是一段中文测试文本</p>';

      const result = findTextByContext('这是一段', '中文', '测试文本');
      expect(result.found).toBe(true);
      expect(result.range!.toString()).toBe('中文');
    });

    it('handles mixed language text', () => {
      document.body.innerHTML = '<p>English and 中文 mixed text</p>';

      const result = findTextByContext('English and ', '中文', ' mixed');
      expect(result.found).toBe(true);
      expect(result.range!.toString()).toBe('中文');
    });
  });

  describe('verifyRangeText', () => {
    it('returns true when range text matches expected', () => {
      document.body.innerHTML = '<p id="para">Hello world</p>';
      const textNode = document.getElementById('para')!.firstChild!;
      const range = document.createRange();
      range.setStart(textNode, 6);
      range.setEnd(textNode, 11);

      expect(verifyRangeText(range, 'world')).toBe(true);
    });

    it('returns false when range text does not match', () => {
      document.body.innerHTML = '<p id="para">Hello world</p>';
      const textNode = document.getElementById('para')!.firstChild!;
      const range = document.createRange();
      range.setStart(textNode, 6);
      range.setEnd(textNode, 11);

      expect(verifyRangeText(range, 'earth')).toBe(false);
    });
  });
});
