/**
 * LingoRecall AI - XPath Utilities Tests
 * Story 2.4 - AC1: XPath + textOffset 定位测试
 *
 * @module content/xpath.test
 */

import { describe, expect, it, beforeEach } from 'vitest';

import {
  getXPath,
  evaluateXPath,
  evaluateXPathWithDetails,
  getTextNodeAtOffset,
  locateTextByXPath,
  verifyXPathText,
} from './xpath';

describe('xpath utilities', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('getXPath', () => {
    it('returns empty string for null node', () => {
      expect(getXPath(null as unknown as Node)).toBe('');
    });

    it('generates XPath with id selector when element has unique id', () => {
      document.body.innerHTML = '<div id="unique-container"><p>Test</p></div>';
      const element = document.getElementById('unique-container');

      expect(getXPath(element!)).toBe('//*[@id="unique-container"]');
    });

    it('generates index-based XPath for elements without id', () => {
      document.body.innerHTML = '<div><p>First</p><p>Second</p></div>';
      const secondP = document.querySelectorAll('p')[1];

      const xpath = getXPath(secondP);
      expect(xpath).toContain('p[2]');
    });

    it('generates XPath for text nodes', () => {
      document.body.innerHTML = '<p id="para">Hello <span>world</span></p>';
      const textNode = document.getElementById('para')!.firstChild;

      const xpath = getXPath(textNode!);
      expect(xpath).toContain('text()[1]');
    });
  });

  describe('evaluateXPath', () => {
    it('returns null for empty xpath', () => {
      expect(evaluateXPath('')).toBeNull();
    });

    it('returns null for invalid xpath', () => {
      expect(evaluateXPath('///invalid')).toBeNull();
    });

    it('finds element by id selector', () => {
      document.body.innerHTML = '<div id="target">Content</div>';

      const result = evaluateXPath('//*[@id="target"]');
      expect(result).not.toBeNull();
      expect((result as Element).id).toBe('target');
    });

    it('finds element by path selector', () => {
      document.body.innerHTML = '<div><p>First</p><p>Second</p></div>';

      const result = evaluateXPath('/html/body/div/p[2]');
      expect(result).not.toBeNull();
      expect(result?.textContent).toBe('Second');
    });
  });

  describe('evaluateXPathWithDetails', () => {
    it('returns error for empty xpath', () => {
      const result = evaluateXPathWithDetails('');

      expect(result.found).toBe(false);
      expect(result.node).toBeNull();
      expect(result.error).toBe('Empty XPath expression');
    });

    it('returns found: true for valid xpath', () => {
      document.body.innerHTML = '<div id="test">Content</div>';

      const result = evaluateXPathWithDetails('//*[@id="test"]');
      expect(result.found).toBe(true);
      expect(result.node).not.toBeNull();
      expect(result.error).toBeUndefined();
    });

    it('returns found: false when node not found', () => {
      document.body.innerHTML = '<div>Content</div>';

      const result = evaluateXPathWithDetails('//*[@id="nonexistent"]');
      expect(result.found).toBe(false);
      expect(result.node).toBeNull();
    });
  });

  describe('getTextNodeAtOffset', () => {
    it('returns null when offset exceeds content', () => {
      document.body.innerHTML = '<p id="para">Hello</p>';
      const element = document.getElementById('para')!;

      expect(getTextNodeAtOffset(element, 100)).toBeNull();
    });

    it('finds correct text node in single-node element', () => {
      document.body.innerHTML = '<p id="para">Hello world</p>';
      const element = document.getElementById('para')!;

      const result = getTextNodeAtOffset(element, 6);
      expect(result).not.toBeNull();
      expect(result!.localOffset).toBe(6);
      expect(result!.node.textContent).toBe('Hello world');
    });

    it('finds correct text node across multiple nodes', () => {
      document.body.innerHTML = '<p id="para">Hello <span>world</span> test</p>';
      const element = document.getElementById('para')!;

      // Offset 6 is in "world" (after "Hello ")
      const result = getTextNodeAtOffset(element, 6);
      expect(result).not.toBeNull();
      expect(result!.node.textContent).toBe('world');
      expect(result!.localOffset).toBe(0);
    });
  });

  describe('locateTextByXPath', () => {
    it('returns null for invalid xpath', () => {
      document.body.innerHTML = '<p>Hello world</p>';

      expect(locateTextByXPath('//*[@id="nonexistent"]', 0, 5)).toBeNull();
    });

    it('creates range for single-node text', () => {
      document.body.innerHTML = '<p id="para">Hello world</p>';

      const range = locateTextByXPath('//*[@id="para"]', 6, 5);
      expect(range).not.toBeNull();
      expect(range!.toString()).toBe('world');
    });

    it('creates range for text at beginning', () => {
      document.body.innerHTML = '<p id="para">Hello world</p>';

      const range = locateTextByXPath('//*[@id="para"]', 0, 5);
      expect(range).not.toBeNull();
      expect(range!.toString()).toBe('Hello');
    });

    it('creates a multi-node range when text spans nodes', () => {
      document.body.innerHTML = '<p id="target">Hello <span>world</span>!</p>';

      const range = locateTextByXPath('//*[@id="target"]', 3, 8);
      expect(range).not.toBeNull();
      expect(range?.toString()).toBe('lo world');
    });

    it('returns null when requested length exceeds available text', () => {
      document.body.innerHTML = '<p id="target">Hello <span>world</span>!</p>';

      const range = locateTextByXPath('//*[@id="target"]', 0, 50);
      expect(range).toBeNull();
    });

    it('handles whitespace in text', () => {
      document.body.innerHTML = '<p id="para">  Hello  world  </p>';

      const range = locateTextByXPath('//*[@id="para"]', 2, 5);
      expect(range).not.toBeNull();
      expect(range!.toString()).toBe('Hello');
    });
  });

  describe('verifyXPathText', () => {
    it('returns false when xpath returns null', () => {
      expect(verifyXPathText('//*[@id="nonexistent"]', 'test', 0, 4)).toBe(false);
    });

    it('returns true when text matches', () => {
      document.body.innerHTML = '<p id="para">Hello world</p>';

      expect(verifyXPathText('//*[@id="para"]', 'world', 6, 5)).toBe(true);
    });

    it('returns false when text does not match', () => {
      document.body.innerHTML = '<p id="para">Hello world</p>';

      expect(verifyXPathText('//*[@id="para"]', 'test', 0, 4)).toBe(false);
    });
  });
});
