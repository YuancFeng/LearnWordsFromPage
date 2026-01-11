/**
 * LingoRecall AI - useReview Hook
 * Story 3.3 实现 - AC1, AC3, AC4: 复习卡片功能
 *
 * 提供复习词汇获取、复习结果提交功能
 *
 * @module hooks/useReview
 */

import { useState, useEffect, useCallback } from 'react';
import {
  MessageTypes,
  sendMessage,
  type WordRecord,
  type UpdateWordPayload,
} from '../shared/messaging';
import { calculateNextReview, type ReviewResult } from '../shared/utils/ebbinghaus';

/**
 * 复习统计数据
 */
export interface ReviewStats {
  /** 本次复习总数 */
  total: number;
  /** 记住的数量 */
  remembered: number;
  /** 忘记的数量 */
  forgotten: number;
}

/**
 * Hook 返回类型
 */
export interface UseReviewResult {
  /** 待复习词汇列表 */
  dueWords: WordRecord[];
  /** 是否正在加载 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 提交复习结果 */
  submitReview: (wordId: string, result: ReviewResult) => Promise<boolean>;
  /** 刷新待复习词汇 */
  refresh: () => Promise<void>;
}

/**
 * 复习 Hook
 * Story 3.3 - 提供复习功能的数据层
 *
 * @returns UseReviewResult
 */
export function useReview(): UseReviewResult {
  const [dueWords, setDueWords] = useState<WordRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 获取待复习词汇列表
   * Story 3.3 - AC1: 获取所有 nextReviewAt <= 当前时间的词汇
   */
  const fetchDueWords = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await sendMessage(MessageTypes.GET_DUE_WORDS, undefined as void);

      if (response.success && response.data) {
        setDueWords(response.data);
      } else {
        setError(response.error?.message || '获取待复习词汇失败');
        setDueWords([]);
      }
    } catch (err) {
      console.error('[LingoRecall] useReview fetchDueWords error:', err);
      setError(err instanceof Error ? err.message : '未知错误');
      setDueWords([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 提交复习结果
   * Story 3.3 - AC3: 点击"记住了"或"忘记了"后更新词汇
   * Story 3.4 - 根据复习结果更新 nextReviewAt
   *
   * @param wordId 词汇 ID
   * @param result 复习结果 ('remembered' | 'forgotten')
   * @returns Promise<boolean> 是否成功
   */
  const submitReview = useCallback(
    async (wordId: string, result: ReviewResult): Promise<boolean> => {
      try {
        // 找到对应的词汇获取当前 reviewCount
        const word = dueWords.find((w) => w.id === wordId);
        if (!word) {
          console.error('[LingoRecall] Word not found:', wordId);
          return false;
        }

        // 计算新的复习参数
        const newReviewParams = calculateNextReview(word.reviewCount, result);

        // 构建更新 payload
        const updates: UpdateWordPayload['updates'] = {
          nextReviewAt: newReviewParams.nextReviewAt,
          reviewCount: newReviewParams.reviewCount,
          interval: newReviewParams.interval,
        };

        const response = await sendMessage(MessageTypes.UPDATE_WORD, {
          id: wordId,
          updates,
        });

        if (response.success) {
          console.log(
            `[LingoRecall] Review submitted: ${wordId} - ${result}, next: ${new Date(newReviewParams.nextReviewAt).toLocaleDateString()}`
          );
          return true;
        } else {
          console.error('[LingoRecall] Submit review failed:', response.error);
          return false;
        }
      } catch (err) {
        console.error('[LingoRecall] Submit review error:', err);
        return false;
      }
    },
    [dueWords]
  );

  /**
   * 刷新待复习词汇
   */
  const refresh = useCallback(async () => {
    await fetchDueWords();
  }, [fetchDueWords]);

  // 初始加载
  useEffect(() => {
    fetchDueWords();
  }, [fetchDueWords]);

  return {
    dueWords,
    isLoading,
    error,
    submitReview,
    refresh,
  };
}

export default useReview;
