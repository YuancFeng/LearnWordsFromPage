/**
 * LingoRecall AI - Message Sender Utilities
 * 消息发送工具，支持 Content Script 和 Service Worker 的双向通信
 */

import { ErrorCode } from '../types/errors';
import type { Message, MessageType, PayloadMap, Response, ResponseDataMap } from './types';

// 默认超时时间（毫秒）
const DEFAULT_TIMEOUT = 30000;

/**
 * 检查错误是否为扩展上下文失效错误
 * 只检查实际的错误消息，不做预先判断
 */
function isContextInvalidatedError(error: unknown): boolean {
  const errorStr = error instanceof Error ? error.message : String(error || '');
  return errorStr.includes('Extension context invalidated') ||
         errorStr.includes('context invalidated') ||
         errorStr.includes('Extension context was invalidated');
}

/**
 * 检查是否为连接错误（扩展重新加载后的典型错误）
 */
function isConnectionError(error: string): boolean {
  return error.includes('Could not establish connection') ||
         error.includes('Receiving end does not exist') ||
         error.includes('Extension context invalidated') ||
         error.includes('context invalidated');
}

/**
 * 生成唯一请求 ID
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * 从 Content Script 发送消息到 Service Worker
 * 采用乐观策略：先尝试发送，只在失败时处理错误
 *
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

  // 创建上下文失效响应的辅助函数
  const createInvalidatedResponse = () => ({
    success: false as const,
    error: {
      code: ErrorCode.EXTENSION_CONTEXT_INVALIDATED,
      message: '扩展已更新，请刷新页面后重试',
    },
    requestId,
  });

  const message: Message<T> = {
    type,
    payload,
    requestId,
    timestamp: Date.now(),
  };

  return new Promise((resolve) => {
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
      // 检查 chrome.runtime 是否存在
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
        clearTimeout(timer);
        resolve(createInvalidatedResponse());
        return;
      }

      // 直接尝试发送消息，不做预先检查
      chrome.runtime.sendMessage(message, (response: Response<ResponseDataMap[T]>) => {
        clearTimeout(timer);

        try {
          // 检查 lastError
          const lastError = chrome.runtime.lastError;
          if (lastError) {
            const errorMessage = lastError.message || '';

            // 检查是否为连接错误（表示扩展已重新加载）
            if (isConnectionError(errorMessage)) {
              resolve(createInvalidatedResponse());
              return;
            }

            // 其他错误
            resolve({
              success: false,
              error: {
                code: ErrorCode.NETWORK_ERROR,
                message: errorMessage || 'Unknown communication error',
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
