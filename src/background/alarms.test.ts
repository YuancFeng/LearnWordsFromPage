/**
 * LingoRecall AI - Alarms Tests
 * Story 3.1 实现 - chrome.alarms 定时检查测试
 *
 * @module background/alarms.test
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  REVIEW_CHECK_ALARM,
  ALARM_PERIOD_MINUTES,
  setupReviewAlarm,
  handleReviewAlarm,
  checkAndUpdateBadge,
} from './alarms';

// Mock chrome API
const mockChrome = {
  alarms: {
    clear: vi.fn().mockResolvedValue(true),
    create: vi.fn(),
    onAlarm: {
      addListener: vi.fn(),
    },
  },
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

describe('alarms', () => {
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
    it('should define REVIEW_CHECK_ALARM as "reviewCheck"', () => {
      expect(REVIEW_CHECK_ALARM).toBe('reviewCheck');
    });

    it('should define ALARM_PERIOD_MINUTES as 60', () => {
      expect(ALARM_PERIOD_MINUTES).toBe(60);
    });
  });

  // ============================================================
  // setupReviewAlarm Tests (AC: #2)
  // ============================================================

  describe('setupReviewAlarm (AC: #2)', () => {
    it('should clear existing alarm before creating new one', async () => {
      await setupReviewAlarm();

      expect(mockChrome.alarms.clear).toHaveBeenCalledWith(REVIEW_CHECK_ALARM);
    });

    it('should create alarm with correct name', async () => {
      await setupReviewAlarm();

      expect(mockChrome.alarms.create).toHaveBeenCalledWith(
        REVIEW_CHECK_ALARM,
        expect.any(Object)
      );
    });

    it('should set alarm period to 60 minutes', async () => {
      await setupReviewAlarm();

      expect(mockChrome.alarms.create).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          periodInMinutes: 60,
        })
      );
    });

    it('should set initial delay to 1 minute', async () => {
      await setupReviewAlarm();

      expect(mockChrome.alarms.create).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          delayInMinutes: 1,
        })
      );
    });
  });

  // ============================================================
  // handleReviewAlarm Tests (AC: #2)
  // ============================================================

  describe('handleReviewAlarm (AC: #2)', () => {
    it('should call checkAndUpdateBadge when alarm name matches', async () => {
      const alarm: chrome.alarms.Alarm = {
        name: REVIEW_CHECK_ALARM,
        scheduledTime: Date.now(),
      };

      // Spy on checkAndUpdateBadge
      const { countDueWords } = await import('../shared/storage/db');
      vi.mocked(countDueWords).mockResolvedValue(5);

      await handleReviewAlarm(alarm);

      expect(countDueWords).toHaveBeenCalled();
    });

    it('should not call checkAndUpdateBadge for other alarms', async () => {
      const alarm: chrome.alarms.Alarm = {
        name: 'otherAlarm',
        scheduledTime: Date.now(),
      };

      const { countDueWords } = await import('../shared/storage/db');
      vi.mocked(countDueWords).mockClear();

      await handleReviewAlarm(alarm);

      expect(countDueWords).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // checkAndUpdateBadge Tests (AC: #2)
  // ============================================================

  describe('checkAndUpdateBadge (AC: #2)', () => {
    it('should set badge text to empty string when no due words', async () => {
      const { countDueWords } = await import('../shared/storage/db');
      vi.mocked(countDueWords).mockResolvedValue(0);

      await checkAndUpdateBadge();

      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
    });

    it('should set badge text to count when there are due words', async () => {
      const { countDueWords } = await import('../shared/storage/db');
      vi.mocked(countDueWords).mockResolvedValue(5);

      await checkAndUpdateBadge();

      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ text: '5' });
    });

    it('should set badge text to "99+" when count exceeds 99', async () => {
      const { countDueWords } = await import('../shared/storage/db');
      vi.mocked(countDueWords).mockResolvedValue(150);

      await checkAndUpdateBadge();

      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ text: '99+' });
    });

    it('should set badge background color (Story 3.2 - #EF4444)', async () => {
      const { countDueWords } = await import('../shared/storage/db');
      vi.mocked(countDueWords).mockResolvedValue(5);

      await checkAndUpdateBadge();

      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        color: '#EF4444',
      });
    });

    it('should handle errors gracefully', async () => {
      const { countDueWords } = await import('../shared/storage/db');
      vi.mocked(countDueWords).mockRejectedValue(new Error('Database error'));

      // Should not throw
      await expect(checkAndUpdateBadge()).resolves.not.toThrow();

      // Should set empty badge on error
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
    });
  });
});
