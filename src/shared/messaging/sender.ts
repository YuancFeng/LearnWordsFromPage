/**
 * LingoRecall AI - Message Sender Utilities
 * 消息发送工具，支持 Content Script 和 Service Worker 的双向通信
 */

import { ErrorCode } from '../types/errors';
import type { Message, MessageType, PayloadMap, Response, ResponseDataMap } from './types';

// 默认超时时间（毫秒）
const DEFAULT_TIMEOUT = 30000;

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

    // 发送消息
    chrome.runtime.sendMessage(message, (response: Response<ResponseDataMap[T]>) => {
      clearTimeout(timer);

      // 检查 Chrome runtime 错误
      if (chrome.runtime.lastError) {
        resolve({
          success: false,
          error: {
            code: ErrorCode.NETWORK_ERROR,
            message: chrome.runtime.lastError.message || 'Communication error',
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
    });
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
