/**
 * LingoRecall AI - Word Handlers Tests
 * Story 3.4 实现 - 复习结果反馈测试
 *
 * @module background/handlers/wordHandlers.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleReviewWord } from './wordHandlers';
import * as storage from '../../shared/storage';
import * as badge from '../badge';
import { DAY_MS, REVIEW_INTERVALS } from '../../shared/utils/ebbinghaus';

// Mock dependencies
vi.mock('../../shared/storage', () => ({
  getWordById: vi.fn(),
  updateWord: vi.fn(),
}));

vi.mock('../badge', () => ({
  checkAndUpdateBadge: vi.fn(),
}));

describe('wordHandlers', () => {
  describe('handleReviewWord', () => {
    const mockWord = {
      id: 'test-word-id',
      text: 'test',
      meaning: '测试',
      pronunciation: 'test',
      partOfSpeech: 'noun',
      exampleSentence: 'This is a test.',
      sourceUrl: 'https://example.com',
      sourceTitle: 'Example',
      xpath: '/html/body/div[1]/p',
      textOffset: 0,
      contextBefore: '',
      contextAfter: '',
      createdAt: Date.now(),
      nextReviewAt: Date.now() + DAY_MS,
      reviewCount: 2,
      easeFactor: 2.5,
      interval: 7,
      tagIds: [],
    };

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-10T12:00:00Z'));
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    describe('when user remembers the word (AC1)', () => {
      it('should upgrade reviewCount and interval', async () => {
        vi.mocked(storage.getWordById).mockResolvedValue({
          success: true,
          data: { ...mockWord, reviewCount: 2, interval: 7 },
        });
        vi.mocked(storage.updateWord).mockResolvedValue({ success: true });
        vi.mocked(badge.checkAndUpdateBadge).mockResolvedValue();

        const result = await handleReviewWord({
          wordId: 'test-word-id',
          result: 'remembered',
        });

        expect(result.success).toBe(true);
        expect(result.data?.word.reviewCount).toBe(3);
        expect(result.data?.word.interval).toBe(15); // REVIEW_INTERVALS[3]
        expect(result.data?.word.nextReviewAt).toBe(Date.now() + 15 * DAY_MS);

        expect(storage.updateWord).toHaveBeenCalledWith('test-word-id', {
          nextReviewAt: Date.now() + 15 * DAY_MS,
          reviewCount: 3,
          interval: 15,
        });
      });

      it('should trigger badge update', async () => {
        vi.mocked(storage.getWordById).mockResolvedValue({
          success: true,
          data: mockWord,
        });
        vi.mocked(storage.updateWord).mockResolvedValue({ success: true });
        vi.mocked(badge.checkAndUpdateBadge).mockResolvedValue();

        await handleReviewWord({
          wordId: 'test-word-id',
          result: 'remembered',
        });

        // Badge update is async, so we need to wait for it
        await vi.runAllTimersAsync();
        expect(badge.checkAndUpdateBadge).toHaveBeenCalled();
      });
    });

    describe('when user forgets the word (AC2)', () => {
      it('should reset reviewCount to 0 and interval to 1', async () => {
        vi.mocked(storage.getWordById).mockResolvedValue({
          success: true,
          data: { ...mockWord, reviewCount: 5, interval: 60 },
        });
        vi.mocked(storage.updateWord).mockResolvedValue({ success: true });
        vi.mocked(badge.checkAndUpdateBadge).mockResolvedValue();

        const result = await handleReviewWord({
          wordId: 'test-word-id',
          result: 'forgotten',
        });

        expect(result.success).toBe(true);
        expect(result.data?.word.reviewCount).toBe(0);
        expect(result.data?.word.interval).toBe(1); // REVIEW_INTERVALS[0]
        expect(result.data?.word.nextReviewAt).toBe(Date.now() + 1 * DAY_MS);

        expect(storage.updateWord).toHaveBeenCalledWith('test-word-id', {
          nextReviewAt: Date.now() + 1 * DAY_MS,
          reviewCount: 0,
          interval: 1,
        });
      });

      it('should reset from max reviewCount to 0', async () => {
        vi.mocked(storage.getWordById).mockResolvedValue({
          success: true,
          data: { ...mockWord, reviewCount: 6, interval: 120 },
        });
        vi.mocked(storage.updateWord).mockResolvedValue({ success: true });
        vi.mocked(badge.checkAndUpdateBadge).mockResolvedValue();

        const result = await handleReviewWord({
          wordId: 'test-word-id',
          result: 'forgotten',
        });

        expect(result.success).toBe(true);
        expect(result.data?.word.reviewCount).toBe(0);
        expect(result.data?.word.interval).toBe(1);
      });
    });

    describe('maximum interval limit (AC3)', () => {
      it('should stay at max reviewCount 6 when already at max', async () => {
        vi.mocked(storage.getWordById).mockResolvedValue({
          success: true,
          data: { ...mockWord, reviewCount: 6, interval: 120 },
        });
        vi.mocked(storage.updateWord).mockResolvedValue({ success: true });
        vi.mocked(badge.checkAndUpdateBadge).mockResolvedValue();

        const result = await handleReviewWord({
          wordId: 'test-word-id',
          result: 'remembered',
        });

        expect(result.success).toBe(true);
        expect(result.data?.word.reviewCount).toBe(6); // 不再增加
        expect(result.data?.word.interval).toBe(120); // 保持最大间隔
        expect(result.data?.word.nextReviewAt).toBe(Date.now() + 120 * DAY_MS);
      });

      it('should upgrade from reviewCount 5 to 6', async () => {
        vi.mocked(storage.getWordById).mockResolvedValue({
          success: true,
          data: { ...mockWord, reviewCount: 5, interval: 60 },
        });
        vi.mocked(storage.updateWord).mockResolvedValue({ success: true });
        vi.mocked(badge.checkAndUpdateBadge).mockResolvedValue();

        const result = await handleReviewWord({
          wordId: 'test-word-id',
          result: 'remembered',
        });

        expect(result.success).toBe(true);
        expect(result.data?.word.reviewCount).toBe(6);
        expect(result.data?.word.interval).toBe(120);
      });
    });

    describe('error handling', () => {
      it('should return NOT_FOUND error when word does not exist', async () => {
        vi.mocked(storage.getWordById).mockResolvedValue({
          success: true,
          data: null,
        });

        const result = await handleReviewWord({
          wordId: 'non-existent-id',
          result: 'remembered',
        });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('NOT_FOUND');
      });

      it('should return error when getWordById fails', async () => {
        vi.mocked(storage.getWordById).mockResolvedValue({
          success: false,
          error: { code: 'STORAGE_ERROR', message: 'Database error' },
        });

        const result = await handleReviewWord({
          wordId: 'test-word-id',
          result: 'remembered',
        });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('NOT_FOUND');
      });

      it('should return error when updateWord fails', async () => {
        vi.mocked(storage.getWordById).mockResolvedValue({
          success: true,
          data: mockWord,
        });
        vi.mocked(storage.updateWord).mockResolvedValue({
          success: false,
          error: { code: 'STORAGE_ERROR', message: 'Update failed' },
        });

        const result = await handleReviewWord({
          wordId: 'test-word-id',
          result: 'remembered',
        });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('STORAGE_ERROR');
      });

      it('should handle exception gracefully', async () => {
        vi.mocked(storage.getWordById).mockRejectedValue(new Error('Unexpected error'));

        const result = await handleReviewWord({
          wordId: 'test-word-id',
          result: 'remembered',
        });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('STORAGE_ERROR');
        expect(result.error?.message).toBe('Unexpected error');
      });

      it('should not block on badge update failure', async () => {
        vi.mocked(storage.getWordById).mockResolvedValue({
          success: true,
          data: mockWord,
        });
        vi.mocked(storage.updateWord).mockResolvedValue({ success: true });
        vi.mocked(badge.checkAndUpdateBadge).mockRejectedValue(new Error('Badge error'));

        // Should complete successfully even if badge update fails
        const result = await handleReviewWord({
          wordId: 'test-word-id',
          result: 'remembered',
        });

        expect(result.success).toBe(true);
      });
    });

    describe('full review sequence', () => {
      it('should correctly progress through all intervals when remembered', async () => {
        const expectedSequence = [
          { reviewCount: 0, interval: 1, nextReviewCount: 1, nextInterval: 3 },
          { reviewCount: 1, interval: 3, nextReviewCount: 2, nextInterval: 7 },
          { reviewCount: 2, interval: 7, nextReviewCount: 3, nextInterval: 15 },
          { reviewCount: 3, interval: 15, nextReviewCount: 4, nextInterval: 30 },
          { reviewCount: 4, interval: 30, nextReviewCount: 5, nextInterval: 60 },
          { reviewCount: 5, interval: 60, nextReviewCount: 6, nextInterval: 120 },
          { reviewCount: 6, interval: 120, nextReviewCount: 6, nextInterval: 120 }, // 保持最大值
        ];

        for (const seq of expectedSequence) {
          vi.mocked(storage.getWordById).mockResolvedValue({
            success: true,
            data: { ...mockWord, reviewCount: seq.reviewCount, interval: seq.interval },
          });
          vi.mocked(storage.updateWord).mockResolvedValue({ success: true });
          vi.mocked(badge.checkAndUpdateBadge).mockResolvedValue();

          const result = await handleReviewWord({
            wordId: 'test-word-id',
            result: 'remembered',
          });

          expect(result.data?.word.reviewCount).toBe(seq.nextReviewCount);
          expect(result.data?.word.interval).toBe(seq.nextInterval);
        }
      });
    });
  });
});
