/**
 * LingoRecall AI - Badge 模块测试
 * Story 3.2 实现 - 待复习词汇提醒测试
 *
 * AC#1: Badge 显示待复习数量
 * AC#2: 无待复习词汇时清空 Badge
 * AC#3: Badge 数量超过 99 显示 "99+"
 * AC#4: 复习完成后实时更新 Badge
 *
 * @module background/badge.test
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  BADGE_COLOR,
  MAX_BADGE_COUNT,
  formatBadgeText,
  updateBadge,
  checkAndUpdateBadge,
} from './badge';

// Mock chrome API
const mockChrome = {
  action: {
    setBadgeText: vi.fn().mockResolvedValue(undefined),
    setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined),
  },
};

// Mock countDueWords
vi.mock('../shared/storage/db', () => ({
  countDueWords: vi.fn().mockResolvedValue(0),
}));

// Apply chrome mock globally
vi.stubGlobal('chrome', mockChrome);

describe('badge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================
  // Constants Tests
  // ============================================================

  describe('constants', () => {
    it('should define BADGE_COLOR as #EF4444 (AC#1)', () => {
      expect(BADGE_COLOR).toBe('#EF4444');
    });

    it('should define MAX_BADGE_COUNT as 99 (AC#3)', () => {
      expect(MAX_BADGE_COUNT).toBe(99);
    });
  });

  // ============================================================
  // formatBadgeText Tests (AC#2, AC#3)
  // ============================================================

  describe('formatBadgeText', () => {
    it('should return empty string for 0 (AC#2)', () => {
      expect(formatBadgeText(0)).toBe('');
    });

    it('should return empty string for negative numbers (AC#2)', () => {
      expect(formatBadgeText(-1)).toBe('');
      expect(formatBadgeText(-100)).toBe('');
    });

    it('should return number as string for 1-99', () => {
      expect(formatBadgeText(1)).toBe('1');
      expect(formatBadgeText(10)).toBe('10');
      expect(formatBadgeText(50)).toBe('50');
      expect(formatBadgeText(99)).toBe('99');
    });

    it('should return "99+" for numbers > 99 (AC#3)', () => {
      expect(formatBadgeText(100)).toBe('99+');
      expect(formatBadgeText(150)).toBe('99+');
      expect(formatBadgeText(999)).toBe('99+');
      expect(formatBadgeText(10000)).toBe('99+');
    });
  });

  // ============================================================
  // updateBadge Tests (AC#1, AC#2, AC#3)
  // ============================================================

  describe('updateBadge', () => {
    it('should set badge text and color for positive count (AC#1)', async () => {
      await updateBadge(5);

      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ text: '5' });
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        color: '#EF4444',
      });
    });

    it('should clear badge for zero count (AC#2)', async () => {
      await updateBadge(0);

      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
      // Should NOT set background color when clearing
      expect(mockChrome.action.setBadgeBackgroundColor).not.toHaveBeenCalled();
    });

    it('should show "99+" for count > 99 (AC#3)', async () => {
      await updateBadge(150);

      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ text: '99+' });
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        color: '#EF4444',
      });
    });

    it('should set correct color #EF4444 (AC#1)', async () => {
      await updateBadge(1);

      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        color: '#EF4444',
      });
    });

    it('should handle exactly 99 correctly', async () => {
      await updateBadge(99);

      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ text: '99' });
    });

    it('should handle exactly 100 correctly (AC#3)', async () => {
      await updateBadge(100);

      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ text: '99+' });
    });
  });

  // ============================================================
  // checkAndUpdateBadge Tests (AC#1, AC#2, AC#4)
  // ============================================================

  describe('checkAndUpdateBadge', () => {
    it('should query countDueWords and update badge', async () => {
      const { countDueWords } = await import('../shared/storage/db');
      vi.mocked(countDueWords).mockResolvedValue(7);

      await checkAndUpdateBadge();

      expect(countDueWords).toHaveBeenCalled();
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ text: '7' });
    });

    it('should clear badge when no due words (AC#2)', async () => {
      const { countDueWords } = await import('../shared/storage/db');
      vi.mocked(countDueWords).mockResolvedValue(0);

      await checkAndUpdateBadge();

      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
    });

    it('should show "99+" when due words > 99 (AC#3)', async () => {
      const { countDueWords } = await import('../shared/storage/db');
      vi.mocked(countDueWords).mockResolvedValue(200);

      await checkAndUpdateBadge();

      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ text: '99+' });
    });

    it('should handle countDueWords error gracefully', async () => {
      const { countDueWords } = await import('../shared/storage/db');
      vi.mocked(countDueWords).mockRejectedValue(new Error('Database error'));

      // Should not throw
      await expect(checkAndUpdateBadge()).resolves.not.toThrow();

      // Should clear badge on error
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
    });

    it('should handle chrome API error gracefully', async () => {
      const { countDueWords } = await import('../shared/storage/db');
      vi.mocked(countDueWords).mockResolvedValue(5);
      mockChrome.action.setBadgeText.mockRejectedValueOnce(new Error('Chrome error'));

      // The first setBadgeText will fail, but the error handler will try to clear the badge
      // In real scenario, both calls might fail, but we're testing the error handling path
      await expect(checkAndUpdateBadge()).resolves.not.toThrow();
    });
  });

  // ============================================================
  // Integration Scenario Tests
  // ============================================================

  describe('integration scenarios', () => {
    it('should correctly update badge after review completion (AC#4 scenario)', async () => {
      const { countDueWords } = await import('../shared/storage/db');

      // Initially 10 due words
      vi.mocked(countDueWords).mockResolvedValue(10);
      await checkAndUpdateBadge();
      expect(mockChrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: '10' });

      // After reviewing one word, 9 due words
      vi.mocked(countDueWords).mockResolvedValue(9);
      await checkAndUpdateBadge();
      expect(mockChrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: '9' });

      // After reviewing all words, 0 due words
      vi.mocked(countDueWords).mockResolvedValue(0);
      await checkAndUpdateBadge();
      expect(mockChrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: '' });
    });

    it('should handle rapid badge updates (AC#4 real-time update)', async () => {
      const { countDueWords } = await import('../shared/storage/db');

      // Simulate rapid updates
      vi.mocked(countDueWords)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(4)
        .mockResolvedValueOnce(3);

      await Promise.all([
        checkAndUpdateBadge(),
        checkAndUpdateBadge(),
        checkAndUpdateBadge(),
      ]);

      // All calls should complete without errors
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledTimes(3);
    });
  });
});
