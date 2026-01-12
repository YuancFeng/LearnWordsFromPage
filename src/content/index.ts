/**
 * LingoRecall AI - Content Script Entry Point
 *
 * This script is injected into all web pages and handles:
 * - Text selection detection
 * - Floating button UI (via Shadow DOM)
 * - XPath extraction for source location
 * - Communication with Service Worker
 *
 * @module content
 */

import {
  MessageTypes,
  registerHandler,
  initContentMessageListener,
  sendMessage,
  type HighlightTextPayload,
  type HighlightWordPayload,
  type AnalyzeWordResult,
  type SettingsChangedPayload,
} from '../shared/messaging';

import { type Settings, DEFAULT_SETTINGS } from '../shared/types/settings';
import { matchesBlacklist } from '../shared/utils/urlMatcher';
import { STORAGE_KEYS } from '../shared/storage/config';

import {
  initShadowModule,
  showButton,
  hideUI,
  showLoading,
  showResult,
  showError,
  showToast,
  dismissToast,
  setCallbacks,
} from './shadow';

import { ErrorCode } from '../shared/types/errors';

// Story 1.5: XPath 提取功能
import {
  extractSourceLocation,
  extractSourceLocationFromRange,
  type SourceLocation,
} from './extraction';

// Story 2.4: 高亮定位功能
import { locateTextByXPath } from './xpath';
import { findTextByContext } from './textMatcher';
import { highlightAndScroll, clearHighlights } from './highlight';

console.log('[LingoRecall] Content script loaded');

// ============================================================
// Content Script Message Handlers
// ============================================================

/**
 * HIGHLIGHT_TEXT handler
 * 接收来自 Service Worker 的高亮请求，定位并高亮页面中的文本
 * TODO: Story 2.4 实现完整的定位和高亮功能
 */
registerHandler(MessageTypes.HIGHLIGHT_TEXT, async (message) => {
  const payload = message.payload as HighlightTextPayload;
  console.log('[LingoRecall] HIGHLIGHT_TEXT:', payload);

  // Placeholder - 将在 Story 2.4 实现高亮功能
  // 暂时只返回成功
  return {
    success: true,
    data: { success: true },
  };
});

/**
 * HIGHLIGHT_WORD handler
 * 接收来自 Service Worker 的高亮请求（跳回原文时触发）
 * Story 2.4 实现完整功能
 *
 * 定位策略优先级：
 * 1. XPath + textOffset 精确定位 (AC1)
 * 2. Context 上下文匹配回退 (AC2)
 * 3. 定位失败显示 Toast (AC3)
 */
registerHandler(MessageTypes.HIGHLIGHT_WORD, async (message) => {
  const payload = message.payload as HighlightWordPayload;
  console.log('[LingoRecall] HIGHLIGHT_WORD:', payload);

  const { xpath, textOffset, textLength, text, contextBefore, contextAfter } = payload;

  // 清除之前的高亮
  clearHighlights();

  // 策略 1: XPath + textOffset 精确定位 (AC1)
  if (xpath) {
    console.log('[LingoRecall] Trying XPath location:', xpath);
    const range = locateTextByXPath(xpath, textOffset, textLength);

    if (range) {
      // 验证定位的文本是否匹配
      const locatedText = range.toString();
      if (locatedText === text) {
        console.log('[LingoRecall] XPath location successful');
        const result = highlightAndScroll(range);
        return {
          success: true,
          data: {
            success: result.success,
            scrolledTo: result.scrolledTo,
            method: 'xpath',
          },
        };
      } else {
        console.log('[LingoRecall] XPath text mismatch:', locatedText, '!==', text);
      }
    } else {
      console.log('[LingoRecall] XPath location failed');
    }
  }

  // 策略 2: Context 上下文匹配回退 (AC2)
  if (contextBefore !== undefined && contextAfter !== undefined) {
    console.log('[LingoRecall] Trying context fallback');
    const contextResult = findTextByContext(contextBefore || '', text, contextAfter || '');

    if (contextResult.found && contextResult.range) {
      console.log('[LingoRecall] Context match successful, method:', contextResult.method);
      const result = highlightAndScroll(contextResult.range);
      return {
        success: true,
        data: {
          success: result.success,
          scrolledTo: result.scrolledTo,
          method: `context-${contextResult.method}`,
          confidence: contextResult.confidence,
        },
      };
    } else {
      console.log('[LingoRecall] Context match failed');
    }
  }

  // 策略 3: 定位失败，显示 Toast 通知 (AC3)
  console.log('[LingoRecall] All location methods failed');
  showToast('Cannot locate this word on the current page, content may have changed', 'warning');

  return {
    success: false,
    data: {
      success: false,
      scrolledTo: false,
      method: 'none',
    },
  };
});

/**
 * UPDATE_BADGE handler
 * 接收徽章更新请求（用于调试）
 */
registerHandler(MessageTypes.UPDATE_BADGE, async (message) => {
  console.log('[LingoRecall] UPDATE_BADGE received in content:', message.payload);
  return {
    success: true,
    data: undefined,
  };
});

// ============================================================
// Story 4.2: Settings Management
// ============================================================

/** 当前设置状态 */
let currentSettings: Settings = { ...DEFAULT_SETTINGS, blacklistUrls: [...DEFAULT_SETTINGS.blacklistUrls] };

/**
 * 应用设置变更
 * Story 4.2 - AC1, AC2: 设置立即生效
 * Story 4.3 - 黑名单变更时重新检查
 */
function applySettings(settings: Settings): void {
  console.log('[LingoRecall] Applying settings:', settings);

  // 保存旧的黑名单状态
  const wasBlacklisted = isBlacklisted;

  // 更新设置
  currentSettings = settings;

  // Story 4.3: 重新检查黑名单
  isBlacklisted = checkBlacklist(settings);

  // 如果黑名单状态变化，通知 Service Worker 更新图标
  if (wasBlacklisted !== isBlacklisted) {
    notifyIconState(isBlacklisted);

    // 如果从非黑名单变为黑名单，页面需要刷新才能禁用功能
    // 如果从黑名单变为非黑名单，页面也需要刷新才能启用功能
    // 这里只更新图标状态，完整功能需要页面刷新
    console.log(`[LingoRecall] Blacklist status changed: ${wasBlacklisted} -> ${isBlacklisted}`);
  }

  // TODO: Story 4.2 扩展
  // 1. enableDoubleClick - 控制双击查词行为 (未来实现)
  // 2. enableHoverIcon - 控制悬浮图标显示 (未来实现)
  // 3. reviewReminder - 控制复习提醒 (已通过 badge 实现)
}

/**
 * SETTINGS_CHANGED handler
 * 接收来自 Popup / Service Worker 的设置变更通知
 * Story 4.2 - Task 6: 广播设置变更到 Content Script
 */
registerHandler(MessageTypes.SETTINGS_CHANGED, async (message) => {
  const payload = message.payload as SettingsChangedPayload;
  console.log('[LingoRecall] SETTINGS_CHANGED:', payload);

  if (payload.settings) {
    applySettings(payload.settings);
  }

  return {
    success: true,
    data: undefined,
  };
});

/**
 * 获取当前设置（供其他模块使用）
 */
export function getContentSettings(): Settings {
  return currentSettings;
}

// ============================================================
// Selection State Management
// ============================================================

/** Selection length constraints per Story 1.3 */
const MIN_SELECTION_LENGTH = 1;
/** 最大选择长度：支持词汇和短语（增加到 200 字符以支持较长句子） */
const MAX_SELECTION_LENGTH = 200;
/** Button offset in pixels from selection top-right */
const BUTTON_OFFSET_PX = 8;

/** Current selection info */
interface SelectionInfo {
  text: string;
  position: { x: number; y: number };
  range: Range;
  sourceLocation: SourceLocation | null;
}

let currentSelection: SelectionInfo | null = null;
let currentAnalysisResult: AnalyzeWordResult | null = null;

/**
 * Calculate button position from selection
 * Places button at selection top-right with 8px offset
 */
function getButtonPosition(range: Range): { x: number; y: number } {
  const rect = range.getBoundingClientRect();
  return {
    x: rect.right + BUTTON_OFFSET_PX,
    y: rect.top - BUTTON_OFFSET_PX,
  };
}

/**
 * Check if selection is valid for analysis
 * - Must have at least 1 character
 * - Must be less than 50 characters (word/phrase limit per Story 1.3)
 * - Must not be only whitespace
 */
function isValidSelection(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.length >= MIN_SELECTION_LENGTH && trimmed.length <= MAX_SELECTION_LENGTH;
}

// ============================================================
// Selection Event Handlers
// ============================================================

/**
 * Handle text selection (mouseup event)
 */
function handleMouseUp(event: MouseEvent): void {
  // Small delay to ensure selection is finalized
  setTimeout(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      // No selection or collapsed - clear UI
      if (currentSelection) {
        currentSelection = null;
        currentAnalysisResult = null;
        hideUI();
      }
      return;
    }

    const text = selection.toString();
    if (!isValidSelection(text)) {
      if (currentSelection) {
        currentSelection = null;
        currentAnalysisResult = null;
        hideUI();
      }
      return;
    }

    const range = selection.getRangeAt(0);
    const position = getButtonPosition(range);

    // Extract source location for XPath positioning (Story 1.5)
    const sourceLocation = extractSourceLocation(selection);

    // Store selection info
    currentAnalysisResult = null;
    currentSelection = {
      text: text.trim(),
      position,
      range: range.cloneRange(),
      sourceLocation,
    };

    // Show floating button
    showButton(position, currentSelection.text);

    console.log('[LingoRecall] Selection detected:', currentSelection.text);
    if (sourceLocation) {
      console.log('[LingoRecall] XPath:', sourceLocation.xpath);
    }
  }, 10);
}

/**
 * Handle keyboard selection (Shift + Arrow keys, Ctrl+A, etc.)
 */
function handleKeyUp(event: KeyboardEvent): void {
  // Only handle selection-related keys
  if (!event.shiftKey && event.key !== 'a') {
    return;
  }

  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) {
    if (currentSelection) {
      currentSelection = null;
      currentAnalysisResult = null;
      hideUI();
    }
    return;
  }

  const text = selection.toString();
  if (!isValidSelection(text)) {
    if (currentSelection) {
      currentSelection = null;
      currentAnalysisResult = null;
      hideUI();
    }
    return;
  }

  const range = selection.getRangeAt(0);
  const position = getButtonPosition(range);

  // Extract source location for XPath positioning (Story 1.5)
  const sourceLocation = extractSourceLocation(selection);

  currentAnalysisResult = null;
  currentSelection = {
    text: text.trim(),
    position,
    range: range.cloneRange(),
    sourceLocation,
  };

  showButton(position, currentSelection.text);
}

/**
 * Check whether a click originated inside the Shadow DOM UI.
 */
function isClickInsideShadow(event: MouseEvent): boolean {
  if (typeof event.composedPath === 'function') {
    return event.composedPath().some((node) => {
      return (
        node instanceof HTMLElement &&
        node.tagName.toLowerCase() === 'lingorecall-root'
      );
    });
  }

  const target = event.target as HTMLElement | null;
  return Boolean(target?.closest?.('lingorecall-root'));
}

/**
 * Handle click outside selection to clear
 */
function handleDocumentClick(event: MouseEvent): void {
  // Ignore clicks on our shadow DOM elements
  if (isClickInsideShadow(event)) {
    return;
  }

  // Clear selection if clicking elsewhere
  if (currentSelection) {
    currentSelection = null;
    currentAnalysisResult = null;
    hideUI();
  }
}

// ============================================================
// UI Callbacks
// ============================================================

/**
 * Handle analyze button click
 * Sends request to service worker for AI analysis
 */
async function handleAnalyze(): Promise<void> {
  if (!currentSelection) {
    console.warn('[LingoRecall] No selection to analyze');
    return;
  }

  console.log('[LingoRecall] Analyzing:', currentSelection.text);

  // Show loading state
  showLoading();
  currentAnalysisResult = null;

  // Build context from SourceLocation if available
  const sourceLocation = currentSelection.sourceLocation;
  const context = sourceLocation
    ? `${sourceLocation.contextBefore}${currentSelection.text}${sourceLocation.contextAfter}`
    : getSelectionContext(currentSelection.range);

  try {
    // Send message to service worker
    const response = await sendMessage(MessageTypes.ANALYZE_WORD, {
      text: currentSelection.text,
      context,
      url: window.location.href,
      xpath: sourceLocation?.xpath || '',
    });

    if (response.success && response.data) {
      currentAnalysisResult = response.data;
      // Show result popup
      showResult(response.data);
    } else {
      // Handle error - show friendly message
      console.error('[LingoRecall] Analysis failed:', response.error);
      showError(response.error?.message || 'AI 分析失败，请重试');
    }
  } catch (error) {
    console.error('[LingoRecall] Analysis error:', error);
    showError('AI 分析失败，请重试');
  }
}

/**
 * Handle save button click
 * Quick saves word without full analysis
 * Story 2.1 - AC1: 保存成功显示 Toast, AC2: 重复检测显示提示
 */
async function handleSave(): Promise<void> {
  if (!currentSelection) {
    console.warn('[LingoRecall] No selection to save');
    return;
  }

  console.log('[LingoRecall] Saving:', currentSelection.text);

  const analysisResult = currentAnalysisResult;
  const hasAnalysis = Boolean(
    analysisResult &&
      analysisResult.meaning.trim() &&
      analysisResult.pronunciation.trim() &&
      analysisResult.partOfSpeech.trim()
  );

  if (!hasAnalysis) {
    showToast('请先完成分析再保存词汇', 'warning');
    return;
  }

  const sourceLocation =
    currentSelection.sourceLocation ?? extractSourceLocationFromRange(currentSelection.range);

  if (!sourceLocation || !sourceLocation.xpath) {
    showToast('无法获取词汇位置信息，保存失败', 'error');
    return;
  }

  const rawContext = `${sourceLocation.contextBefore}${currentSelection.text}${sourceLocation.contextAfter}`;
  const context = rawContext.trim()
    ? rawContext
    : getSelectionContext(currentSelection.range);

  try {
    const fallbackIndex = context.indexOf(currentSelection.text);
    const fallbackBefore = fallbackIndex >= 0
      ? context.slice(0, fallbackIndex)
      : '';
    const fallbackAfter = fallbackIndex >= 0
      ? context.slice(fallbackIndex + currentSelection.text.length)
      : '';

    const response = await sendMessage(MessageTypes.SAVE_WORD, {
      text: currentSelection.text,
      meaning: analysisResult.meaning,
      pronunciation: analysisResult.pronunciation,
      partOfSpeech: analysisResult.partOfSpeech,
      exampleSentence: context,
      sourceUrl: sourceLocation.sourceUrl,
      sourceTitle: sourceLocation.sourceTitle,
      xpath: sourceLocation.xpath,
      textOffset: sourceLocation.textOffset,
      contextBefore: sourceLocation.contextBefore || fallbackBefore,
      contextAfter: sourceLocation.contextAfter || fallbackAfter,
    });

    if (response.success) {
      console.log('[LingoRecall] Word saved successfully');
      // AC1: 显示保存成功 Toast
      showToast('保存成功', 'success');
      hideUI();
      currentSelection = null;
      currentAnalysisResult = null;
    } else {
      console.error('[LingoRecall] Save failed:', response.error);
      // AC2: 显示重复检测或其他错误提示
      if (response.error?.code === ErrorCode.DUPLICATE_WORD) {
        showToast('该词汇已保存', 'warning');
      } else {
        showToast(response.error?.message || '保存失败', 'error');
      }
    }
  } catch (error) {
    console.error('[LingoRecall] Save error:', error);
    showToast('保存失败，请重试', 'error');
  }
}

/**
 * Handle close popup
 */
function handleClose(): void {
  hideUI();
  currentSelection = null;
  currentAnalysisResult = null;
}

/**
 * Get surrounding context for selected text
 * Returns up to 100 characters before and after selection
 */
function getSelectionContext(range: Range): string {
  try {
    const container = range.commonAncestorContainer;
    const textContent = container.textContent || '';
    const selectedText = range.toString();

    // Find selection position in text
    const startOffset = textContent.indexOf(selectedText);
    if (startOffset === -1) {
      return selectedText;
    }

    // Get surrounding context
    const contextStart = Math.max(0, startOffset - 100);
    const contextEnd = Math.min(textContent.length, startOffset + selectedText.length + 100);

    return textContent.slice(contextStart, contextEnd).trim();
  } catch {
    return range.toString();
  }
}

// ============================================================
// Story 4.3: Blacklist State
// ============================================================

/** 标记当前站点是否被黑名单禁用 */
let isBlacklisted = false;

/**
 * 从 chrome.storage.local 加载设置
 * @returns Settings 对象或 null (如果加载失败)
 */
async function loadSettingsFromStorage(): Promise<Settings | null> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    const storedSettings = result[STORAGE_KEYS.SETTINGS];

    if (storedSettings) {
      return {
        ...DEFAULT_SETTINGS,
        ...storedSettings,
        blacklistUrls: storedSettings.blacklistUrls || [...DEFAULT_SETTINGS.blacklistUrls],
      };
    }

    return { ...DEFAULT_SETTINGS, blacklistUrls: [...DEFAULT_SETTINGS.blacklistUrls] };
  } catch (error) {
    console.warn('[LingoRecall] Failed to load settings:', error);
    return null;
  }
}

/**
 * 检查当前 URL 是否在黑名单中
 * Story 4.3 - AC3: Content Script 在黑名单站点不激活
 *
 * @param settings - 设置对象
 * @returns 是否被黑名单
 */
function checkBlacklist(settings: Settings): boolean {
  const currentUrl = window.location.href;
  const blacklistUrls = settings.blacklistUrls || DEFAULT_SETTINGS.blacklistUrls;

  const matched = matchesBlacklist(currentUrl, blacklistUrls as string[]);

  if (matched) {
    console.log('[LingoRecall] Site is blacklisted, extension disabled:', currentUrl);
  }

  return matched;
}

/**
 * 通知 Service Worker 更新图标状态
 * Story 4.3 - AC3: 扩展图标显示禁用状态
 */
function notifyIconState(disabled: boolean): void {
  try {
    chrome.runtime.sendMessage({
      type: 'UPDATE_ICON_STATE',
      payload: { disabled },
    }).catch(() => {
      // Service Worker 可能未就绪，忽略错误
    });
  } catch {
    // chrome.runtime 不可用时忽略
  }
}

// ============================================================
// Content Script Initialization
// ============================================================

/**
 * Initialize the content script
 * Sets up event listeners and UI components
 *
 * Story 4.3 - AC3: 检查黑名单后才初始化功能
 */
async function init(): Promise<void> {
  console.log('[LingoRecall] Content script initializing...');
  const startTime = performance.now();

  // 初始化消息监听器（即使被黑名单，也需要监听设置变更）
  initContentMessageListener();

  // Story 4.3: 加载设置并检查黑名单
  const settings = await loadSettingsFromStorage();
  if (settings) {
    currentSettings = settings;
    isBlacklisted = checkBlacklist(settings);
  } else {
    // 使用默认黑名单检查
    isBlacklisted = checkBlacklist(DEFAULT_SETTINGS);
  }

  // 如果站点被黑名单，通知 Service Worker 更新图标，并退出初始化
  if (isBlacklisted) {
    notifyIconState(true);
    const loadTime = performance.now() - startTime;
    console.log(`[LingoRecall] Blacklist check completed in ${loadTime.toFixed(2)}ms - Extension disabled`);
    return; // 提前退出，不初始化 UI 功能
  }

  // 通知 Service Worker 站点未被黑名单（恢复正常图标）
  notifyIconState(false);

  // Initialize Shadow DOM module (Story 1.4)
  initShadowModule();

  // Set up UI callbacks
  setCallbacks({
    onAnalyze: handleAnalyze,
    onSave: handleSave,
    onClose: handleClose,
    onToastClose: dismissToast,
  });

  // Set up selection event listeners
  // 使用 bubble phase (false) 而不是 capture phase (true)
  // 这样可以避免被页面 JS 在 capture phase 阻止事件
  document.addEventListener('mouseup', handleMouseUp, false);
  document.addEventListener('keyup', handleKeyUp, false);
  document.addEventListener('click', handleDocumentClick, false);

  // Story 1.3 + 1.5 已实现:
  // - 文本选择监听
  // - XPath 提取和位置信息

  const loadTime = performance.now() - startTime;
  console.log(`[LingoRecall] Content script initialized in ${loadTime.toFixed(2)}ms`);

  // Performance check per Story 1.3 requirement
  if (loadTime > 100) {
    console.warn(`[LingoRecall] Slow initialization: ${loadTime.toFixed(2)}ms (target: <100ms)`);
  }
}

/**
 * Test function for verifying messaging infrastructure
 * Can be called from browser console for debugging
 */
async function testMessaging(): Promise<void> {
  console.log('[LingoRecall] Testing messaging infrastructure...');

  const response = await sendMessage(MessageTypes.ANALYZE_WORD, {
    text: 'test',
    context: 'This is a test context',
    url: window.location.href,
    xpath: '/html/body',
  });

  console.log('[LingoRecall] Test response:', response);
}

// Expose test function to window for debugging
if (typeof window !== 'undefined') {
  (window as Window & { lingoRecallTest?: () => Promise<void> }).lingoRecallTest = testMessaging;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Export for testing purposes
export {
  init,
  testMessaging,
  getButtonPosition,
  isValidSelection,
  // Story 4.3: Blacklist functions
  checkBlacklist,
  loadSettingsFromStorage,
};
