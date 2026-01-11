/**
 * LingoRecall AI - Navigation Handlers
 * Story 2.3: Jump Back to Source Page
 *
 * 处理跳转到原文页面的逻辑：
 * - 检查目标页面是否已打开
 * - 切换到现有标签页或创建新标签页
 * - 发送高亮请求到 Content Script
 *
 * @module background/handlers/navigationHandlers
 */

import {
  findTabByUrl,
  switchToTab,
  createTab,
  waitForTabLoad,
  sendMessageToTab,
  checkUrlAccessible,
} from '../tabService';

import {
  MessageTypes,
  type Response,
  type JumpToSourcePayload,
  type JumpToSourceResult,
  type HighlightWordPayload,
  type HighlightWordResult,
} from '../../shared/messaging';

import { ErrorCode } from '../../shared/types/errors';

/**
 * 处理跳转到原文页面请求
 * AC1: 切换到已打开的标签页
 * AC2: 创建新标签页打开页面
 * AC3: 处理页面无法访问的情况
 *
 * @param payload - 跳转请求参数
 * @returns 响应结果
 */
export async function handleJumpToSource(
  payload: JumpToSourcePayload
): Promise<Response<JumpToSourceResult>> {
  const {
    sourceUrl,
    xpath,
    textOffset,
    textLength,
    text,
    contextBefore,
    contextAfter,
  } = payload;
  const inaccessibleMessage = 'Source page is inaccessible, but you can still view the full context here';

  console.log('[LingoRecall] handleJumpToSource:', sourceUrl);

  const highlightPayload: HighlightWordPayload = {
    xpath,
    textOffset,
    textLength,
    text,
    contextBefore,
    contextAfter,
  };

  try {
    // 先检查是否已有打开的标签页，避免误伤已打开页面
    const existingTab = await findTabByUrl(sourceUrl);

    // 进行 URL 可访问性检查，避免 404 页面误跳转
    const accessCheck = await checkUrlAccessible(sourceUrl);
    const hasStatus = typeof accessCheck.status === 'number' && accessCheck.status > 0;
    const hasErrorStatus = hasStatus && accessCheck.status >= 400;
    const isUnknownFailure = !accessCheck.ok && !hasStatus;

    if (hasErrorStatus || (isUnknownFailure && !existingTab?.id)) {
      return {
        success: false,
        error: {
          code: ErrorCode.PAGE_INACCESSIBLE,
          message: inaccessibleMessage,
          details: {
            status: accessCheck.status,
            error: accessCheck.error,
          },
        },
      };
    }

    if (existingTab?.id) {
      // AC1: 先确保页面加载完成，再发送高亮消息
      const loaded = await waitForTabLoad(existingTab.id, 10000);
      if (!loaded) {
        return {
          success: false,
          error: {
            code: ErrorCode.PAGE_INACCESSIBLE,
            message: inaccessibleMessage,
            details: { reason: 'timeout' },
          },
        };
      }

      const highlightResponse = await sendMessageToTab<Response<HighlightWordResult>>(existingTab.id, {
        type: MessageTypes.HIGHLIGHT_WORD,
        payload: highlightPayload,
      });

      if (!highlightResponse) {
        return {
          success: false,
          error: {
            code: ErrorCode.PAGE_INACCESSIBLE,
            message: inaccessibleMessage,
            details: { reason: 'no-response' },
          },
        };
      }

      // 高亮请求成功后再切换标签页，保证错误提示可见
      await switchToTab(existingTab.id);

      return {
        success: true,
        data: {
          tabId: existingTab.id,
          status: 'switched',
        },
      };
    }

    // AC2: 创建新标签页（不激活，避免 Popup 立即关闭）
    console.log('[LingoRecall] Creating new tab for:', sourceUrl);
    const newTab = await createTab(sourceUrl, false);

    if (!newTab.id) {
      return {
        success: false,
        error: {
          code: ErrorCode.TAB_ERROR,
          message: 'Failed to create new tab',
        },
      };
    }

    // 等待页面加载
    const loaded = await waitForTabLoad(newTab.id, 10000);

    if (!loaded) {
      return {
        success: false,
        error: {
          code: ErrorCode.PAGE_INACCESSIBLE,
          message: inaccessibleMessage,
          details: { reason: 'timeout' },
        },
      };
    }

    // 发送高亮请求（页面加载完成后）
    // 注意：Content Script 可能需要一些时间初始化，所以延迟发送
    await new Promise((resolve) => setTimeout(resolve, 500));

    const highlightResponse = await sendMessageToTab<Response<HighlightWordResult>>(newTab.id, {
      type: MessageTypes.HIGHLIGHT_WORD,
      payload: highlightPayload,
    });

    if (!highlightResponse) {
      return {
        success: false,
        error: {
          code: ErrorCode.PAGE_INACCESSIBLE,
          message: inaccessibleMessage,
          details: { reason: 'no-response' },
        },
      };
    }

    // 高亮请求成功后再切换标签页
    await switchToTab(newTab.id);

    return {
      success: true,
      data: {
        tabId: newTab.id,
        status: 'created',
      },
    };
  } catch (error) {
    console.error('[LingoRecall] handleJumpToSource error:', error);
    return {
      success: false,
      error: {
        code: ErrorCode.NETWORK_ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}
