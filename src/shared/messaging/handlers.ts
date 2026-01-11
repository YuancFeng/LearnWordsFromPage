/**
 * LingoRecall AI - Message Handler Registry
 * 消息处理程序注册中心，用于 Service Worker 和 Content Script
 */

import { ErrorCode, createError } from '../types/errors';
import type { Message, MessageType, Response, ResponseDataMap, PayloadMap } from './types';

/**
 * 消息处理函数类型
 */
export type MessageHandler<T extends MessageType = MessageType> = (
  message: Message<T>,
  sender: chrome.runtime.MessageSender
) => Promise<Response<ResponseDataMap[T]>>;

/**
 * 处理程序存储
 */
const handlers = new Map<MessageType, MessageHandler<MessageType>>();

/**
 * 注册消息处理程序
 * @param type 消息类型
 * @param handler 处理函数
 */
export function registerHandler<T extends MessageType>(
  type: T,
  handler: MessageHandler<T>
): void {
  handlers.set(type, handler as MessageHandler<MessageType>);
  console.log(`[LingoRecall] Registered handler for: ${type}`);
}

/**
 * 获取消息处理程序
 * @param type 消息类型
 * @returns 处理函数或 undefined
 */
export function getHandler<T extends MessageType>(
  type: T
): MessageHandler<T> | undefined {
  return handlers.get(type) as MessageHandler<T> | undefined;
}

/**
 * 检查是否有处理程序
 * @param type 消息类型
 */
export function hasHandler(type: MessageType): boolean {
  return handlers.has(type);
}

/**
 * 获取所有已注册的消息类型
 */
export function getRegisteredTypes(): MessageType[] {
  return Array.from(handlers.keys());
}

/**
 * 初始化 Service Worker 消息路由
 * 在 Service Worker 启动时调用
 */
export function initMessageRouter(): void {
  chrome.runtime.onMessage.addListener(
    (
      message: Message,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response: Response) => void
    ) => {
      // 验证消息格式
      if (!message || typeof message.type !== 'string') {
        console.warn('[LingoRecall] Invalid message format:', message);
        sendResponse({
          success: false,
          error: createError(ErrorCode.INVALID_INPUT, 'Invalid message format'),
        });
        return false;
      }

      const handler = getHandler(message.type as MessageType);

      if (!handler) {
        console.warn(`[LingoRecall] No handler for message type: ${message.type}`);
        sendResponse({
          success: false,
          error: createError(
            ErrorCode.HANDLER_NOT_FOUND,
            `Unknown message type: ${message.type}`
          ),
          requestId: message.requestId,
        });
        return false;
      }

      // 异步处理消息
      handler(message, sender)
        .then((response) => {
          // 添加 requestId 到响应
          sendResponse({
            ...response,
            requestId: message.requestId,
          });
        })
        .catch((error) => {
          console.error(`[LingoRecall] Handler error for ${message.type}:`, error);
          sendResponse({
            success: false,
            error: createError(
              ErrorCode.UNKNOWN,
              error instanceof Error ? error.message : 'Unknown error'
            ),
            requestId: message.requestId,
          });
        });

      // 返回 true 保持消息通道开放（支持异步响应）
      return true;
    }
  );

  console.log('[LingoRecall] Message router initialized');
}

/**
 * 初始化 Content Script 消息监听器
 * 用于接收来自 Service Worker 的消息（如 HIGHLIGHT_TEXT）
 */
export function initContentMessageListener(): void {
  chrome.runtime.onMessage.addListener(
    (
      message: Message,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response: Response) => void
    ) => {
      // 只处理来自扩展的消息
      if (sender.id !== chrome.runtime.id) {
        return false;
      }

      // 验证消息格式
      if (!message || typeof message.type !== 'string') {
        return false;
      }

      const handler = getHandler(message.type as MessageType);

      if (!handler) {
        // Content Script 不需要处理所有消息类型
        return false;
      }

      // 异步处理消息
      handler(message, sender)
        .then((response) => {
          sendResponse({
            ...response,
            requestId: message.requestId,
          });
        })
        .catch((error) => {
          console.error(`[LingoRecall] Content handler error for ${message.type}:`, error);
          sendResponse({
            success: false,
            error: createError(
              ErrorCode.UNKNOWN,
              error instanceof Error ? error.message : 'Unknown error'
            ),
            requestId: message.requestId,
          });
        });

      return true;
    }
  );

  console.log('[LingoRecall] Content message listener initialized');
}
