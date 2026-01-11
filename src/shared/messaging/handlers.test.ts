import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerHandler, initMessageRouter } from './handlers';
import { MessageTypes, type Message } from './types';
import { ErrorCode } from '../types/errors';

const analyzePayload = {
  text: 'word',
  context: 'context',
  url: 'https://example.com',
  xpath: '/html/body',
};

describe('messaging handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('routes message to registered handler', async () => {
    const handlerResponse = {
      success: true,
      data: {
        meaning: 'meaning',
        pronunciation: 'pronunciation',
        partOfSpeech: 'noun',
        usage: 'usage',
      },
    };
    const handler = vi.fn().mockResolvedValue(handlerResponse);

    registerHandler(MessageTypes.ANALYZE_WORD, handler);
    initMessageRouter();

    const addListenerMock = chrome.runtime.onMessage.addListener as unknown as {
      mock: { calls: Array<[((message: Message, sender: chrome.runtime.MessageSender, sendResponse: (response: unknown) => void) => boolean)]> };
    };
    const listener = addListenerMock.mock.calls[0][0];
    const sendResponse = vi.fn();

    const keepOpen = listener(
      {
        type: MessageTypes.ANALYZE_WORD,
        payload: analyzePayload,
        requestId: 'req-1',
      } as Message,
      { id: chrome.runtime.id } as chrome.runtime.MessageSender,
      sendResponse
    );

    expect(keepOpen).toBe(true);
    await Promise.resolve();

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ type: MessageTypes.ANALYZE_WORD }),
      expect.any(Object)
    );
    expect(sendResponse).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, requestId: 'req-1' })
    );
  });

  it('rejects invalid message format', () => {
    initMessageRouter();

    const addListenerMock = chrome.runtime.onMessage.addListener as unknown as {
      mock: { calls: Array<[((message: Message, sender: chrome.runtime.MessageSender, sendResponse: (response: unknown) => void) => boolean)]> };
    };
    const listener = addListenerMock.mock.calls[0][0];
    const sendResponse = vi.fn();

    const keepOpen = listener(
      {} as unknown as Message,
      { id: chrome.runtime.id } as chrome.runtime.MessageSender,
      sendResponse
    );

    expect(keepOpen).toBe(false);
    expect(sendResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: ErrorCode.INVALID_INPUT }),
      })
    );
  });

  it('rejects unknown message type', () => {
    initMessageRouter();

    const addListenerMock = chrome.runtime.onMessage.addListener as unknown as {
      mock: { calls: Array<[((message: Message, sender: chrome.runtime.MessageSender, sendResponse: (response: unknown) => void) => boolean)]> };
    };
    const listener = addListenerMock.mock.calls[0][0];
    const sendResponse = vi.fn();

    const keepOpen = listener(
      {
        type: 'UNKNOWN_TYPE',
        payload: {},
        requestId: 'req-2',
      } as unknown as Message,
      { id: chrome.runtime.id } as chrome.runtime.MessageSender,
      sendResponse
    );

    expect(keepOpen).toBe(false);
    expect(sendResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: ErrorCode.HANDLER_NOT_FOUND }),
        requestId: 'req-2',
      })
    );
  });
});
