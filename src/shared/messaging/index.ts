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
  type AnalysisMode,
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
  // Story 3.4: Review Word
  type ReviewWordPayload,
  type ReviewWordResult,
  // Full Page Translation
  type TranslatePageSegmentPayload,
  type TranslatePageSegmentResult,
  // Local Model Connection
  type TestLocalConnectionPayload,
  type TestLocalConnectionResult,
  type GetLocalModelsPayload,
  type GetLocalModelsResult,
  // API Connection Test
  type TestApiConnectionPayload,
  type TestApiConnectionResult,
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
