/**
 * LingoRecall AI - useReview Hook Tests
 * Story 3.3 实现 - 复习 Hook 测试
 *
 * @module hooks/useReview.test
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useReview } from './useReview';
import { MessageTypes } from '../shared/messaging';
import type { WordRecord } from '../shared/messaging';
import { ErrorCode } from '../shared/types/errors';

// Mock chrome API
const mockChrome = {
  runtime: {
    sendMessage: vi.fn(),
    lastError: null as { message?: string } | null,
  },
};

vi.stubGlobal('chrome', mockChrome);

// Mock sendMessage
vi.mock('../shared/messaging', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>;
  return {
    ...original,
    sendMessage: vi.fn(),
  };
});

// 测试用词汇数据
const mockWords: WordRecord[] = [
  {
    id: '1',
    text: 'serendipity',
    meaning: '意外发现美好事物的能力',
    pronunciation: '/ˌserənˈdipəti/',
    partOfSpeech: 'noun',
    exampleSentence: 'It was pure serendipity that we met.',
    sourceUrl: 'https://example.com/article',
    sourceTitle: 'Test Article',
    xpath: '/html/body/p[1]',
    textOffset: 0,
    contextBefore: 'It was pure ',
    contextAfter: ' that we met.',
    createdAt: Date.now() - 86400000,
    nextReviewAt: Date.now() - 1000,
    reviewCount: 1,
    easeFactor: 2.5,
    interval: 1,
    tagIds: [],
  },
  {
    id: '2',
    text: 'ephemeral',
    meaning: '短暂的',
    pronunciation: '/ɪˈfemərəl/',
    partOfSpeech: 'adjective',
    exampleSentence: 'The ephemeral beauty of cherry blossoms.',
    sourceUrl: 'https://example.com/article2',
    sourceTitle: 'Test Article 2',
    xpath: '/html/body/p[2]',
    textOffset: 0,
    contextBefore: 'The ',
    contextAfter: ' beauty.',
    createdAt: Date.now() - 172800000,
    nextReviewAt: Date.now() - 500,
    reviewCount: 0,
    easeFactor: 2.5,
    interval: 1,
    tagIds: [],
  },
];

describe('useReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should start with loading state', async () => {
      const { sendMessage } = await import('../shared/messaging');
      vi.mocked(sendMessage).mockResolvedValue({
        success: true,
        data: [],
      });

      const { result } = renderHook(() => useReview());

      // 初始状态应该是 loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.dueWords).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should fetch due words on mount', async () => {
      const { sendMessage } = await import('../shared/messaging');
      vi.mocked(sendMessage).mockResolvedValue({
        success: true,
        data: mockWords,
      });

      const { result } = renderHook(() => useReview());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(sendMessage).toHaveBeenCalledWith(
        MessageTypes.GET_DUE_WORDS,
        undefined
      );
      expect(result.current.dueWords).toEqual(mockWords);
    });
  });

  describe('error handling', () => {
    it('should set error when fetch fails', async () => {
      const { sendMessage } = await import('../shared/messaging');
      vi.mocked(sendMessage).mockResolvedValue({
        success: false,
        error: { code: ErrorCode.STORAGE_ERROR, message: 'Database error' },
      });

      const { result } = renderHook(() => useReview());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Database error');
      expect(result.current.dueWords).toEqual([]);
    });

    it('should handle thrown errors', async () => {
      const { sendMessage } = await import('../shared/messaging');
      vi.mocked(sendMessage).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useReview());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
    });
  });

  describe('submitReview', () => {
    it('should submit review result when remembered', async () => {
      const { sendMessage } = await import('../shared/messaging');
      vi.mocked(sendMessage)
        .mockResolvedValueOnce({ success: true, data: mockWords })
        .mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useReview());

      await waitFor(() => {
        expect(result.current.dueWords.length).toBeGreaterThan(0);
      });

      let success: boolean = false;
      await act(async () => {
        success = await result.current.submitReview('1', 'remembered');
      });

      expect(success).toBe(true);
      expect(sendMessage).toHaveBeenCalledWith(
        MessageTypes.REVIEW_WORD,
        { wordId: '1', result: 'remembered' }
      );
    });

    it('should submit review result when forgotten', async () => {
      const { sendMessage } = await import('../shared/messaging');
      vi.mocked(sendMessage)
        .mockResolvedValueOnce({ success: true, data: mockWords })
        .mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useReview());

      await waitFor(() => {
        expect(result.current.dueWords.length).toBeGreaterThan(0);
      });

      await act(async () => {
        await result.current.submitReview('1', 'forgotten');
      });

      expect(sendMessage).toHaveBeenCalledWith(
        MessageTypes.REVIEW_WORD,
        { wordId: '1', result: 'forgotten' }
      );
    });

    it('should return false when submit fails', async () => {
      const { sendMessage } = await import('../shared/messaging');
      vi.mocked(sendMessage)
        .mockResolvedValueOnce({ success: true, data: mockWords })
        .mockResolvedValueOnce({
          success: false,
          error: { code: ErrorCode.STORAGE_ERROR, message: 'Submit failed' },
        });

      const { result } = renderHook(() => useReview());

      await waitFor(() => {
        expect(result.current.dueWords.length).toBeGreaterThan(0);
      });

      let success: boolean = true;
      await act(async () => {
        success = await result.current.submitReview('1', 'remembered');
      });

      expect(success).toBe(false);
    });
  });

  describe('refresh', () => {
    it('should refetch due words', async () => {
      const { sendMessage } = await import('../shared/messaging');
      vi.mocked(sendMessage)
        .mockResolvedValueOnce({ success: true, data: mockWords })
        .mockResolvedValueOnce({ success: true, data: [mockWords[0]] });

      const { result } = renderHook(() => useReview());

      await waitFor(() => {
        expect(result.current.dueWords.length).toBe(2);
      });

      await act(async () => {
        await result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.dueWords.length).toBe(1);
      });
    });
  });
});
