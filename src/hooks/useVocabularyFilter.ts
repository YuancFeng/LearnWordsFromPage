/**
 * LingoRecall AI - useVocabularyFilter Hook
 * Story 4.5 - Task 3: 词汇筛选 Hook
 *
 * 提供关键词搜索和标签筛选的组合功能
 *
 * @module hooks/useVocabularyFilter
 */

import { useState, useCallback, useMemo } from 'react';
import type { WordRecord } from '../shared/messaging/types';
import type { Tag } from '../shared/types/tag';

/**
 * 筛选条件
 */
export interface VocabularyFilters {
  /** 搜索关键词 */
  keyword: string;
  /** 选中的标签 ID 列表 */
  tagIds: string[];
}

/**
 * useVocabularyFilter 返回类型
 */
export interface UseVocabularyFilterReturn {
  /** 筛选后的词汇列表 */
  filteredWords: WordRecord[];
  /** 筛选条件 */
  filters: VocabularyFilters;
  /** 当前搜索关键词 */
  keyword: string;
  /** 选中的标签 ID 列表 */
  selectedTagIds: string[];
  /** 设置搜索关键词 */
  setKeyword: (keyword: string) => void;
  /** 切换标签选中状态 */
  toggleTag: (tagId: string) => void;
  /** 清除所有标签筛选 */
  clearTagFilter: () => void;
  /** 清除所有筛选条件 */
  clearAllFilters: () => void;
  /** 是否有活跃的筛选条件 */
  hasActiveFilters: boolean;
  /** 是否有活跃的标签筛选 */
  hasTagFilter: boolean;
  /** 筛选后的词汇数量 */
  filteredCount: number;
  /** 词汇总数量 */
  totalCount: number;
}

/**
 * 检查词汇是否匹配搜索关键词
 * Story 4.5 - AC1: 搜索匹配
 */
export function matchesKeyword(word: WordRecord, keyword: string): boolean {
  const normalizedKeyword = keyword.toLowerCase().trim();
  if (!normalizedKeyword) return true;

  const textMatch = word.text.toLowerCase().includes(normalizedKeyword);
  const meaningMatch = word.meaning?.toLowerCase().includes(normalizedKeyword) || false;

  return textMatch || meaningMatch;
}

/**
 * 检查词汇是否包含所有指定的标签
 * Story 4.5 - AC2: 多标签筛选（AND 逻辑）
 */
export function matchesTags(word: WordRecord, selectedTagIds: string[]): boolean {
  if (selectedTagIds.length === 0) return true;

  const wordTagIds = word.tagIds || [];
  return selectedTagIds.every((tagId) => wordTagIds.includes(tagId));
}

/**
 * 词汇筛选 Hook
 * Story 4.5 - AC1, AC2, AC3: 组合搜索和标签筛选
 *
 * @param allWords - 所有词汇列表
 * @param externalKeyword - 外部提供的搜索关键词（可选，用于与 useSearch 集成）
 * @returns UseVocabularyFilterReturn
 *
 * @example
 * ```tsx
 * const {
 *   filteredWords,
 *   keyword,
 *   selectedTagIds,
 *   setKeyword,
 *   toggleTag,
 *   clearAllFilters,
 *   hasActiveFilters,
 * } = useVocabularyFilter(allWords);
 * ```
 */
export function useVocabularyFilter(
  allWords: WordRecord[],
  externalKeyword?: string
): UseVocabularyFilterReturn {
  // 内部搜索关键词状态（如果没有外部提供）
  const [internalKeyword, setInternalKeyword] = useState('');
  // 选中的标签 ID
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  // 使用外部或内部关键词
  const keyword = externalKeyword !== undefined ? externalKeyword : internalKeyword;

  /**
   * 筛选后的词汇列表
   * 使用 useMemo 进行性能优化
   */
  const filteredWords = useMemo(() => {
    return allWords.filter(
      (word) =>
        matchesKeyword(word, keyword) && matchesTags(word, selectedTagIds)
    );
  }, [allWords, keyword, selectedTagIds]);

  /**
   * 设置搜索关键词（仅在使用内部状态时有效）
   */
  const setKeyword = useCallback((newKeyword: string) => {
    setInternalKeyword(newKeyword);
  }, []);

  /**
   * 切换标签选中状态
   */
  const toggleTag = useCallback((tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  }, []);

  /**
   * 清除所有标签筛选
   */
  const clearTagFilter = useCallback(() => {
    setSelectedTagIds([]);
  }, []);

  /**
   * 清除所有筛选条件
   * Story 4.5 - AC3
   */
  const clearAllFilters = useCallback(() => {
    setInternalKeyword('');
    setSelectedTagIds([]);
  }, []);

  // 计算派生状态
  const hasTagFilter = selectedTagIds.length > 0;
  const hasActiveFilters = keyword.trim().length > 0 || hasTagFilter;

  return {
    filteredWords,
    filters: {
      keyword,
      tagIds: selectedTagIds,
    },
    keyword,
    selectedTagIds,
    setKeyword,
    toggleTag,
    clearTagFilter,
    clearAllFilters,
    hasActiveFilters,
    hasTagFilter,
    filteredCount: filteredWords.length,
    totalCount: allWords.length,
  };
}

/**
 * 根据标签 ID 列表获取对应的标签对象
 */
export function getSelectedTags(allTags: Tag[], selectedIds: string[]): Tag[] {
  return allTags.filter((tag) => selectedIds.includes(tag.id));
}

export default useVocabularyFilter;
