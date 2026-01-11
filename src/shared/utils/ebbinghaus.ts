/**
 * LingoRecall AI - Ebbinghaus Algorithm
 * Story 3.1 实现 - 艾宾浩斯复习算法
 *
 * 基于艾宾浩斯遗忘曲线的间隔重复算法
 * 复习间隔序列: [1, 3, 7, 15, 30, 60, 120] 天
 *
 * @module shared/utils/ebbinghaus
 */

// ============================================================
// Constants
// ============================================================

/**
 * 艾宾浩斯复习间隔序列（天数）
 * AC#3: 间隔序列为 [1, 3, 7, 15, 30, 60, 120] 天
 */
export const REVIEW_INTERVALS: readonly number[] = [1, 3, 7, 15, 30, 60, 120] as const;

/**
 * 一天的毫秒数
 * 86400000 = 24 * 60 * 60 * 1000
 */
export const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 最大复习次数
 * Story 3.4 - AC3: reviewCount 不超过 6
 */
export const MAX_REVIEW_COUNT = REVIEW_INTERVALS.length - 1; // 6

// ============================================================
// Types
// ============================================================

/**
 * 复习结果类型
 * - 'remembered': 用户记住了词汇
 * - 'forgotten': 用户忘记了词汇
 */
export type ReviewResult = 'remembered' | 'forgotten';

/**
 * 复习参数（WordRecord 的子集）
 */
export interface ReviewParams {
  nextReviewAt: number;
  reviewCount: number;
  interval: number;
}

// ============================================================
// Functions
// ============================================================

/**
 * 初始化新词汇的复习参数
 * AC#1: 新词汇初始化复习参数
 *
 * @returns ReviewParams 初始复习参数
 * - nextReviewAt: 当前时间 + 1 天 (86400000ms)
 * - reviewCount: 0
 * - interval: 1
 */
export function initializeReviewParams(): ReviewParams {
  return {
    nextReviewAt: Date.now() + REVIEW_INTERVALS[0] * DAY_MS,
    reviewCount: 0,
    interval: REVIEW_INTERVALS[0],
  };
}

/**
 * 计算下次复习时间
 * AC#1, AC#3: 根据复习结果计算下一个复习间隔
 *
 * @param currentReviewCount 当前复习次数
 * @param result 复习结果 ('remembered' | 'forgotten')
 * @returns ReviewParams 更新后的复习参数
 *
 * 算法逻辑:
 * - remembered: 复习次数 +1，间隔进入下一级（最大 120 天）
 * - forgotten: 复习次数重置为 0，间隔重置为 1 天
 */
export function calculateNextReview(
  currentReviewCount: number,
  result: ReviewResult
): ReviewParams {
  // 处理负数边界情况
  const safeReviewCount = Math.max(0, currentReviewCount);

  if (result === 'forgotten') {
    // 忘记了，重置到第一个间隔
    return {
      nextReviewAt: Date.now() + REVIEW_INTERVALS[0] * DAY_MS,
      reviewCount: 0,
      interval: REVIEW_INTERVALS[0],
    };
  }

  // 记住了，进入下一个间隔
  // Story 3.4 - AC3: reviewCount 最大为 6（REVIEW_INTERVALS.length - 1）
  const maxReviewCount = REVIEW_INTERVALS.length - 1; // 6

  // 如果已达到最大值，保持不变；否则增加 1
  const newReviewCount = Math.min(safeReviewCount + 1, maxReviewCount);

  // 计算新间隔
  const newInterval = REVIEW_INTERVALS[newReviewCount];

  return {
    nextReviewAt: Date.now() + newInterval * DAY_MS,
    reviewCount: newReviewCount,
    interval: newInterval,
  };
}
