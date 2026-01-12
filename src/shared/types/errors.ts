/**
 * LingoRecall AI - Error Codes and Types
 * 统一错误码定义，用于消息通信的错误处理
 */

// 错误码枚举 - 覆盖所有可能的错误场景
export enum ErrorCode {
  // 网络相关错误
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',

  // AI API 相关错误
  AI_API_ERROR = 'AI_API_ERROR',
  AI_RATE_LIMIT = 'AI_RATE_LIMIT',
  AI_INVALID_KEY = 'AI_INVALID_KEY',

  // 存储相关错误
  STORAGE_ERROR = 'STORAGE_ERROR',
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',

  // 输入验证错误
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // 资源相关错误
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  DUPLICATE_WORD = 'DUPLICATE_WORD',
  DUPLICATE_TAG = 'DUPLICATE_TAG',

  // 定位相关错误
  LOCATION_FAILED = 'LOCATION_FAILED',
  XPATH_INVALID = 'XPATH_INVALID',
  ELEMENT_NOT_FOUND = 'ELEMENT_NOT_FOUND',

  // 导航相关错误 - Story 2.3
  PAGE_INACCESSIBLE = 'PAGE_INACCESSIBLE',
  TAB_ERROR = 'TAB_ERROR',

  // 扩展上下文错误
  EXTENSION_CONTEXT_INVALIDATED = 'EXTENSION_CONTEXT_INVALIDATED',

  // 通用错误
  UNKNOWN = 'UNKNOWN',
  HANDLER_NOT_FOUND = 'HANDLER_NOT_FOUND',
}

// 错误信息接口
export interface ErrorInfo {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

// 标准错误消息映射
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.NETWORK_ERROR]: 'Network communication error',
  [ErrorCode.TIMEOUT]: 'Request timed out',
  [ErrorCode.AI_API_ERROR]: 'AI service error',
  [ErrorCode.AI_RATE_LIMIT]: 'AI rate limit exceeded',
  [ErrorCode.AI_INVALID_KEY]: 'Invalid API key',
  [ErrorCode.STORAGE_ERROR]: 'Storage operation failed',
  [ErrorCode.STORAGE_QUOTA_EXCEEDED]: 'Storage quota exceeded',
  [ErrorCode.INVALID_INPUT]: 'Invalid input provided',
  [ErrorCode.MISSING_REQUIRED_FIELD]: 'Required field is missing',
  [ErrorCode.NOT_FOUND]: 'Resource not found',
  [ErrorCode.ALREADY_EXISTS]: 'Resource already exists',
  [ErrorCode.DUPLICATE_ENTRY]: 'Duplicate entry already exists',
  [ErrorCode.DUPLICATE_WORD]: 'This word has already been saved',
  [ErrorCode.DUPLICATE_TAG]: 'This tag name already exists',
  [ErrorCode.LOCATION_FAILED]: 'Failed to locate element',
  [ErrorCode.XPATH_INVALID]: 'Invalid XPath expression',
  [ErrorCode.ELEMENT_NOT_FOUND]: 'Element not found on page',
  [ErrorCode.PAGE_INACCESSIBLE]: 'Source page is inaccessible',
  [ErrorCode.TAB_ERROR]: 'Failed to manage browser tab',
  [ErrorCode.EXTENSION_CONTEXT_INVALIDATED]: '扩展已更新，请刷新页面后重试',
  [ErrorCode.UNKNOWN]: 'An unknown error occurred',
  [ErrorCode.HANDLER_NOT_FOUND]: 'Message handler not found',
};

// 创建错误信息的工具函数
export function createError(
  code: ErrorCode,
  customMessage?: string,
  details?: Record<string, unknown>
): ErrorInfo {
  return {
    code,
    message: customMessage || ERROR_MESSAGES[code],
    details,
  };
}
