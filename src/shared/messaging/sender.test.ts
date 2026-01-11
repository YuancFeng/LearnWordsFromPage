import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendMessage, sendToTab } from './sender';
import { MessageTypes } from './types';
import { ErrorCode } from '../types/errors';

const analyzePayload = {
  text: 'word',
  context: 'context',
  url: 'https://example.com',
  xpath: '/html/body',
};

describe('messaging sender', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('sendMessage', () => {
    it('returns response from runtime', async () => {
      const response = {
        success: true,
        data: {
          meaning: 'meaning',
          pronunciation: 'pronunciation',
          partOfSpeech: 'noun',
          usage: 'usage',
        },
      };

      vi.spyOn(
        chrome.runtime as unknown as { sendMessage: (...args: unknown[]) => unknown },
        'sendMessage'
      ).mockImplementation((_message, callback) => {
        if (typeof callback === 'function') {
          callback(response);
        }
        return undefined;
      });

      const result = await sendMessage(MessageTypes.ANALYZE_WORD, analyzePayload, 1000);
      expect(result).toEqual(response);
    });

    it('returns timeout when no response arrives', async () => {
      vi.useFakeTimers();
      vi.spyOn(
        chrome.runtime as unknown as { sendMessage: (...args: unknown[]) => unknown },
        'sendMessage'
      ).mockImplementation(() => undefined);

      const promise = sendMessage(MessageTypes.ANALYZE_WORD, analyzePayload, 10);
      await vi.advanceTimersByTimeAsync(11);
      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.TIMEOUT);
    });
  });

  describe('sendToTab', () => {
    it('returns response from tab', async () => {
      const response = { success: true, data: { success: true } };
      vi.spyOn(
        chrome.tabs as unknown as { sendMessage: (...args: unknown[]) => unknown },
        'sendMessage'
      ).mockImplementation((_tabId, _message, callback) => {
        if (typeof callback === 'function') {
          callback(response);
        }
        return undefined;
      });

      const result = await sendToTab(1, MessageTypes.HIGHLIGHT_TEXT, {
        xpath: '/html/body',
        textOffset: 0,
        textLength: 4,
        text: 'test',
        contextBefore: '',
        contextAfter: '',
      });

      expect(result).toEqual(response);
    });
  });
});
