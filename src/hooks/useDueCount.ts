/**
 * LingoRecall AI - useDueCount Hook
 * Story 3.3 实现 - 获取待复习词汇数量
 *
 * 用于在词库界面显示待复习数量 Badge
 *
 * @module hooks/useDueCount
 */

import { useState, useEffect, useCallback } from 'react';
import { MessageTypes, sendMessage } from '../shared/messaging';

/**
 * Hook 返回类型
 */
export interface UseDueCountResult {
  /** 待复习词汇数量 */
  dueCount: number;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 刷新数量 */
  refresh: () => Promise<void>;
}

/**
 * 待复习数量 Hook
 * Story 3.3 - 用于显示待复习数量 Badge
 *
 * @returns UseDueCountResult
 */
export function useDueCount(): UseDueCountResult {
  const [dueCount, setDueCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * 获取待复习词汇数量
   */
  const fetchDueCount = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await sendMessage(MessageTypes.GET_DUE_COUNT, undefined as void);

      if (response.success && typeof response.data === 'number') {
        setDueCount(response.data);
      } else {
        setDueCount(0);
      }
    } catch (err) {
      console.error('[LingoRecall] useDueCount error:', err);
      setDueCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 刷新数量
   */
  const refresh = useCallback(async () => {
    await fetchDueCount();
  }, [fetchDueCount]);

  // 初始加载
  useEffect(() => {
    fetchDueCount();
  }, [fetchDueCount]);

  return {
    dueCount,
    isLoading,
    refresh,
  };
}

export default useDueCount;
