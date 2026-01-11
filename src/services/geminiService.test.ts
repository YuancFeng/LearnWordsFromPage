import { describe, it, expect, vi } from 'vitest';

import { __test__ } from './geminiService';

describe('parseAIResponse', () => {
  it('parses JSON embedded in text', () => {
    const response = '```json\n{"meaning":"meaning","pronunciation":"/test/","partOfSpeech":"noun","usage":"example"}\n```';

    expect(__test__.parseAIResponse(response)).toEqual({
      meaning: 'meaning',
      pronunciation: '/test/',
      partOfSpeech: 'noun',
      usage: 'example',
    });
  });

  it('falls back to raw text when JSON is missing', () => {
    const response = 'plain response';

    expect(__test__.parseAIResponse(response)).toEqual({
      meaning: 'plain response',
      pronunciation: '',
      partOfSpeech: '',
      usage: '',
    });
  });
});

describe('withTimeout', () => {
  it('resolves when promise finishes before timeout', async () => {
    await expect(__test__.withTimeout(Promise.resolve('ok'), 50, 'TIMEOUT')).resolves.toBe('ok');
  });

  it('rejects when timeout is exceeded', async () => {
    vi.useFakeTimers();
    const slowPromise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('ok'), 50);
    });

    const result = __test__.withTimeout(slowPromise, 10, 'TIMEOUT');
    const assertion = expect(result).rejects.toThrow('TIMEOUT');

    await vi.advanceTimersByTimeAsync(10);
    await assertion;
    await vi.runOnlyPendingTimersAsync();
    vi.useRealTimers();
  });
});
