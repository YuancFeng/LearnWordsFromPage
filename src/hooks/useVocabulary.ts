/**
 * LingoRecall AI - useVocabulary Hook
 * Story 2.2 实现 - AC1: Popup 词库列表
 *
 * 提供词汇数据获取、删除、刷新功能
 *
 * @module hooks/useVocabulary
 */

import { useState, useEffect, useCallback } from 'react';
import { MessageTypes, sendMessage, type WordRecord } from '../shared/messaging';

/**
 * Hook 返回类型
 */
export interface UseVocabularyResult {
  /** 词汇列表 */
  words: WordRecord[];
  /** 是否正在加载 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 刷新词汇列表 */
  refresh: () => Promise<void>;
  /** 删除词汇 */
  deleteWord: (id: string) => Promise<boolean>;
  /** 词汇总数 */
  totalCount: number;
}

/**
 * 词汇列表 Hook
 * Story 2.2 - AC1: Popup 显示所有保存的词汇列表
 *
 * @param options 可选配置
 * @returns UseVocabularyResult
 */
export function useVocabulary(options?: {
  /** 每页数量限制 */
  limit?: number;
  /** 偏移量 */
  offset?: number;
  /** 搜索查询 */
  searchQuery?: string;
  /** 标签过滤 */
  tagIds?: string[];
  /** 是否自动加载 */
  autoLoad?: boolean;
}): UseVocabularyResult {
  const [words, setWords] = useState<WordRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const { limit, offset, searchQuery, tagIds, autoLoad = true } = options || {};

  /**
   * 获取词汇列表
   */
  const fetchWords = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await sendMessage(MessageTypes.GET_WORDS, {
        limit,
        offset,
        searchQuery,
        tagIds,
      });

      if (response.success && response.data) {
        setWords(response.data);
        setTotalCount(response.data.length);
      } else {
        setError(response.error?.message || '获取词汇列表失败');
        setWords([]);
      }
    } catch (err) {
      console.error('[LingoRecall] useVocabulary error:', err);
      setError(err instanceof Error ? err.message : '未知错误');
      setWords([]);
    } finally {
      setIsLoading(false);
    }
  }, [limit, offset, searchQuery, tagIds]);

  /**
   * 删除词汇
   * Story 2.2 - AC4: 删除按钮，确认后删除
   */
  const deleteWord = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await sendMessage(MessageTypes.DELETE_WORD, { id });

      if (response.success) {
        // 从本地状态中移除已删除的词汇
        setWords((prev) => prev.filter((word) => word.id !== id));
        setTotalCount((prev) => prev - 1);
        return true;
      } else {
        console.error('[LingoRecall] Delete failed:', response.error);
        return false;
      }
    } catch (err) {
      console.error('[LingoRecall] Delete error:', err);
      return false;
    }
  }, []);

  /**
   * 刷新词汇列表
   */
  const refresh = useCallback(async () => {
    await fetchWords();
  }, [fetchWords]);

  // 自动加载
  useEffect(() => {
    if (autoLoad) {
      fetchWords();
    }
  }, [autoLoad, fetchWords]);

  return {
    words,
    isLoading,
    error,
    refresh,
    deleteWord,
    totalCount,
  };
}

export default useVocabulary;
