/**
 * LingoRecall AI - Messaging Module
 * 消息通信模块导出
 */

// Types
export {
  MessageTypes,
  type MessageType,
  type Message,
  type Response,
  type TypedResponse,
  type PayloadMap,
  type ResponseDataMap,
  type AnalyzeWordPayload,
  type AnalyzeWordResult,
  type SaveWordPayload,
  type WordRecord,
  type GetWordsPayload,
  type UpdateWordPayload,
  type DeleteWordPayload,
  type HighlightTextPayload,
  type UpdateBadgePayload,
  // Story 2.3: Jump to Source
  type JumpToSourcePayload,
  type JumpToSourceResult,
  type HighlightWordPayload,
  type HighlightWordResult,
  // Story 4.2: Settings Changed
  type SettingsChangedPayload,
} from './types';

// Sender utilities
export {
  sendMessage,
  sendToTab,
  sendToActiveTab,
} from './sender';

// Handler registry
export {
  type MessageHandler,
  registerHandler,
  getHandler,
  hasHandler,
  getRegisteredTypes,
  initMessageRouter,
  initContentMessageListener,
} from './handlers';
