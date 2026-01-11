import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSearch } from './useSearch';
import { sendMessage, MessageTypes } from '../shared/messaging';
import { ErrorCode } from '../shared/types/errors';
import type { WordRecord } from '../shared/messaging';

vi.mock('../shared/messaging', () => ({
  sendMessage: vi.fn(),
  MessageTypes: { GET_WORDS: 'GET_WORDS' },
}));

const sendMessageMock = vi.mocked(sendMessage);

describe('useSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sendMessageMock.mockResolvedValue({ success: true, data: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
    sendMessageMock.mockReset();
  });

  it('debounces search requests by 300ms', async () => {
    const { result } = renderHook(() => useSearch());

    await act(async () => {
      await Promise.resolve();
    });

    sendMessageMock.mockClear();

    act(() => {
      result.current.setSearchQuery('alpha');
    });

    act(() => {
      vi.advanceTimersByTime(299);
    });

    expect(sendMessageMock).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(sendMessageMock).toHaveBeenNthCalledWith(1, MessageTypes.GET_WORDS, { searchQuery: 'alpha' });
    expect(sendMessageMock).toHaveBeenNthCalledWith(2, MessageTypes.GET_WORDS, {});
  });

  it('initializes with empty search query', async () => {
    const { result } = renderHook(() => useSearch());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.searchQuery).toBe('');
    expect(result.current.hasActiveSearch).toBe(false);
  });

  it('clears search and resets query', async () => {
    const { result } = renderHook(() => useSearch());

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.setSearchQuery('test');
    });

    expect(result.current.searchQuery).toBe('test');
    expect(result.current.hasActiveSearch).toBe(true);

    sendMessageMock.mockClear();

    act(() => {
      result.current.clearSearch();
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.searchQuery).toBe('');
    expect(result.current.hasActiveSearch).toBe(false);
    expect(sendMessageMock).toHaveBeenCalledWith(MessageTypes.GET_WORDS, { searchQuery: '' });
  });

  it('updates match and total counts from response', async () => {
    const mockWords: WordRecord[] = [
      {
        id: '1',
        text: 'apple',
        meaning: '苹果',
        pronunciation: '',
        partOfSpeech: '',
        exampleSentence: '',
        sourceUrl: '',
        sourceTitle: '',
        xpath: '',
        textOffset: 0,
        contextBefore: '',
        contextAfter: '',
        createdAt: 1,
        nextReviewAt: 1,
        reviewCount: 0,
        easeFactor: 2.5,
        interval: 1,
        tagIds: [],
      },
      {
        id: '2',
        text: 'banana',
        meaning: '香蕉',
        pronunciation: '',
        partOfSpeech: '',
        exampleSentence: '',
        sourceUrl: '',
        sourceTitle: '',
        xpath: '',
        textOffset: 0,
        contextBefore: '',
        contextAfter: '',
        createdAt: 2,
        nextReviewAt: 2,
        reviewCount: 0,
        easeFactor: 2.5,
        interval: 1,
        tagIds: [],
      },
    ];

    sendMessageMock.mockResolvedValue({ success: true, data: mockWords });

    const { result } = renderHook(() => useSearch());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.matchCount).toBe(2);
    expect(result.current.totalCount).toBe(2);
    expect(result.current.searchResults).toEqual(mockWords);
  });

  it('handles error response', async () => {
    sendMessageMock.mockResolvedValue({
      success: false,
      error: { code: ErrorCode.STORAGE_ERROR, message: 'Database error' },
    });

    const { result } = renderHook(() => useSearch());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.error).toBe('Database error');
    expect(result.current.searchResults).toEqual([]);
    expect(result.current.matchCount).toBe(0);
  });

  it('ignores stale search responses and keeps latest query result', async () => {
    const { result } = renderHook(() => useSearch());

    await act(async () => {
      await Promise.resolve();
    });

    sendMessageMock.mockClear();

    const resolveFirst: Array<(value: { success: boolean; data: WordRecord[] }) => void> = [];
    const resolveSecond: Array<(value: { success: boolean; data: WordRecord[] }) => void> = [];

    sendMessageMock.mockImplementation((_, payload) => {
      const queryPayload = payload as { searchQuery?: string };
      if (queryPayload.searchQuery === 'first') {
        return new Promise((resolve) => resolveFirst.push(resolve));
      }
      if (queryPayload.searchQuery === 'second') {
        return new Promise((resolve) => resolveSecond.push(resolve));
      }
      return Promise.resolve({ success: true, data: [] });
    });

    act(() => {
      result.current.setSearchQuery('first');
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    act(() => {
      result.current.setSearchQuery('second');
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    const secondWords: WordRecord[] = [
      {
        id: 'b',
        text: 'second',
        meaning: 'second',
        pronunciation: '',
        partOfSpeech: '',
        exampleSentence: '',
        sourceUrl: '',
        sourceTitle: '',
        xpath: '',
        textOffset: 0,
        contextBefore: '',
        contextAfter: '',
        createdAt: 2,
        nextReviewAt: 2,
        reviewCount: 0,
        easeFactor: 2.5,
        interval: 1,
        tagIds: [],
      },
    ];

    const firstWords: WordRecord[] = [
      {
        id: 'a',
        text: 'first',
        meaning: 'first',
        pronunciation: '',
        partOfSpeech: '',
        exampleSentence: '',
        sourceUrl: '',
        sourceTitle: '',
        xpath: '',
        textOffset: 0,
        contextBefore: '',
        contextAfter: '',
        createdAt: 1,
        nextReviewAt: 1,
        reviewCount: 0,
        easeFactor: 2.5,
        interval: 1,
        tagIds: [],
      },
    ];

    await act(async () => {
      resolveSecond[0]({ success: true, data: secondWords });
      await Promise.resolve();
    });

    await act(async () => {
      resolveFirst[0]({ success: true, data: firstWords });
      await Promise.resolve();
    });

    expect(result.current.searchResults).toEqual(secondWords);
  });
});
