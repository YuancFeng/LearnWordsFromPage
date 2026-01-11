/**
 * LingoRecall AI - Ebbinghaus Integration Tests
 * Story 3.1 集成测试 - 验证完整的复习时间计算流程
 *
 * @module shared/utils/ebbinghaus.integration.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  REVIEW_INTERVALS,
  DAY_MS,
  initializeReviewParams,
} from './ebbinghaus';
import { saveWord, getAllWords } from '../storage/wordService';
import { countDueWords, deleteDatabase, getDatabase, withTransaction, STORES } from '../storage/db';
import type { SaveWordPayload, WordRecord } from '../messaging/types';

// Helper function to create test word payload
function createTestWordPayload(overrides: Partial<SaveWordPayload> = {}): SaveWordPayload {
  return {
    text: 'test',
    meaning: 'test meaning',
    pronunciation: 'test',
    partOfSpeech: 'noun',
    exampleSentence: 'This is a test.',
    sourceUrl: `https://example.com/${Date.now()}/${Math.random()}`,
    sourceTitle: 'Test Page',
    xpath: `/html/body/p[${Math.random()}]`,
    textOffset: 0,
    contextBefore: 'before',
    contextAfter: 'after',
    ...overrides,
  };
}

describe('Ebbinghaus Integration Tests - Story 3.1', () => {
  beforeEach(async () => {
    // Clean database before each test
    await deleteDatabase();
    await getDatabase();
  });

  afterEach(async () => {
    await deleteDatabase();
  });

  // ============================================================
  // AC1: 新词汇初始化复习参数
  // ============================================================

  describe('AC1: 新词汇保存后复习参数正确初始化', () => {
    it('should initialize nextReviewAt to approximately current time + 1 day when saving new word', async () => {
      const beforeSave = Date.now();
      const payload = createTestWordPayload();

      const result = await saveWord(payload);
      expect(result.success).toBe(true);

      const words = await getAllWords();
      expect(words.success).toBe(true);
      expect(words.data).toHaveLength(1);

      const savedWord = words.data![0];
      const afterSave = Date.now();

      // AC1: nextReviewAt 为当前时间 + 1 天 (86400000ms)
      // Allow some tolerance for test execution time
      expect(savedWord.nextReviewAt).toBeGreaterThanOrEqual(beforeSave + DAY_MS);
      expect(savedWord.nextReviewAt).toBeLessThanOrEqual(afterSave + DAY_MS);
    });

    it('should initialize reviewCount to 0 when saving new word', async () => {
      const payload = createTestWordPayload();

      await saveWord(payload);
      const words = await getAllWords();

      const savedWord = words.data![0];

      // AC1: reviewCount 初始化为 0
      expect(savedWord.reviewCount).toBe(0);
    });

    it('should set interval to 1 when saving new word', async () => {
      const payload = createTestWordPayload();

      await saveWord(payload);
      const words = await getAllWords();

      const savedWord = words.data![0];

      // AC1: interval 设置为 1
      expect(savedWord.interval).toBe(1);
    });

    it('should use initializeReviewParams values consistently', async () => {
      const expectedParams = initializeReviewParams();
      const payload = createTestWordPayload();

      await saveWord(payload);
      const words = await getAllWords();

      const savedWord = words.data![0];

      // Verify reviewCount and interval match exactly
      expect(savedWord.reviewCount).toBe(expectedParams.reviewCount);
      expect(savedWord.interval).toBe(expectedParams.interval);
    });
  });

  // ============================================================
  // AC2: 定时检查待复习词汇
  // ============================================================

  describe('AC2: 待复习词汇查询', () => {
    it('should return 0 when no words are due for review', async () => {
      // Save a word (will be due tomorrow)
      const payload = createTestWordPayload();
      await saveWord(payload);

      // Count should be 0 (word is not yet due)
      const count = await countDueWords();
      expect(count).toBe(0);
    });

    it('should return correct count when words are due for review (using direct DB manipulation)', async () => {
      // Save a word
      const payload = createTestWordPayload();
      const result = await saveWord(payload);
      expect(result.success).toBe(true);

      // Manually update the word to be due (set nextReviewAt to past)
      const db = await getDatabase();
      const words = await getAllWords();
      const wordToUpdate = words.data![0];

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORES.words, 'readwrite');
        const store = tx.objectStore(STORES.words);
        const updated: WordRecord = {
          ...wordToUpdate,
          nextReviewAt: Date.now() - 1000, // Set to past
        };
        const request = store.put(updated);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      // Count should now be 1 (word is due)
      const count = await countDueWords();
      expect(count).toBe(1);
    });

    it('should count multiple due words correctly', async () => {
      // Save multiple words
      for (let i = 0; i < 5; i++) {
        const payload = createTestWordPayload({
          text: `word${i}`,
          sourceUrl: `https://example.com/page${i}`,
          xpath: `/html/body/p[${i}]`,
        });
        await saveWord(payload);
      }

      // Verify all saved
      const words = await getAllWords();
      expect(words.data).toHaveLength(5);

      // Initially, no words due
      let count = await countDueWords();
      expect(count).toBe(0);

      // Manually make all words due
      const db = await getDatabase();
      for (const word of words.data!) {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORES.words, 'readwrite');
          const store = tx.objectStore(STORES.words);
          const updated: WordRecord = {
            ...word,
            nextReviewAt: Date.now() - 1000,
          };
          const request = store.put(updated);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }

      // All 5 words should be due
      count = await countDueWords();
      expect(count).toBe(5);
    });

    it('should handle edge case: no words in database', async () => {
      const count = await countDueWords();
      expect(count).toBe(0);
    });
  });

  // ============================================================
  // AC3: 复习间隔配置
  // ============================================================

  describe('AC3: 复习间隔配置验证', () => {
    it('should use correct review intervals sequence', () => {
      // AC3: 间隔序列为 [1, 3, 7, 15, 30, 60, 120] 天
      expect(REVIEW_INTERVALS).toEqual([1, 3, 7, 15, 30, 60, 120]);
    });

    it('should use first interval (1 day) for new words', async () => {
      const payload = createTestWordPayload();
      await saveWord(payload);
      const words = await getAllWords();

      const savedWord = words.data![0];

      // First interval is 1 day
      expect(savedWord.interval).toBe(REVIEW_INTERVALS[0]);
      expect(savedWord.interval).toBe(1);
    });

    it('should have maximum interval of 120 days', () => {
      const maxInterval = Math.max(...REVIEW_INTERVALS);
      expect(maxInterval).toBe(120);
    });
  });

  // ============================================================
  // Edge Cases
  // ============================================================

  describe('边界情况测试', () => {
    it('should handle large number of words', async () => {
      // Save 20 words (reduced from 100 for faster test)
      for (let i = 0; i < 20; i++) {
        const payload = createTestWordPayload({
          text: `word${i}`,
          sourceUrl: `https://example.com/page${i}`,
          xpath: `/html/body/p[${i}]`,
        });
        await saveWord(payload);
      }

      const words = await getAllWords();
      expect(words.data).toHaveLength(20);

      // Make all words due
      const db = await getDatabase();
      for (const word of words.data!) {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORES.words, 'readwrite');
          const store = tx.objectStore(STORES.words);
          const updated: WordRecord = {
            ...word,
            nextReviewAt: Date.now() - 1000,
          };
          const request = store.put(updated);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }

      // Count should be 20
      const count = await countDueWords();
      expect(count).toBe(20);
    });
  });
});
