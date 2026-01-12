/**
 * LingoRecall AI - Message Types and Definitions
 * 消息类型定义，使用 SCREAMING_SNAKE_CASE 命名规范
 */

import type { ErrorInfo } from '../types/errors';
import type { Settings } from '../types/settings';

// ============================================================
// Message Type Constants (SCREAMING_SNAKE_CASE)
// ============================================================

export const MessageTypes = {
  // 词汇分析相关
  ANALYZE_WORD: 'ANALYZE_WORD',

  // 词汇存储相关
  SAVE_WORD: 'SAVE_WORD',
  GET_WORDS: 'GET_WORDS',
  GET_DUE_WORDS: 'GET_DUE_WORDS',
  GET_DUE_COUNT: 'GET_DUE_COUNT',
  UPDATE_WORD: 'UPDATE_WORD',
  DELETE_WORD: 'DELETE_WORD',

  // 页面交互相关
  HIGHLIGHT_TEXT: 'HIGHLIGHT_TEXT',

  // 导航相关 - Story 2.3
  JUMP_TO_SOURCE: 'JUMP_TO_SOURCE',
  HIGHLIGHT_WORD: 'HIGHLIGHT_WORD',

  // UI 更新相关
  UPDATE_BADGE: 'UPDATE_BADGE',

  // 复习相关 - Story 3.4
  REVIEW_WORD: 'REVIEW_WORD',

  // 设置相关 - Story 4.2
  SETTINGS_CHANGED: 'SETTINGS_CHANGED',
} as const;

export type MessageType = typeof MessageTypes[keyof typeof MessageTypes];

// ============================================================
// Payload Definitions
// ============================================================

/**
 * 分析模式类型
 * 'word' - 单词/短语分析模式（默认）
 * 'translate' - 段落翻译模式
 */
export type AnalysisMode = 'word' | 'translate';

// 分析词汇请求
export interface AnalyzeWordPayload {
  text: string;           // 选中的文本
  context: string;        // 上下文（前后各 50 字符）
  url: string;            // 页面 URL
  xpath: string;          // XPath 定位
  mode?: AnalysisMode;    // 分析模式（可选，默认 'word'）
}

// 分析词汇响应数据
export interface AnalyzeWordResult {
  meaning: string;        // 词汇含义或翻译结果
  pronunciation: string;  // IPA 音标（翻译模式为空）
  partOfSpeech: string;   // 词性（翻译模式为空）
  usage: string;          // 用法说明（翻译模式为空）
  mode?: AnalysisMode;    // 返回使用的分析模式
}

// 保存词汇请求
export interface SaveWordPayload {
  text: string;
  meaning: string;
  pronunciation: string;
  partOfSpeech: string;
  exampleSentence: string;
  sourceUrl: string;
  sourceTitle: string;
  xpath: string;
  textOffset: number;
  contextBefore: string;
  contextAfter: string;
}

// 词汇记录（存储格式）
export interface WordRecord {
  id: string;
  text: string;
  meaning: string;
  pronunciation: string;
  partOfSpeech: string;
  exampleSentence: string;
  sourceUrl: string;
  sourceTitle: string;
  xpath: string;
  textOffset: number;
  contextBefore: string;
  contextAfter: string;
  createdAt: number;
  nextReviewAt: number;
  reviewCount: number;
  easeFactor: number;
  interval: number;
  tagIds: string[];
}

// 获取词汇请求
export interface GetWordsPayload {
  limit?: number;
  offset?: number;
  tagIds?: string[];
  searchQuery?: string;
}

// 更新词汇请求
export interface UpdateWordPayload {
  id: string;
  updates: Partial<Omit<WordRecord, 'id' | 'createdAt'>>;
}

// 删除词汇请求
export interface DeleteWordPayload {
  id: string;
}

// 高亮文本请求（Service Worker -> Content Script）
export interface HighlightTextPayload {
  xpath: string;
  textOffset: number;
  textLength: number;
  text: string;
  contextBefore: string;
  contextAfter: string;
}

// 更新徽章请求
export interface UpdateBadgePayload {
  count: number;
}

// ============================================================
// Story 3.4: Review Word Payloads
// ============================================================

/**
 * 复习词汇请求
 * Story 3.4 - AC1, AC2: 提交复习结果
 */
export interface ReviewWordPayload {
  /** 词汇 ID */
  wordId: string;
  /** 复习结果: 'remembered' = 记住了, 'forgotten' = 忘记了 */
  result: 'remembered' | 'forgotten';
}

/**
 * 复习词汇响应
 * Story 3.4 - 返回更新后的词汇记录
 */
export interface ReviewWordResult {
  /** 更新后的词汇记录 */
  word: WordRecord;
}

// ============================================================
// Story 2.3: Jump to Source Page Payloads
// ============================================================

// 跳转到原文页面请求
export interface JumpToSourcePayload {
  sourceUrl: string;
  sourceTitle: string;
  xpath: string;
  textOffset: number;
  textLength: number;
  text: string;
  contextBefore: string;
  contextAfter: string;
}

// 跳转到原文页面响应数据
export interface JumpToSourceResult {
  tabId: number;
  status: 'switched' | 'created';
}

// 高亮词汇请求（发送到 Content Script）
export interface HighlightWordPayload {
  xpath: string;
  textOffset: number;
  textLength: number;
  text: string;
  contextBefore: string;
  contextAfter: string;
}

// 高亮词汇响应数据
export interface HighlightWordResult {
  success: boolean;
  scrolledTo?: boolean;
}

// ============================================================
// Story 4.2: Settings Changed Payloads
// ============================================================

/**
 * 设置变更通知
 * Story 4.2 - Task 6: 广播设置变更到 Content Script
 */
export interface SettingsChangedPayload {
  /** 更新后的完整设置 */
  settings: Settings;
}

// ============================================================
// Payload Type Mapping
// ============================================================

export type PayloadMap = {
  [MessageTypes.ANALYZE_WORD]: AnalyzeWordPayload;
  [MessageTypes.SAVE_WORD]: SaveWordPayload;
  [MessageTypes.GET_WORDS]: GetWordsPayload;
  [MessageTypes.GET_DUE_WORDS]: void;
  [MessageTypes.GET_DUE_COUNT]: void;
  [MessageTypes.UPDATE_WORD]: UpdateWordPayload;
  [MessageTypes.DELETE_WORD]: DeleteWordPayload;
  [MessageTypes.HIGHLIGHT_TEXT]: HighlightTextPayload;
  [MessageTypes.JUMP_TO_SOURCE]: JumpToSourcePayload;
  [MessageTypes.HIGHLIGHT_WORD]: HighlightWordPayload;
  [MessageTypes.UPDATE_BADGE]: UpdateBadgePayload;
  [MessageTypes.REVIEW_WORD]: ReviewWordPayload;
  [MessageTypes.SETTINGS_CHANGED]: SettingsChangedPayload;
};

// ============================================================
// Response Type Mapping
// ============================================================

export type ResponseDataMap = {
  [MessageTypes.ANALYZE_WORD]: AnalyzeWordResult;
  [MessageTypes.SAVE_WORD]: { id: string };
  [MessageTypes.GET_WORDS]: WordRecord[];
  [MessageTypes.GET_DUE_WORDS]: WordRecord[];
  [MessageTypes.GET_DUE_COUNT]: number;
  [MessageTypes.UPDATE_WORD]: void;
  [MessageTypes.DELETE_WORD]: void;
  [MessageTypes.HIGHLIGHT_TEXT]: { success: boolean };
  [MessageTypes.JUMP_TO_SOURCE]: JumpToSourceResult;
  [MessageTypes.HIGHLIGHT_WORD]: HighlightWordResult;
  [MessageTypes.UPDATE_BADGE]: void;
  [MessageTypes.REVIEW_WORD]: ReviewWordResult;
  [MessageTypes.SETTINGS_CHANGED]: void;
};

// ============================================================
// Message Structure
// ============================================================

// 统一消息结构
export interface Message<T extends MessageType = MessageType> {
  type: T;
  payload: PayloadMap[T];
  requestId?: string;
  timestamp?: number;
}

// 统一响应结构
export interface Response<T = unknown> {
  success: boolean;
  data?: T;
  error?: ErrorInfo;
  requestId?: string;
}

// 类型安全的响应
export type TypedResponse<T extends MessageType> = Response<ResponseDataMap[T]>;
