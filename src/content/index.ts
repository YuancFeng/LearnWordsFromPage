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
  type AnalysisMode,
} from '../shared/messaging';

import { type Settings, DEFAULT_SETTINGS } from '../shared/types/settings';
import i18n from '../i18n';
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
  updatePageTranslation,
} from './shadow';

// 全页翻译功能
import {
  translatePage,
  toggleTranslation,
  restoreOriginal,
  isPageTranslated,
  isShowingTranslation,
  setProgressCallback,
  getTranslationState,
  initSpaNavigationListener,
  type TranslationState,
} from './pageTranslator';

import { ErrorCode } from '../shared/types/errors';

// Story 1.5: XPath 提取功能
import {
  extractSourceLocation,
  extractSourceLocationFromRange,
  type SourceLocation,
} from './extraction';

// 上下文提取功能
import { extractContext } from './context';

// Story 2.4: 高亮定位功能
import { locateTextByXPath } from './xpath';
import { findTextByContext } from './textMatcher';
import { highlightAndScroll, clearHighlights } from './highlight';

// 智能页面类型检测，用于生成精确的定位失败提示
import { detectPageType, generateLocationFailureMessage } from './pageDetector';

console.log('[LingoRecall] Content script loaded');

// ============================================================
// Global Error Handler for Extension Context Invalidation
// ============================================================

/**
 * 检查是否为扩展上下文失效错误
 */
function isContextInvalidatedError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('Extension context invalidated') ||
           error.message.includes('context invalidated') ||
           error.message.includes('Extension context was invalidated');
  }
  return false;
}

/**
 * 全局错误处理器
 * 捕获未处理的扩展上下文失效错误，静默处理避免在 Chrome 扩展错误面板显示
 * 注意：不使用 console.warn，因为它仍会显示在扩展错误面板
 */
window.addEventListener('error', (event) => {
  if (isContextInvalidatedError(event.error)) {
    event.preventDefault();
    // 静默处理，用户界面会显示刷新提示
  }
});

window.addEventListener('unhandledrejection', (event) => {
  if (isContextInvalidatedError(event.reason)) {
    event.preventDefault();
    // 静默处理，用户界面会显示刷新提示
  }
});

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

  // 检测当前是否在 iframe 中
  const isTopFrame = window === window.top;
  const frameInfo = isTopFrame ? 'top-frame' : 'iframe';
  console.log(`[LingoRecall] HIGHLIGHT_WORD in ${frameInfo}:`, payload);

  const { xpath, textOffset, textLength, text, contextBefore, contextAfter } = payload;

  // 清除之前的高亮
  clearHighlights();

  // 尝试定位文本，支持重试机制（SPA 的 DOM 可能需要时间稳定）
  // iframe 中减少重试次数以提高响应速度
  const maxRetries = isTopFrame ? 4 : 2;
  const retryDelayMs = isTopFrame ? 600 : 300;

  // 初始延迟：给 SPA DOM 时间完成渲染
  // iframe 中使用更短的延迟
  const initialDelay = isTopFrame ? 300 : 100;
  console.log(`[LingoRecall] Waiting ${initialDelay}ms for initial DOM stabilization...`);
  await new Promise((resolve) => setTimeout(resolve, initialDelay));

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`[LingoRecall] [${frameInfo}] Location attempt ${attempt}/${maxRetries}`);

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

    // 如果不是最后一次尝试，等待后重试
    if (attempt < maxRetries) {
      console.log(`[LingoRecall] Waiting ${retryDelayMs}ms before retry...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  // 所有重试都失败
  console.log(`[LingoRecall] [${frameInfo}] All location attempts failed`);

  // 只有顶层 frame 显示 Toast 通知 (AC3)
  // iframe 中的 content script 静默失败，避免多个 Toast
  if (isTopFrame) {
    // 延迟显示 Toast，给其他 iframe 时间响应
    setTimeout(() => {
      // 使用智能页面检测生成具体的失败原因和建议
      const pageInfo = detectPageType();
      const message = generateLocationFailureMessage(pageInfo);
      console.log(`[LingoRecall] Page type detected: ${pageInfo.type} (${pageInfo.name})`);
      showToast(message, 'warning');
    }, 500);
  }

  return {
    success: false,
    data: {
      success: false,
      scrolledTo: false,
      method: 'none',
      frame: frameInfo,
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
/** 最大选择长度：支持词汇、短语和段落翻译（增加到 2000 字符） */
const MAX_SELECTION_LENGTH = 2000;
/** 句末标点符号正则（英文和中文） */
const SENTENCE_END_PUNCTUATION = /[.!?。！？]/g;

// ============================================================
// Chinese Text Detection
// ============================================================

/**
 * 中文字符 Unicode 范围:
 * - CJK 统一表意文字 (基本): \u4e00-\u9fff
 * - CJK 扩展 A: \u3400-\u4dbf
 */
const CHINESE_REGEX = /[\u4e00-\u9fff\u3400-\u4dbf]/g;

/**
 * 检测文本是否主要是中文
 * 当中文字符占比超过 50% 时，认为是中文文本
 *
 * @param text - 待检测的文本
 * @returns 是否主要是中文文本
 */
function isPredominantlyChinese(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  // 统计中文字符数量
  const chineseMatches = trimmed.match(CHINESE_REGEX);
  const chineseCount = chineseMatches ? chineseMatches.length : 0;

  // 排除空格后的有效字符数
  const nonWhitespace = trimmed.replace(/\s/g, '');
  const totalChars = nonWhitespace.length;

  if (totalChars === 0) return false;

  // 中文占比超过 50% 视为中文文本
  const chineseRatio = chineseCount / totalChars;
  return chineseRatio > 0.5;
}

/**
 * 统计文本中的句子数量
 * 通过句末标点符号（. ! ? 。！？）来判断
 *
 * @param text - 待检测的文本
 * @returns 句子数量
 */
function countSentences(text: string): number {
  const matches = text.match(SENTENCE_END_PUNCTUATION);
  return matches ? matches.length : 0;
}

/**
 * 根据选中文本确定分析模式
 * 判断逻辑：
 * - 单词/短语（无句末标点）: 单词模式（可保存）
 * - 一句话（只有1个句末标点）: 单词模式（可保存）
 * - 多句/段落（≥2个句末标点）: 翻译模式（不可保存）
 *
 * @param text - 选中的文本
 * @returns 分析模式
 */
function getAnalysisMode(text: string): AnalysisMode {
  const trimmed = text.trim();

  // 统计句子数量
  const sentenceCount = countSentences(trimmed);

  // 多句（≥2个句末标点）→ 翻译模式（不可保存）
  if (sentenceCount >= 2) {
    return 'translate';
  }

  // 单词、短语、一句话（0或1个句末标点）→ 单词模式（可保存）
  return 'word';
}
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

// ============================================================
// Position Update for Scroll/Zoom
// ============================================================

// 注意：弹窗使用 position: fixed，滚动时不需要更新位置
// 弹窗会固定在屏幕上的位置，不随页面滚动移动

/**
 * 滚动事件处理器
 * 弹窗使用 position: fixed，滚动时不需要更新位置
 * 弹窗会固定在屏幕上的位置，不随页面滚动移动
 */
function handleScroll(): void {
  // 弹窗使用 position: fixed，无需在滚动时更新位置
  // 这样弹窗会保持在屏幕上的固定位置
}

/**
 * resize 事件处理器（包括 zoom 变化）
 * 弹窗使用 position: fixed，保持在屏幕固定位置
 * 只在窗口大小变化时检查边界，避免弹窗超出视口
 */
function handleResize(): void {
  // 弹窗使用 position: fixed，resize 时不需要更新位置
  // 弹窗会保持在屏幕上的固定位置
}

/**
 * visualViewport 变化处理器
 * 弹窗使用 position: fixed，保持在屏幕固定位置
 */
function handleVisualViewportChange(): void {
  // 弹窗使用 position: fixed，无需更新位置
}

/**
 * Calculate button position from mouse event
 * 将按钮放置在鼠标释放位置附近
 * 这样无论用户从哪个方向选择文本，按钮都会出现在鼠标位置
 */
function getButtonPositionFromMouse(event: MouseEvent): { x: number; y: number } {
  return {
    x: event.clientX + BUTTON_OFFSET_PX,
    y: event.clientY - BUTTON_OFFSET_PX,
  };
}

/**
 * Calculate button position from range (降级方案)
 * 当没有鼠标事件时使用，放置在选区末尾
 */
function getButtonPositionFromRange(range: Range): { x: number; y: number } {
  // 获取选区的所有矩形（每行一个矩形）
  const rects = range.getClientRects();

  if (rects.length === 0) {
    // 降级：使用整体边界框
    const rect = range.getBoundingClientRect();
    return {
      x: rect.right + BUTTON_OFFSET_PX,
      y: rect.top - BUTTON_OFFSET_PX,
    };
  }

  // 使用最后一个矩形（选区末尾所在行）
  const lastRect = rects[rects.length - 1];

  return {
    x: lastRect.right + BUTTON_OFFSET_PX,
    y: lastRect.top - BUTTON_OFFSET_PX,
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

/** 标记是否正在分析中，防止 mouseup 事件清除状态 */
let isAnalyzingInProgress = false;

/**
 * Handle text selection (mouseup event)
 */
function handleMouseUp(event: MouseEvent): void {
  // 忽略来自 Shadow DOM 内部的事件（如点击分析按钮）
  if (isClickInsideShadow(event)) {
    return;
  }

  // 保存鼠标位置，用于在 setTimeout 中使用
  const mouseX = event.clientX;
  const mouseY = event.clientY;

  // Small delay to ensure selection is finalized
  setTimeout(() => {
    // 如果正在分析中，不要清除状态
    if (isAnalyzingInProgress) {
      return;
    }

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

    // 检查是否跳过中文文本
    if (currentSettings.skipChineseText && isPredominantlyChinese(text)) {
      console.log('[LingoRecall] Skipping Chinese text selection');
      if (currentSelection) {
        currentSelection = null;
        currentAnalysisResult = null;
        hideUI();
      }
      return;
    }

    const range = selection.getRangeAt(0);
    // 使用鼠标释放位置来定位按钮
    const position = {
      x: mouseX + BUTTON_OFFSET_PX,
      y: mouseY - BUTTON_OFFSET_PX,
    };

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

  // 检查是否跳过中文文本
  if (currentSettings.skipChineseText && isPredominantlyChinese(text)) {
    console.log('[LingoRecall] Skipping Chinese text selection (keyboard)');
    if (currentSelection) {
      currentSelection = null;
      currentAnalysisResult = null;
      hideUI();
    }
    return;
  }

  const range = selection.getRangeAt(0);
  // 键盘选择时使用 range 位置作为降级方案
  const position = getButtonPositionFromRange(range);

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

  // 设置分析中标志，防止 mouseup 事件清除状态
  isAnalyzingInProgress = true;

  // 确定分析模式
  const mode = getAnalysisMode(currentSelection.text);
  console.log('[LingoRecall] Analyzing:', currentSelection.text.substring(0, 50), '...', `(mode: ${mode})`);

  // Show loading state
  showLoading();
  currentAnalysisResult = null;

  // Build context from SourceLocation if available
  const sourceLocation = currentSelection.sourceLocation;
  const context = sourceLocation
    ? `${sourceLocation.contextBefore}${currentSelection.text}${sourceLocation.contextAfter}`
    : getSelectionContext(currentSelection.range);

  try {
    // Send message to service worker with analysis mode
    const response = await sendMessage(MessageTypes.ANALYZE_WORD, {
      text: currentSelection.text,
      context,
      url: window.location.href,
      xpath: sourceLocation?.xpath || '',
      mode,
    });

    if (response.success && response.data) {
      currentAnalysisResult = response.data;
      // Show result popup
      showResult(response.data);
    } else {
      // 特殊处理扩展上下文失效错误（静默处理，仅显示用户提示）
      if (response.error?.code === ErrorCode.EXTENSION_CONTEXT_INVALIDATED) {
        showError(i18n.t('analysis.toast.extensionUpdated'));
      } else {
        // Handle other errors - show friendly message
        console.error('[LingoRecall] Analysis failed:', response.error);
        showError(response.error?.message || i18n.t('analysis.errors.generic'));
      }
    }
  } catch (error) {
    // 检查是否为扩展上下文失效错误（静默处理，仅显示用户提示）
    const isContextError = error instanceof Error &&
        (error.message.includes('Extension context invalidated') ||
         error.message.includes('context invalidated'));

    if (isContextError) {
      showError(i18n.t('analysis.toast.extensionUpdated'));
    } else {
      console.error('[LingoRecall] Analysis error:', error);
      showError(i18n.t('analysis.errors.generic'));
    }
  } finally {
    // 清除分析中标志
    isAnalyzingInProgress = false;
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

  // 翻译模式下不支持保存
  const mode = getAnalysisMode(currentSelection.text);
  if (mode === 'translate') {
    showToast(i18n.t('analysis.toast.translationNotSavable'), 'info');
    return;
  }

  console.log('[LingoRecall] Saving:', currentSelection.text);

  const analysisResult = currentAnalysisResult;
  // 验证分析结果：meaning 和 partOfSpeech 是必需的
  // pronunciation 对短语来说是可选的（AI 可能省略短语的音标）
  const hasAnalysis = Boolean(
    analysisResult &&
      analysisResult.meaning.trim() &&
      analysisResult.partOfSpeech.trim()
  );

  if (!hasAnalysis) {
    showToast(i18n.t('analysis.toast.completeAnalysisFirst'), 'warning');
    return;
  }

  const sourceLocation =
    currentSelection.sourceLocation ?? extractSourceLocationFromRange(currentSelection.range);

  if (!sourceLocation || !sourceLocation.xpath) {
    showToast(i18n.t('analysis.toast.locationError'), 'error');
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
      showToast(i18n.t('analysis.toast.saveSuccess'), 'success');
      hideUI();
      currentSelection = null;
      currentAnalysisResult = null;
    } else {
      // AC2: 显示重复检测或其他错误提示（静默处理上下文失效错误）
      if (response.error?.code === ErrorCode.EXTENSION_CONTEXT_INVALIDATED) {
        showToast(i18n.t('analysis.toast.extensionUpdated'), 'error');
      } else if (response.error?.code === ErrorCode.DUPLICATE_WORD) {
        showToast(i18n.t('analysis.toast.duplicateWord'), 'warning');
      } else {
        console.error('[LingoRecall] Save failed:', response.error);
        showToast(response.error?.message || i18n.t('analysis.toast.saveFailed'), 'error');
      }
    }
  } catch (error) {
    // 检查是否为扩展上下文失效错误（静默处理，仅显示用户提示）
    const isContextError = error instanceof Error &&
        (error.message.includes('Extension context invalidated') ||
         error.message.includes('context invalidated'));

    if (isContextError) {
      showToast(i18n.t('analysis.toast.extensionUpdated'), 'error');
    } else {
      console.error('[LingoRecall] Save error:', error);
      showToast(i18n.t('analysis.toast.saveRetry'), 'error');
    }
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

// ============================================================
// Full Page Translation Handlers
// ============================================================

/**
 * Handle keyboard shortcut for full page translation
 * Option+A (Alt+A) triggers full page translation
 */
function handleKeyboardShortcut(event: KeyboardEvent): void {
  // Debug: Log all key events with Alt/Option key
  if (event.altKey) {
    console.log('[LingoRecall] Alt key detected, key:', event.key, 'code:', event.code);
  }

  // Check for Option+A (Alt+A) on Mac, or Alt+A on Windows/Linux
  // On Mac, Option+A may produce special characters like 'å', so we also check for code
  if (event.altKey && (event.key === 'a' || event.key === 'A' || event.key === 'å' || event.code === 'KeyA')) {
    event.preventDefault();
    event.stopPropagation();

    console.log('[LingoRecall] Full page translation shortcut triggered (Option+A)');
    handleFullPageTranslation();
  }
}

/**
 * Handle full page translation
 * Triggered by Option+A keyboard shortcut
 */
async function handleFullPageTranslation(): Promise<void> {
  const state = getTranslationState();

  // If already translated, toggle between original and translated
  if (state === 'translated') {
    handleToggleTranslation();
    return;
  }

  // If currently translating, ignore
  if (state === 'translating') {
    console.log('[LingoRecall] Translation already in progress');
    return;
  }

  // Start translation
  console.log('[LingoRecall] Starting full page translation');

  // 立即显示加载状态，让用户知道翻译已开始
  updatePageTranslation({
    state: 'translating',
    progress: 0,
    total: 0,
    showingTranslation: false,
  });

  // Get target language from settings
  const targetLanguage = currentSettings.targetLanguage === 'auto'
    ? 'zh-CN' // Default to Simplified Chinese if auto
    : currentSettings.targetLanguage;

  try {
    const result = await translatePage(targetLanguage as import('../shared/types/settings').TargetLanguage);

    if (result.success) {
      if (result.translatedCount > 0) {
        showToast(
          i18n.t('pageTranslation.success', {
            count: result.translatedCount,
            defaultValue: `Translated ${result.translatedCount} text segments`,
          }),
          'success'
        );
      } else {
        showToast(
          i18n.t('pageTranslation.noContent', 'No translatable content found'),
          'info'
        );
      }
    } else {
      showToast(
        result.error || i18n.t('pageTranslation.failed', 'Translation failed'),
        'error'
      );
    }
  } catch (error) {
    // 更好地处理错误信息
    let errorMessage: string;
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      const errObj = error as Record<string, unknown>;
      errorMessage = errObj.message as string || errObj.error as string || JSON.stringify(error);
    } else {
      errorMessage = String(error) || 'Unknown error';
    }
    console.error('[LingoRecall] Full page translation error:', errorMessage);

    // 清除翻译状态
    updatePageTranslation(null);

    showToast(
      errorMessage || i18n.t('pageTranslation.failed', 'Translation failed'),
      'error'
    );
  }
}

/**
 * Handle toggle between original and translated text
 */
function handleToggleTranslation(): void {
  toggleTranslation();

  // Update UI state
  updatePageTranslation({
    state: 'translated',
    progress: 0,
    total: 0,
    showingTranslation: isShowingTranslation(),
  });
}

/**
 * Handle restore original text
 */
function handleRestoreOriginal(): void {
  restoreOriginal();

  // Clear translation state
  updatePageTranslation(null);

  showToast(
    i18n.t('pageTranslation.restored', 'Original text restored'),
    'info'
  );
}

/**
 * Handle translation bar close
 */
function handleTranslationBarClose(): void {
  // Just hide the bar, don't restore original text
  updatePageTranslation(null);
}

/**
 * Get surrounding context for selected text
 * Returns up to 100 characters before and after selection
 * 使用 extractContext 函数确保获取的上下文来自紧凑的语义容器，
 * 避免包含不相关的页面元素（如 Twitter 的互动数据等）
 */
function getSelectionContext(range: Range): string {
  try {
    const selectedText = range.toString();

    // 使用 extractContext 获取更精确的上下文
    // 它会优先选择较小的语义容器（如 <p>、<span>），避免大容器（如 <article>）
    const contextInfo = extractContext(range, 100);

    // 组合上下文
    const context = `${contextInfo.contextBefore}${selectedText}${contextInfo.contextAfter}`;

    return context.trim() || selectedText;
  } catch {
    return range.toString();
  }
}

// ============================================================
// Story 4.3: Blacklist State
// ============================================================

/** 标记当前站点是否被黑名单禁用 */
let isBlacklisted = false;

/** 设置加载超时时间 (30ms) - 超过此时间使用默认设置 */
const SETTINGS_LOAD_TIMEOUT_MS = 30;

/**
 * 带超时的 Promise 包装器 - 使用更可靠的实现
 * 避免 chrome.storage API 在复杂页面上阻塞过长时间
 * 使用 AbortController 模式确保超时一定生效
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  let resolved = false;

  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.log(`[LingoRecall] Settings load timeout after ${timeoutMs}ms, using defaults`);
        resolve(fallback);
      }
    }, timeoutMs);
  });

  return Promise.race([
    promise.then((result) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
      }
      return result;
    }),
    timeoutPromise,
  ]);
}

/**
 * 从 chrome.storage.local 加载设置
 * 带超时机制，避免在复杂页面上阻塞初始化
 * @returns Settings 对象或 null (如果加载失败)
 */
async function loadSettingsFromStorage(): Promise<Settings | null> {
  const defaultSettings: Settings = {
    ...DEFAULT_SETTINGS,
    blacklistUrls: [...DEFAULT_SETTINGS.blacklistUrls],
  };

  try {
    // 检查 chrome.storage 是否可用
    if (!chrome?.storage?.local) {
      console.warn('[LingoRecall] chrome.storage.local not available');
      return defaultSettings;
    }

    // 使用超时机制，避免 storage API 阻塞过长
    const result = await withTimeout(
      chrome.storage.local.get(STORAGE_KEYS.SETTINGS),
      SETTINGS_LOAD_TIMEOUT_MS,
      {} // 超时时返回空对象，使用默认设置
    );

    const storedSettings = result[STORAGE_KEYS.SETTINGS] as Partial<Settings> | undefined;

    if (storedSettings) {
      return {
        ...DEFAULT_SETTINGS,
        ...storedSettings,
        blacklistUrls: storedSettings.blacklistUrls || [...DEFAULT_SETTINGS.blacklistUrls],
      };
    }

    return defaultSettings;
  } catch (error) {
    console.warn('[LingoRecall] Failed to load settings:', error);
    return defaultSettings;
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
 * 使用 queueMicrotask 避免阻塞初始化
 */
function notifyIconState(disabled: boolean): void {
  // 使用 queueMicrotask 延迟执行，不阻塞初始化
  queueMicrotask(() => {
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
  });
}

// ============================================================
// Content Script Initialization
// ============================================================

/** 标记初始设置是否使用了超时回退 */
let settingsLoadedFromTimeout = false;

/**
 * 异步加载完整设置（用于超时回退后的延迟加载）
 * 不阻塞初始化流程
 */
async function loadSettingsDeferred(): Promise<void> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    const storedSettings = result[STORAGE_KEYS.SETTINGS] as Partial<Settings> | undefined;

    if (storedSettings) {
      const fullSettings: Settings = {
        ...DEFAULT_SETTINGS,
        ...storedSettings,
        blacklistUrls: storedSettings.blacklistUrls || [...DEFAULT_SETTINGS.blacklistUrls],
      };
      applySettings(fullSettings);
      console.log('[LingoRecall] Deferred settings loaded successfully');
    }
  } catch (error) {
    console.warn('[LingoRecall] Deferred settings load failed:', error);
  }
}

/**
 * Initialize the content script
 * Sets up event listeners and UI components
 *
 * Story 4.3 - AC3: 检查黑名单后才初始化功能
 */
async function init(): Promise<void> {
  const startTime = performance.now();

  // 性能测量辅助函数
  const mark = (label: string) => {
    const elapsed = performance.now() - startTime;
    console.log(`[LingoRecall] [${elapsed.toFixed(1)}ms] ${label}`);
  };

  mark('init() started');

  // 初始化消息监听器（即使被黑名单，也需要监听设置变更）
  initContentMessageListener();
  mark('Message listener initialized');

  // Story 4.3: 加载设置并检查黑名单（带超时机制）
  const settingsLoadStart = performance.now();
  const settings = await loadSettingsFromStorage();
  const settingsLoadTime = performance.now() - settingsLoadStart;
  mark(`Settings loaded (took ${settingsLoadTime.toFixed(1)}ms)`);

  // 检测是否因超时使用了默认设置
  settingsLoadedFromTimeout = settingsLoadTime >= SETTINGS_LOAD_TIMEOUT_MS - 5;

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
    mark('Blacklisted - extension disabled');
    return; // 提前退出，不初始化 UI 功能
  }

  // 通知 Service Worker 站点未被黑名单（恢复正常图标）
  notifyIconState(false);
  mark('Icon state notified');

  // Initialize Shadow DOM module (Story 1.4)
  initShadowModule();
  mark('Shadow module initialized');

  // Set up UI callbacks
  setCallbacks({
    onAnalyze: handleAnalyze,
    onSave: handleSave,
    onClose: handleClose,
    onToastClose: dismissToast,
    onToggleTranslation: handleToggleTranslation,
    onRestoreOriginal: handleRestoreOriginal,
    onTranslationBarClose: handleTranslationBarClose,
  });

  // Set up page translation progress callback
  setProgressCallback((progress, total, state) => {
    updatePageTranslation({
      state,
      progress,
      total,
      showingTranslation: isShowingTranslation(),
    });
  });

  // Initialize SPA navigation listener to clear translation state on page navigation
  // This prevents translated text from being reapplied to new pages in SPAs like Twitter
  initSpaNavigationListener();

  // Set up selection event listeners
  // 使用 bubble phase (false) 而不是 capture phase (true)
  // 这样可以避免被页面 JS 在 capture phase 阻止事件
  document.addEventListener('mouseup', handleMouseUp, false);
  document.addEventListener('keyup', handleKeyUp, false);
  document.addEventListener('click', handleDocumentClick, false);

  // Set up keyboard shortcut listener for full page translation (Option+A)
  document.addEventListener('keydown', handleKeyboardShortcut, false);
  console.log('[LingoRecall] Keyboard shortcut listener registered (Option+A / Alt+A for full page translation)');

  // Set up scroll and resize listeners for position updates (fix drift issue)
  // 使用 passive: true 提高滚动性能
  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', handleResize, { passive: true });

  // 监听 visualViewport 变化（用于检测 pinch-zoom 等）
  // 注意：弹窗使用 position: fixed，这些事件处理器目前不做任何操作
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleVisualViewportChange);
    window.visualViewport.addEventListener('scroll', handleVisualViewportChange);
  }

  mark('Event listeners attached');

  // Story 1.3 + 1.5 已实现:
  // - 文本选择监听
  // - XPath 提取和位置信息

  const loadTime = performance.now() - startTime;
  mark(`Initialization complete (total: ${loadTime.toFixed(2)}ms)`);

  // Performance check per Story 1.3 requirement
  // 使用 console.log 而非 console.warn，避免在 Chrome 扩展错误面板显示
  if (loadTime > 100) {
    console.log(`[LingoRecall] Initialization took ${loadTime.toFixed(2)}ms (target: <100ms) - check detailed timing above`);
  }

  // 如果初始设置加载超时，异步加载完整设置
  if (settingsLoadedFromTimeout) {
    console.log('[LingoRecall] Settings load timed out, loading deferred...');
    // 使用 requestIdleCallback 或 setTimeout 延迟加载，不影响主线程
    if ('requestIdleCallback' in window) {
      (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(loadSettingsDeferred);
    } else {
      setTimeout(loadSettingsDeferred, 100);
    }
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
  getButtonPositionFromMouse,
  getButtonPositionFromRange,
  isValidSelection,
  // Story 4.3: Blacklist functions
  checkBlacklist,
  loadSettingsFromStorage,
};
