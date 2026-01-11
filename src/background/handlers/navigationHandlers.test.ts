import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handleJumpToSource } from './navigationHandlers';
import { ErrorCode } from '../../shared/types/errors';
import type { JumpToSourcePayload } from '../../shared/messaging';
import {
  checkUrlAccessible,
  createTab,
  findTabByUrl,
  sendMessageToTab,
  switchToTab,
  waitForTabLoad,
} from '../tabService';

vi.mock('../tabService', () => ({
  findTabByUrl: vi.fn(),
  switchToTab: vi.fn(),
  createTab: vi.fn(),
  waitForTabLoad: vi.fn(),
  sendMessageToTab: vi.fn(),
  checkUrlAccessible: vi.fn(),
}));

const payload: JumpToSourcePayload = {
  sourceUrl: 'https://example.com/article',
  sourceTitle: 'Example Article',
  xpath: '/html/body/div[1]/p[2]',
  textOffset: 5,
  textLength: 7,
  text: 'context',
  contextBefore: 'This is a ',
  contextAfter: ' example sentence.',
};

describe('handleJumpToSource', () => {
  beforeEach(() => {
    vi.mocked(findTabByUrl).mockReset();
    vi.mocked(switchToTab).mockReset();
    vi.mocked(createTab).mockReset();
    vi.mocked(waitForTabLoad).mockReset();
    vi.mocked(sendMessageToTab).mockReset();
    vi.mocked(checkUrlAccessible).mockReset();

    vi.mocked(checkUrlAccessible).mockResolvedValue({ ok: true, status: 200 });
    vi.mocked(waitForTabLoad).mockResolvedValue(true);
    vi.mocked(sendMessageToTab).mockResolvedValue({ success: true });
  });

  it('switches to existing tab after highlight request succeeds', async () => {
    vi.mocked(findTabByUrl).mockResolvedValue({ id: 1, url: payload.sourceUrl } as chrome.tabs.Tab);

    const response = await handleJumpToSource(payload);

    expect(response.success).toBe(true);
    expect(response.data?.status).toBe('switched');
    expect(sendMessageToTab).toHaveBeenCalled();
    expect(switchToTab).toHaveBeenCalledWith(1);

    const sendOrder = vi.mocked(sendMessageToTab).mock.invocationCallOrder[0];
    const switchOrder = vi.mocked(switchToTab).mock.invocationCallOrder[0];
    expect(sendOrder).toBeLessThan(switchOrder);
  });

  it('creates a background tab and activates it after highlight succeeds', async () => {
    vi.mocked(findTabByUrl).mockResolvedValue(null);
    vi.mocked(createTab).mockResolvedValue({ id: 2, url: payload.sourceUrl } as chrome.tabs.Tab);

    const response = await handleJumpToSource(payload);

    expect(response.success).toBe(true);
    expect(response.data?.status).toBe('created');
    expect(createTab).toHaveBeenCalledWith(payload.sourceUrl, false);
    expect(switchToTab).toHaveBeenCalledWith(2);
  });

  it('returns PAGE_INACCESSIBLE when url check reports 404', async () => {
    vi.mocked(findTabByUrl).mockResolvedValue(null);
    vi.mocked(checkUrlAccessible).mockResolvedValue({ ok: false, status: 404 });

    const response = await handleJumpToSource(payload);

    expect(response.success).toBe(false);
    expect(response.error?.code).toBe(ErrorCode.PAGE_INACCESSIBLE);
    expect(createTab).not.toHaveBeenCalled();
  });

  it('returns PAGE_INACCESSIBLE when highlight message fails on existing tab', async () => {
    vi.mocked(findTabByUrl).mockResolvedValue({ id: 1, url: payload.sourceUrl } as chrome.tabs.Tab);
    vi.mocked(sendMessageToTab).mockResolvedValue(null);

    const response = await handleJumpToSource(payload);

    expect(response.success).toBe(false);
    expect(response.error?.code).toBe(ErrorCode.PAGE_INACCESSIBLE);
    expect(switchToTab).not.toHaveBeenCalled();
  });
});
