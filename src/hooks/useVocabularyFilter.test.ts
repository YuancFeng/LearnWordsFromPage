/**
 * LingoRecall AI - useVocabularyFilter Hook Tests
 * Story 4.5 - Task 6: Unit Tests
 *
 * @module hooks/useVocabularyFilter.test
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useVocabularyFilter,
  matchesKeyword,
  matchesTags,
  getSelectedTags,
} from './useVocabularyFilter';
import type { WordRecord } from '../shared/messaging/types';
import type { Tag } from '../shared/types/tag';

// 测试用词汇数据
const createMockWord = (overrides: Partial<WordRecord> = {}): WordRecord => ({
  id: 'word-1',
  text: 'apple',
  meaning: 'a round fruit',
  pronunciation: '/ˈæpəl/',
  partOfSpeech: 'noun',
  exampleSentence: 'I ate an apple.',
  createdAt: Date.now(),
  sourceUrl: 'https://example.com',
  sourceTitle: 'Test Page',
  contextBefore: 'I ate an',
  contextAfter: 'yesterday',
  xpath: '/html/body/p[1]',
  textOffset: 10,
  nextReviewAt: Date.now(),
  reviewCount: 0,
  easeFactor: 2.5,
  interval: 1,
  tagIds: [],
  ...overrides,
});

const mockWords: WordRecord[] = [
  createMockWord({ id: '1', text: 'apple', meaning: 'a round fruit', tagIds: ['tag-1'] }),
  createMockWord({ id: '2', text: 'banana', meaning: 'a yellow fruit', tagIds: ['tag-1', 'tag-2'] }),
  createMockWord({ id: '3', text: 'cherry', meaning: 'a small red fruit', tagIds: ['tag-2'] }),
  createMockWord({ id: '4', text: 'date', meaning: 'a sweet brown fruit', tagIds: [] }),
  createMockWord({ id: '5', text: 'elderberry', meaning: 'a dark purple berry', tagIds: ['tag-1', 'tag-2', 'tag-3'] }),
];

const mockTags: Tag[] = [
  { id: 'tag-1', name: '重要', color: '#ef4444', createdAt: Date.now() },
  { id: 'tag-2', name: '工作', color: '#3b82f6', createdAt: Date.now() },
  { id: 'tag-3', name: '学习', color: '#22c55e', createdAt: Date.now() },
];

describe('matchesKeyword', () => {
  it('returns true for empty keyword', () => {
    const word = createMockWord({ text: 'apple' });
    expect(matchesKeyword(word, '')).toBe(true);
    expect(matchesKeyword(word, '   ')).toBe(true);
  });

  it('matches word text case-insensitively', () => {
    const word = createMockWord({ text: 'Apple' });
    expect(matchesKeyword(word, 'apple')).toBe(true);
    expect(matchesKeyword(word, 'APPLE')).toBe(true);
    expect(matchesKeyword(word, 'App')).toBe(true);
  });

  it('matches word meaning case-insensitively', () => {
    const word = createMockWord({ meaning: 'A Round Fruit' });
    expect(matchesKeyword(word, 'round')).toBe(true);
    expect(matchesKeyword(word, 'fruit')).toBe(true);
    expect(matchesKeyword(word, 'FRUIT')).toBe(true);
  });

  it('returns false when no match', () => {
    const word = createMockWord({ text: 'apple', meaning: 'a round fruit' });
    expect(matchesKeyword(word, 'banana')).toBe(false);
    expect(matchesKeyword(word, 'xyz')).toBe(false);
  });

  it('handles undefined meaning', () => {
    const word = createMockWord({ text: 'apple', meaning: undefined });
    expect(matchesKeyword(word, 'apple')).toBe(true);
    expect(matchesKeyword(word, 'fruit')).toBe(false);
  });
});

describe('matchesTags', () => {
  it('returns true for empty tag filter', () => {
    const word = createMockWord({ tagIds: ['tag-1'] });
    expect(matchesTags(word, [])).toBe(true);
  });

  it('returns true when word has all selected tags (AND logic)', () => {
    const word = createMockWord({ tagIds: ['tag-1', 'tag-2', 'tag-3'] });
    expect(matchesTags(word, ['tag-1'])).toBe(true);
    expect(matchesTags(word, ['tag-1', 'tag-2'])).toBe(true);
    expect(matchesTags(word, ['tag-1', 'tag-2', 'tag-3'])).toBe(true);
  });

  it('returns false when word is missing any selected tag', () => {
    const word = createMockWord({ tagIds: ['tag-1'] });
    expect(matchesTags(word, ['tag-1', 'tag-2'])).toBe(false);
    expect(matchesTags(word, ['tag-2'])).toBe(false);
  });

  it('handles word with no tags', () => {
    const word = createMockWord({ tagIds: [] });
    expect(matchesTags(word, [])).toBe(true);
    expect(matchesTags(word, ['tag-1'])).toBe(false);
  });

  it('handles undefined tagIds', () => {
    const word = createMockWord({ tagIds: undefined });
    expect(matchesTags(word, [])).toBe(true);
    expect(matchesTags(word, ['tag-1'])).toBe(false);
  });
});

describe('getSelectedTags', () => {
  it('returns empty array for empty selection', () => {
    expect(getSelectedTags(mockTags, [])).toEqual([]);
  });

  it('returns matching tags', () => {
    const result = getSelectedTags(mockTags, ['tag-1', 'tag-3']);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('tag-1');
    expect(result[1].id).toBe('tag-3');
  });

  it('ignores non-existent tag IDs', () => {
    const result = getSelectedTags(mockTags, ['tag-1', 'non-existent']);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('tag-1');
  });
});

describe('useVocabularyFilter', () => {
  describe('initial state', () => {
    it('returns all words when no filters', () => {
      const { result } = renderHook(() => useVocabularyFilter(mockWords));

      expect(result.current.filteredWords).toHaveLength(5);
      expect(result.current.keyword).toBe('');
      expect(result.current.selectedTagIds).toEqual([]);
      expect(result.current.hasActiveFilters).toBe(false);
      expect(result.current.hasTagFilter).toBe(false);
      expect(result.current.filteredCount).toBe(5);
      expect(result.current.totalCount).toBe(5);
    });
  });

  describe('keyword filtering - AC1', () => {
    it('filters by keyword', () => {
      const { result } = renderHook(() => useVocabularyFilter(mockWords));

      act(() => {
        result.current.setKeyword('apple');
      });

      expect(result.current.filteredWords).toHaveLength(1);
      expect(result.current.filteredWords[0].text).toBe('apple');
      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('filters by meaning keyword', () => {
      const { result } = renderHook(() => useVocabularyFilter(mockWords));

      act(() => {
        result.current.setKeyword('fruit');
      });

      // apple, banana, cherry, date all have 'fruit' in meaning
      expect(result.current.filteredWords).toHaveLength(4);
    });

    it('uses external keyword when provided', () => {
      const { result } = renderHook(() => useVocabularyFilter(mockWords, 'banana'));

      expect(result.current.filteredWords).toHaveLength(1);
      expect(result.current.filteredWords[0].text).toBe('banana');
      expect(result.current.keyword).toBe('banana');
    });
  });

  describe('tag filtering - AC2', () => {
    it('filters by single tag', () => {
      const { result } = renderHook(() => useVocabularyFilter(mockWords));

      act(() => {
        result.current.toggleTag('tag-1');
      });

      // apple, banana, elderberry have tag-1
      expect(result.current.filteredWords).toHaveLength(3);
      expect(result.current.hasTagFilter).toBe(true);
    });

    it('filters by multiple tags with AND logic', () => {
      const { result } = renderHook(() => useVocabularyFilter(mockWords));

      act(() => {
        result.current.toggleTag('tag-1');
        result.current.toggleTag('tag-2');
      });

      // Only banana and elderberry have both tag-1 AND tag-2
      expect(result.current.filteredWords).toHaveLength(2);
      expect(result.current.selectedTagIds).toEqual(['tag-1', 'tag-2']);
    });

    it('toggles tag off when clicked again', () => {
      const { result } = renderHook(() => useVocabularyFilter(mockWords));

      act(() => {
        result.current.toggleTag('tag-1');
      });
      expect(result.current.selectedTagIds).toEqual(['tag-1']);

      act(() => {
        result.current.toggleTag('tag-1');
      });
      expect(result.current.selectedTagIds).toEqual([]);
      expect(result.current.filteredWords).toHaveLength(5);
    });
  });

  describe('combined filtering', () => {
    it('combines keyword and tag filters', () => {
      const { result } = renderHook(() => useVocabularyFilter(mockWords));

      act(() => {
        result.current.setKeyword('berry');
        result.current.toggleTag('tag-1');
      });

      // elderberry matches 'berry' AND has tag-1
      expect(result.current.filteredWords).toHaveLength(1);
      expect(result.current.filteredWords[0].text).toBe('elderberry');
    });
  });

  describe('clear filters - AC3', () => {
    it('clears tag filter', () => {
      const { result } = renderHook(() => useVocabularyFilter(mockWords));

      act(() => {
        result.current.toggleTag('tag-1');
        result.current.toggleTag('tag-2');
      });
      expect(result.current.selectedTagIds).toHaveLength(2);

      act(() => {
        result.current.clearTagFilter();
      });
      expect(result.current.selectedTagIds).toEqual([]);
      expect(result.current.hasTagFilter).toBe(false);
    });

    it('clears all filters', () => {
      const { result } = renderHook(() => useVocabularyFilter(mockWords));

      act(() => {
        result.current.setKeyword('apple');
        result.current.toggleTag('tag-1');
      });
      expect(result.current.hasActiveFilters).toBe(true);

      act(() => {
        result.current.clearAllFilters();
      });
      expect(result.current.keyword).toBe('');
      expect(result.current.selectedTagIds).toEqual([]);
      expect(result.current.hasActiveFilters).toBe(false);
      expect(result.current.filteredWords).toHaveLength(5);
    });
  });

  describe('filters object', () => {
    it('returns current filters state', () => {
      const { result } = renderHook(() => useVocabularyFilter(mockWords));

      act(() => {
        result.current.setKeyword('test');
        result.current.toggleTag('tag-1');
      });

      expect(result.current.filters).toEqual({
        keyword: 'test',
        tagIds: ['tag-1'],
      });
    });
  });

  describe('memoization', () => {
    it('returns same filtered array for same filters', () => {
      const { result, rerender } = renderHook(() => useVocabularyFilter(mockWords));

      const firstResult = result.current.filteredWords;
      rerender();
      const secondResult = result.current.filteredWords;

      expect(firstResult).toBe(secondResult);
    });

    it('returns new array when filters change', () => {
      const { result } = renderHook(() => useVocabularyFilter(mockWords));

      const firstResult = result.current.filteredWords;

      act(() => {
        result.current.toggleTag('tag-1');
      });

      const secondResult = result.current.filteredWords;
      expect(firstResult).not.toBe(secondResult);
    });
  });
});
