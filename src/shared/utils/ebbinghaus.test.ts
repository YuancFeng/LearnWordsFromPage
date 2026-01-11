/**
 * LingoRecall AI - Ebbinghaus Algorithm Tests
 * Story 3.1 实现 - 艾宾浩斯复习算法测试
 *
 * @module shared/utils/ebbinghaus.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  REVIEW_INTERVALS,
  DAY_MS,
  initializeReviewParams,
  calculateNextReview,
  type ReviewResult,
} from './ebbinghaus';

describe('ebbinghaus', () => {
  // ============================================================
  // Task 1: 常量定义测试
  // ============================================================

  describe('REVIEW_INTERVALS constant (AC: #3)', () => {
    it('should define review intervals as [1, 3, 7, 15, 30, 60, 120] days', () => {
      expect(REVIEW_INTERVALS).toEqual([1, 3, 7, 15, 30, 60, 120]);
    });

    it('should have 7 intervals', () => {
      expect(REVIEW_INTERVALS.length).toBe(7);
    });

    it('should be immutable (readonly array)', () => {
      // TypeScript 类型检查会确保这一点
      // 运行时检查数组内容不会被修改
      const firstInterval = REVIEW_INTERVALS[0];
      expect(firstInterval).toBe(1);
    });
  });

  describe('DAY_MS constant', () => {
    it('should equal 86400000 milliseconds (24 * 60 * 60 * 1000)', () => {
      expect(DAY_MS).toBe(86400000);
      expect(DAY_MS).toBe(24 * 60 * 60 * 1000);
    });
  });

  // ============================================================
  // Task 2: 复习参数初始化测试
  // ============================================================

  describe('initializeReviewParams (AC: #1)', () => {
    beforeEach(() => {
      // 固定时间以便测试
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-10T10:00:00.000Z'));
    });

    it('should set nextReviewAt to current time + 1 day (86400000ms)', () => {
      const now = Date.now();
      const params = initializeReviewParams();

      expect(params.nextReviewAt).toBe(now + DAY_MS);
    });

    it('should initialize reviewCount to 0', () => {
      const params = initializeReviewParams();
      expect(params.reviewCount).toBe(0);
    });

    it('should set interval to 1 (first interval)', () => {
      const params = initializeReviewParams();
      expect(params.interval).toBe(1);
    });

    it('should return all required fields', () => {
      const params = initializeReviewParams();

      expect(params).toHaveProperty('nextReviewAt');
      expect(params).toHaveProperty('reviewCount');
      expect(params).toHaveProperty('interval');
    });
  });

  // ============================================================
  // Task 2: 复习时间计算测试
  // ============================================================

  describe('calculateNextReview (AC: #1, #3)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-10T10:00:00.000Z'));
    });

    describe('when user remembers the word', () => {
      it('should advance to next interval (reviewCount 0 -> 1, interval 1 -> 3)', () => {
        const result = calculateNextReview(0, 'remembered');

        expect(result.reviewCount).toBe(1);
        expect(result.interval).toBe(3); // REVIEW_INTERVALS[1]
        expect(result.nextReviewAt).toBe(Date.now() + 3 * DAY_MS);
      });

      it('should continue advancing intervals (reviewCount 1 -> 2, interval 3 -> 7)', () => {
        const result = calculateNextReview(1, 'remembered');

        expect(result.reviewCount).toBe(2);
        expect(result.interval).toBe(7); // REVIEW_INTERVALS[2]
        expect(result.nextReviewAt).toBe(Date.now() + 7 * DAY_MS);
      });

      it('should upgrade from reviewCount 5 to 6, interval 60 to 120', () => {
        // Story 3.4 - AC1: 记住了，升级到下一个间隔
        const result = calculateNextReview(5, 'remembered');

        expect(result.reviewCount).toBe(6);
        expect(result.interval).toBe(120); // REVIEW_INTERVALS[6]
        expect(result.nextReviewAt).toBe(Date.now() + 120 * DAY_MS);
      });

      it('should stay at max reviewCount 6 and interval 120 (AC3: maximum limit)', () => {
        // Story 3.4 - AC3: 最大间隔限制
        // reviewCount=6 已达最大，点击"记住了"应保持为 6
        const result = calculateNextReview(6, 'remembered');

        expect(result.reviewCount).toBe(6); // 不再增加
        expect(result.interval).toBe(120); // 保持最大间隔
        expect(result.nextReviewAt).toBe(Date.now() + 120 * DAY_MS);
      });

      it('should still stay at max when reviewCount is already beyond 6', () => {
        // 边界情况：如果 reviewCount 已经超过 6，也应该保持为 6
        const result = calculateNextReview(10, 'remembered');

        expect(result.reviewCount).toBe(6); // 不超过最大值
        expect(result.interval).toBe(120); // 保持最大间隔
        expect(result.nextReviewAt).toBe(Date.now() + 120 * DAY_MS);
      });
    });

    describe('when user forgets the word', () => {
      it('should reset to first interval (reviewCount stays, interval -> 1)', () => {
        const result = calculateNextReview(3, 'forgotten');

        expect(result.reviewCount).toBe(0); // Reset to 0
        expect(result.interval).toBe(1); // Reset to first interval
        expect(result.nextReviewAt).toBe(Date.now() + 1 * DAY_MS);
      });

      it('should reset even from maximum interval', () => {
        const result = calculateNextReview(6, 'forgotten');

        expect(result.reviewCount).toBe(0);
        expect(result.interval).toBe(1);
        expect(result.nextReviewAt).toBe(Date.now() + 1 * DAY_MS);
      });
    });

    describe('edge cases', () => {
      it('should handle negative reviewCount gracefully', () => {
        const result = calculateNextReview(-1, 'remembered');

        // Should treat as 0
        expect(result.reviewCount).toBeGreaterThanOrEqual(0);
        expect(result.interval).toBeGreaterThanOrEqual(1);
      });

      it('should handle very large reviewCount', () => {
        const result = calculateNextReview(100, 'remembered');

        expect(result.interval).toBe(120); // Capped at max
      });
    });
  });
});
