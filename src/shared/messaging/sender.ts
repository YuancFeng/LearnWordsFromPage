/**
 * LingoRecall AI - Message Sender Utilities
 * 消息发送工具，支持 Content Script 和 Service Worker 的双向通信
 */

import { ErrorCode } from '../types/errors';
import type { Message, MessageType, PayloadMap, Response, ResponseDataMap } from './types';

// 默认超时时间（毫秒）
const DEFAULT_TIMEOUT = 30000;

/**
 * 检查扩展上下文是否仍然有效
 * 当扩展被重新加载或更新时，旧的 content script 上下文会失效
 */
function isExtensionContextValid(): boolean {
  try {
    // 尝试访问 chrome.runtime.id，如果上下文失效会抛出错误
    // 同时检查 chrome.runtime 本身是否存在
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      return false;
    }
    return Boolean(chrome.runtime.id);
  } catch {
    return false;
  }
}

/**
 * 安全获取 chrome.runtime.lastError
 * 在上下文失效时访问 lastError 也可能抛出错误
 */
function getLastError(): string | null {
  try {
    if (!isExtensionContextValid()) {
      return 'Extension context invalidated';
    }
    return chrome.runtime.lastError?.message || null;
  } catch {
    return 'Extension context invalidated';
  }
}

/**
 * 检查错误是否为扩展上下文失效错误
 */
function isContextInvalidatedError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('Extension context invalidated') ||
           error.message.includes('context invalidated') ||
           error.message.includes('Extension context was invalidated');
  }
  if (typeof error === 'string') {
    return error.includes('Extension context invalidated') ||
           error.includes('context invalidated');
  }
  return false;
}

/**
 * 生成唯一请求 ID
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * 从 Content Script 发送消息到 Service Worker
 * @param type 消息类型
 * @param payload 消息负载
 * @param timeout 超时时间（默认 30 秒）
 * @returns Promise<Response<T>>
 */
export async function sendMessage<T extends MessageType>(
  type: T,
  payload: PayloadMap[T],
  timeout = DEFAULT_TIMEOUT
): Promise<Response<ResponseDataMap[T]>> {
  const requestId = generateRequestId();

  // 首先检查扩展上下文是否有效
  if (!isExtensionContextValid()) {
    return {
      success: false,
      error: {
        code: ErrorCode.EXTENSION_CONTEXT_INVALIDATED,
        message: '扩展已更新，请刷新页面后重试',
      },
      requestId,
    };
  }

  const message: Message<T> = {
    type,
    payload,
    requestId,
    timestamp: Date.now(),
  };

  return new Promise((resolve) => {
    // 创建上下文失效响应的辅助函数
    const createInvalidatedResponse = () => ({
      success: false as const,
      error: {
        code: ErrorCode.EXTENSION_CONTEXT_INVALIDATED,
        message: '扩展已更新，请刷新页面后重试',
      },
      requestId,
    });

    // 设置超时计时器
    const timer = setTimeout(() => {
      resolve({
        success: false,
        error: {
          code: ErrorCode.TIMEOUT,
          message: `Request timed out after ${timeout}ms`,
        },
        requestId,
      });
    }, timeout);

    try {
      // 再次检查上下文（可能在构建消息期间失效）
      if (!isExtensionContextValid()) {
        clearTimeout(timer);
        resolve(createInvalidatedResponse());
        return;
      }

      // 发送消息
      chrome.runtime.sendMessage(message, (response: Response<ResponseDataMap[T]>) => {
        clearTimeout(timer);

        // 在回调中也包装 try-catch，因为访问 chrome.runtime.lastError 也可能抛出
        try {
          // 再次检查上下文有效性（回调执行时可能已失效）
          if (!isExtensionContextValid()) {
            resolve(createInvalidatedResponse());
            return;
          }

          // 安全获取 lastError
          const lastError = getLastError();
          if (lastError) {
            // 检查是否为上下文失效错误
            if (isContextInvalidatedError(lastError)) {
              resolve(createInvalidatedResponse());
              return;
            }

            resolve({
              success: false,
              error: {
                code: ErrorCode.NETWORK_ERROR,
                message: lastError,
              },
              requestId,
            });
            return;
          }

          // 返回响应
          resolve(response || {
            success: false,
            error: {
              code: ErrorCode.UNKNOWN,
              message: 'No response received',
            },
            requestId,
          });
        } catch (callbackError) {
          // 回调内部发生异常
          if (isContextInvalidatedError(callbackError)) {
            resolve(createInvalidatedResponse());
          } else {
            resolve({
              success: false,
              error: {
                code: ErrorCode.UNKNOWN,
                message: callbackError instanceof Error ? callbackError.message : 'Callback error',
              },
              requestId,
            });
          }
        }
      });
    } catch (error) {
      clearTimeout(timer);

      // 捕获同步抛出的异常（如上下文失效）
      if (isContextInvalidatedError(error)) {
        resolve(createInvalidatedResponse());
      } else {
        resolve({
          success: false,
          error: {
            code: ErrorCode.UNKNOWN,
            message: error instanceof Error ? error.message : 'Unknown error',
          },
          requestId,
        });
      }
    }
  });
}

/**
 * 从 Service Worker 发送消息到指定标签页的 Content Script
 * @param tabId 目标标签页 ID
 * @param type 消息类型
 * @param payload 消息负载
 * @returns Promise<Response<T>>
 */
export async function sendToTab<T extends MessageType>(
  tabId: number,
  type: T,
  payload: PayloadMap[T]
): Promise<Response<ResponseDataMap[T]>> {
  const requestId = generateRequestId();

  const message: Message<T> = {
    type,
    payload,
    requestId,
    timestamp: Date.now(),
  };

  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response: Response<ResponseDataMap[T]>) => {
      // 检查 Chrome runtime 错误
      if (chrome.runtime.lastError) {
        resolve({
          success: false,
          error: {
            code: ErrorCode.NETWORK_ERROR,
            message: chrome.runtime.lastError.message || 'Tab communication error',
          },
          requestId,
        });
        return;
      }

      // 返回响应（如果没有响应，返回成功）
      resolve(response || {
        success: true,
        requestId,
      });
    });
  });
}

/**
 * 发送消息到当前活动标签页
 * @param type 消息类型
 * @param payload 消息负载
 * @returns Promise<Response<T>>
 */
export async function sendToActiveTab<T extends MessageType>(
  type: T,
  payload: PayloadMap[T]
): Promise<Response<ResponseDataMap[T]>> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];

      if (!activeTab?.id) {
        resolve({
          success: false,
          error: {
            code: ErrorCode.NOT_FOUND,
            message: 'No active tab found',
          },
        });
        return;
      }

      sendToTab(activeTab.id, type, payload).then(resolve);
    });
  });
}
