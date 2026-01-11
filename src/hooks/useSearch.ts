/**
 * LingoRecall AI - useSearch Hook
 * Story 2.5 实现 - AC1: 实时搜索与防抖
 *
 * 提供搜索状态管理和 300ms 防抖功能
 *
 * @module hooks/useSearch
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { MessageTypes, sendMessage, type WordRecord } from '../shared/messaging';

/** 防抖延迟时间（毫秒） */
const DEBOUNCE_DELAY = 300;

/**
 * 搜索结果数据结构
 */
export interface SearchResult {
  /** 匹配的词汇列表 */
  words: WordRecord[];
  /** 匹配数量 */
  matchCount: number;
  /** 词汇总数 */
  totalCount: number;
}

/**
 * useSearch Hook 返回类型
 */
export interface UseSearchReturn {
  /** 搜索查询字符串 */
  searchQuery: string;
  /** 设置搜索查询（带防抖） */
  setSearchQuery: (query: string) => void;
  /** 搜索结果列表 */
  searchResults: WordRecord[] | null;
  /** 匹配数量 */
  matchCount: number;
  /** 词汇总数 */
  totalCount: number;
  /** 是否正在搜索 */
  isSearching: boolean;
  /** 清除搜索 */
  clearSearch: () => void;
  /** 是否有活跃的搜索查询 */
  hasActiveSearch: boolean;
  /** 错误信息 */
  error: string | null;
}

/**
 * 搜索 Hook
 * Story 2.5 - AC1: 实时搜索与 300ms 防抖
 *
 * @returns UseSearchReturn 搜索状态和方法
 *
 * @example
 * ```tsx
 * const {
 *   searchQuery,
 *   setSearchQuery,
 *   searchResults,
 *   matchCount,
 *   totalCount,
 *   isSearching,
 *   clearSearch
 * } = useSearch();
 * ```
 */
export function useSearch(): UseSearchReturn {
  // 状态管理
  const [searchQuery, setSearchQueryState] = useState('');
  const [searchResults, setSearchResults] = useState<WordRecord[] | null>(null);
  const [matchCount, setMatchCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 防抖定时器引用
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  /**
   * 执行搜索请求
   * 通过消息系统调用 Service Worker 中的搜索服务
   */
  const performSearch = useCallback(async (query: string) => {
    const currentRequestId = requestIdRef.current + 1;
    requestIdRef.current = currentRequestId;

    setIsSearching(true);
    setError(null);

    try {
      // 发送搜索消息到 Service Worker
      const response = await sendMessage(MessageTypes.GET_WORDS, {
        searchQuery: query,
      });

      if (requestIdRef.current !== currentRequestId) {
        return;
      }

      if (response.success && response.data) {
        const words = response.data;
        setSearchResults(words);
        setMatchCount(words.length);

        // 如果没有搜索查询，matchCount 就是 totalCount
        if (!query.trim()) {
          setTotalCount(words.length);
        } else {
          const totalResponse = await sendMessage(MessageTypes.GET_WORDS, {});
          if (requestIdRef.current !== currentRequestId) {
            return;
          }
          if (totalResponse.success && totalResponse.data) {
            setTotalCount(totalResponse.data.length);
          }
        }
      } else {
        setError(response.error?.message || '搜索失败');
        setSearchResults([]);
        setMatchCount(0);
      }
    } catch (err) {
      console.error('[LingoRecall] useSearch error:', err);
      setError(err instanceof Error ? err.message : '搜索失败');
      setSearchResults([]);
      setMatchCount(0);
    } finally {
      if (requestIdRef.current === currentRequestId) {
        setIsSearching(false);
      }
    }
  }, []);

  /**
   * 获取总词汇数量
   * 用于显示 matchCount/totalCount
   */
  const fetchTotalCount = useCallback(async () => {
    try {
      const response = await sendMessage(MessageTypes.GET_WORDS, {});
      if (response.success && response.data) {
        setTotalCount(response.data.length);
      }
    } catch (err) {
      console.error('[LingoRecall] fetchTotalCount error:', err);
    }
  }, []);

  /**
   * 设置搜索查询（带 300ms 防抖）
   * Story 2.5 - AC1: debounce 300ms
   */
  const setSearchQuery = useCallback(
    (query: string) => {
      setSearchQueryState(query);

      // 清除之前的定时器
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // 设置新的防抖定时器
      debounceTimerRef.current = setTimeout(() => {
        performSearch(query);
      }, DEBOUNCE_DELAY);
    },
    [performSearch]
  );

  /**
   * 清除搜索
   * Story 2.5 - AC3: 清除搜索按钮
   */
  const clearSearch = useCallback(() => {
    // 清除防抖定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setSearchQueryState('');
    setError(null);

    // 立即执行空查询搜索以刷新列表
    performSearch('');
  }, [performSearch]);

  /**
   * 初始加载
   * 获取初始数据和总数量
   */
  useEffect(() => {
    // 初始加载所有词汇
    performSearch('');
    fetchTotalCount();
  }, [performSearch, fetchTotalCount]);

  /**
   * 清理定时器
   */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    matchCount,
    totalCount,
    isSearching,
    clearSearch,
    hasActiveSearch: searchQuery.trim().length > 0,
    error,
  };
}

export default useSearch;
