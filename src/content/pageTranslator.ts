/**
 * LingoRecall AI - Full Page Translation Module
 *
 * 提供全页翻译功能，支持：
 * - Option+A 快捷键触发
 * - 智能文本节点提取
 * - 分段批量翻译
 * - 原文/译文切换
 * - 翻译进度指示
 *
 * @module content/pageTranslator
 */

import {
  MessageTypes,
  sendMessage,
  type TranslatePageSegmentPayload,
  type TranslatePageSegmentResult,
} from '../shared/messaging';
import type { TargetLanguage } from '../shared/types/settings';
import i18n from '../i18n';

// ============================================================
// Constants
// ============================================================

/** 每批翻译的最大文本数量（增大以减少请求次数） */
const BATCH_SIZE = 30;

/** 并发请求数量（同时发送多少批次） */
const CONCURRENT_BATCHES = 3;

/** 单个文本的最大字符数（超过则截断） */
const MAX_TEXT_LENGTH = 2000;

/** 最小文本长度（低于此长度的纯数字/符号不翻译） */
const MIN_TEXT_LENGTH = 2;

/** 翻译标记的 data 属性名 */
const TRANSLATED_ATTR = 'data-lingorecall-translated';

/** 原文存储的 data 属性名 */
const ORIGINAL_TEXT_ATTR = 'data-lingorecall-original';

/** 译文存储的 data 属性名 */
const TRANSLATED_TEXT_ATTR = 'data-lingorecall-translation';

/** 翻译状态的 data 属性名（showing-original / showing-translation） */
const TRANSLATION_STATE_ATTR = 'data-lingorecall-state';

/** 翻译节点的样式类名 */
const TRANSLATED_CLASS = 'lingorecall-translated';

/** 不应翻译的标签名列表 */
const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'EMBED',
  'SVG', 'MATH', 'CODE', 'PRE', 'KBD', 'SAMP', 'VAR',
  'INPUT', 'TEXTAREA', 'SELECT',
  // 注意：不跳过 BUTTON，允许翻译按钮文本
  'CANVAS', 'VIDEO', 'AUDIO', 'IMG', 'PICTURE',
  'HEAD', 'META', 'LINK', 'TITLE',
]);

/** 不应翻译的属性选择器 */
const SKIP_SELECTORS = [
  '[contenteditable="true"]',
  '[data-lingorecall-translated]',
  '.lingorecall-root',
  'lingorecall-root',
];

// ============================================================
// Types
// ============================================================

/** 文本节点信息 */
interface TextNodeInfo {
  /** 文本节点 */
  node: Text;
  /** 原始文本 */
  originalText: string;
  /** 父元素 */
  parentElement: HTMLElement;
}

/** 翻译状态 */
export type TranslationState = 'idle' | 'translating' | 'translated' | 'error';

/** 翻译进度回调 */
export type ProgressCallback = (progress: number, total: number, state: TranslationState) => void;

/** 翻译结果 */
export interface TranslationResult {
  success: boolean;
  translatedCount: number;
  totalCount: number;
  error?: string;
}

// ============================================================
// State
// ============================================================

/** 当前翻译状态 */
let currentState: TranslationState = 'idle';

/** 是否显示翻译结果（true=译文，false=原文） */
let showingTranslation = true;

/** 进度回调 */
let progressCallback: ProgressCallback | null = null;

/** 已翻译的文本节点映射 */
const translatedNodes = new Map<Text, { original: string; translated: string }>();

/**
 * 翻译注册表：以规范化的原文为 key，存储翻译结果
 * 这个注册表独立于 DOM，即使 SPA 重新渲染也不会丢失
 */
const translationRegistry = new Map<string, string>();

/** MutationObserver 实例 */
let mutationObserver: MutationObserver | null = null;

/** 防抖定时器 */
let reapplyDebounceTimer: ReturnType<typeof setTimeout> | null = null;

/** 防抖延迟（毫秒）*/
const REAPPLY_DEBOUNCE_MS = 100;

/** 记录当前页面 URL，用于检测 SPA 导航 */
let currentPageUrl: string = '';

// ============================================================
// Translation Registry & MutationObserver
// ============================================================

/**
 * 检查 URL 是否发生了页面级别的变化
 * 对于 SPA 应用，URL 变化意味着导航到了新页面，需要清除翻译状态
 *
 * 判断逻辑：
 * - pathname 变化：绝对是新页面
 * - origin 变化：绝对是新页面
 * - 仅 hash 变化：可能是同页面锚点跳转，不清除
 * - 仅 search 变化：可能是筛选/分页，需要清除（内容可能变化）
 */
function hasNavigatedToNewPage(oldUrl: string, newUrl: string): boolean {
  if (!oldUrl || !newUrl) return false;

  try {
    const oldUrlObj = new URL(oldUrl);
    const newUrlObj = new URL(newUrl);

    // origin 或 pathname 变化，是新页面
    if (oldUrlObj.origin !== newUrlObj.origin) {
      return true;
    }

    if (oldUrlObj.pathname !== newUrlObj.pathname) {
      return true;
    }

    // 仅 search 参数变化，也视为新页面（内容可能完全不同）
    if (oldUrlObj.search !== newUrlObj.search) {
      return true;
    }

    // 仅 hash 变化，不是新页面（同页面锚点跳转）
    return false;
  } catch {
    // URL 解析失败，保守地认为是新页面
    return oldUrl !== newUrl;
  }
}

/**
 * 检测 SPA 导航并清除翻译状态
 * 在 MutationObserver 回调和其他适当的时机调用
 */
function checkAndClearOnNavigation(): boolean {
  const newUrl = window.location.href;

  // 首次调用，记录 URL 但不清除
  if (!currentPageUrl) {
    currentPageUrl = newUrl;
    return false;
  }

  // URL 没有变化
  if (currentPageUrl === newUrl) {
    return false;
  }

  // 检查是否是真正的页面导航
  if (hasNavigatedToNewPage(currentPageUrl, newUrl)) {
    console.log(`[LingoRecall PageTranslator] SPA navigation detected: ${currentPageUrl} -> ${newUrl}`);
    console.log('[LingoRecall PageTranslator] Clearing translation state for new page');

    // 更新 URL
    currentPageUrl = newUrl;

    // 清除翻译状态（但不恢复 DOM，因为 DOM 已经被 SPA 框架替换）
    clearTranslationStateOnly();

    return true;
  }

  // URL 变化但不是页面导航（如 hash 变化）
  currentPageUrl = newUrl;
  return false;
}

/**
 * 仅清除翻译状态（不操作 DOM）
 * 用于 SPA 导航时，DOM 已被框架替换，只需清除内存状态
 */
function clearTranslationStateOnly(): void {
  // 清空内存中的 Map 和注册表
  translatedNodes.clear();
  translationRegistry.clear();
  currentState = 'idle';
  showingTranslation = true;

  // 停止 MutationObserver
  stopMutationObserver();

  // 通知进度回调
  progressCallback?.(0, 0, 'idle');

  console.log('[LingoRecall PageTranslator] Translation state cleared (SPA navigation)');
}

/**
 * 规范化文本用于作为注册表的 key
 * 去除多余空白，保留基本结构
 */
function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * 检查文本是否在翻译注册表中
 */
function getTranslationFromRegistry(originalText: string): string | undefined {
  const normalized = normalizeText(originalText);
  return translationRegistry.get(normalized);
}

/**
 * 将翻译添加到注册表
 */
function addToRegistry(originalText: string, translatedText: string): void {
  const normalized = normalizeText(originalText);
  translationRegistry.set(normalized, translatedText);
}

/**
 * 重新应用翻译到新渲染的 DOM 元素
 * 遍历页面查找已在注册表中的文本并应用翻译
 */
function reapplyTranslationsFromRegistry(): void {
  if (currentState !== 'translated' || !showingTranslation) {
    return;
  }

  // 提取所有可翻译的文本节点
  const textNodes = extractTextNodesForReapply();
  let reappliedCount = 0;

  textNodes.forEach((nodeInfo) => {
    const { node, originalText, parentElement } = nodeInfo;

    // 检查是否已经被标记为已翻译
    if (parentElement.hasAttribute(TRANSLATED_ATTR)) {
      return;
    }

    // 查找注册表中的翻译
    const translation = getTranslationFromRegistry(originalText);
    if (translation && translation !== originalText) {
      // 应用翻译
      applyTranslationDirect(node, originalText, translation, parentElement);
      reappliedCount++;
    }
  });

  if (reappliedCount > 0) {
    console.log(`[LingoRecall PageTranslator] Reapplied ${reappliedCount} translations from registry`);
  }
}

/**
 * 直接应用翻译（不检查注册表，用于重新应用）
 */
function applyTranslationDirect(
  node: Text,
  originalText: string,
  translatedText: string,
  parentElement: HTMLElement
): void {
  // 存储到节点映射
  translatedNodes.set(node, {
    original: originalText,
    translated: translatedText,
  });

  // 更新文本内容
  node.textContent = translatedText;

  // 标记父元素
  parentElement.setAttribute(TRANSLATED_ATTR, 'true');
  parentElement.setAttribute(ORIGINAL_TEXT_ATTR, originalText);
  parentElement.setAttribute(TRANSLATED_TEXT_ATTR, translatedText);
  parentElement.setAttribute(TRANSLATION_STATE_ATTR, 'showing-translation');
  parentElement.classList.add(TRANSLATED_CLASS);

  // 添加点击切换功能
  if (!parentElement.hasAttribute('data-lingorecall-clickable')) {
    parentElement.setAttribute('data-lingorecall-clickable', 'true');
    parentElement.style.cursor = 'pointer';
    parentElement.title = i18n.t('pageTranslation.clickToToggle', 'Click to toggle original/translation');

    parentElement.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      // 如果点击的是链接或链接内的元素，不拦截，让链接正常跳转
      if (target.closest('a') || target.tagName === 'A') {
        return;
      }

      // 如果点击的是按钮或其他交互元素，也不拦截
      if (target.closest('button') || target.tagName === 'BUTTON') {
        return;
      }

      // 只在点击纯文本区域时切换原文/译文
      if (e.target === parentElement || (e.target as Node).nodeType === Node.TEXT_NODE) {
        e.preventDefault();
        e.stopPropagation();
        toggleSingleElement(parentElement);
      }
    });
  }
}

/**
 * 提取文本节点用于重新应用（不跳过已翻译的，因为我们需要检查它们）
 */
function extractTextNodesForReapply(root: Element = document.body): TextNodeInfo[] {
  const textNodes: TextNodeInfo[] = [];

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node: Text) => {
        const parent = node.parentElement;

        if (!parent) {
          return NodeFilter.FILTER_REJECT;
        }

        // 跳过已经标记的元素
        if (parent.hasAttribute(TRANSLATED_ATTR)) {
          return NodeFilter.FILTER_REJECT;
        }

        // 检查父元素及其祖先是否应该跳过
        let ancestor: Element | null = parent;
        while (ancestor) {
          if (shouldSkipElement(ancestor)) {
            return NodeFilter.FILTER_REJECT;
          }
          ancestor = ancestor.parentElement;
        }

        const text = node.textContent || '';
        if (!shouldTranslateText(text)) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    const parent = node.parentElement;
    if (parent) {
      textNodes.push({
        node,
        originalText: node.textContent || '',
        parentElement: parent,
      });
    }
  }

  return textNodes;
}

/**
 * 启动 MutationObserver 监听 DOM 变化
 */
function startMutationObserver(): void {
  if (mutationObserver) {
    return; // 已经在运行
  }

  // 记录当前 URL，用于检测 SPA 导航
  currentPageUrl = window.location.href;

  mutationObserver = new MutationObserver((mutations) => {
    // 首先检查是否发生了 SPA 导航
    // 如果导航到新页面，清除翻译状态并停止处理
    if (checkAndClearOnNavigation()) {
      return; // 已导航到新页面，不再重新应用翻译
    }

    // 检查是否有相关的 DOM 变化
    let hasRelevantChanges = false;

    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // 检查添加的节点是否包含文本内容
        for (const addedNode of mutation.addedNodes) {
          if (addedNode.nodeType === Node.ELEMENT_NODE || addedNode.nodeType === Node.TEXT_NODE) {
            hasRelevantChanges = true;
            break;
          }
        }
      }
      if (hasRelevantChanges) break;
    }

    if (hasRelevantChanges && currentState === 'translated' && showingTranslation) {
      // 使用防抖，避免频繁重新应用
      if (reapplyDebounceTimer) {
        clearTimeout(reapplyDebounceTimer);
      }
      reapplyDebounceTimer = setTimeout(() => {
        // 再次检查 URL，防止防抖期间发生导航
        if (checkAndClearOnNavigation()) {
          return;
        }
        reapplyTranslationsFromRegistry();
        reapplyDebounceTimer = null;
      }, REAPPLY_DEBOUNCE_MS);
    }
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  console.log('[LingoRecall PageTranslator] MutationObserver started');
}

/**
 * 停止 MutationObserver
 */
function stopMutationObserver(): void {
  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
    console.log('[LingoRecall PageTranslator] MutationObserver stopped');
  }

  if (reapplyDebounceTimer) {
    clearTimeout(reapplyDebounceTimer);
    reapplyDebounceTimer = null;
  }
}

// ============================================================
// Text Node Extraction
// ============================================================

/**
 * 检查元素是否应该跳过翻译
 */
function shouldSkipElement(element: Element): boolean {
  // 跳过特定标签
  if (SKIP_TAGS.has(element.tagName)) {
    return true;
  }

  // 跳过隐藏元素
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') {
    return true;
  }

  // 跳过特定选择器匹配的元素
  for (const selector of SKIP_SELECTORS) {
    try {
      if (element.matches(selector)) {
        return true;
      }
    } catch {
      // 忽略无效选择器
    }
  }

  return false;
}

/**
 * 检查文本是否需要翻译
 * 跳过纯数字、纯符号等不需要翻译的内容
 */
function shouldTranslateText(text: string): boolean {
  const trimmed = text.trim();

  // 跳过空白文本
  if (trimmed.length < MIN_TEXT_LENGTH) {
    return false;
  }

  // 跳过纯数字
  if (/^\d+$/.test(trimmed)) {
    return false;
  }

  // 跳过纯符号/标点
  if (/^[\s\p{P}\p{S}]+$/u.test(trimmed)) {
    return false;
  }

  // 跳过只有空白字符的文本
  if (/^\s+$/.test(text)) {
    return false;
  }

  return true;
}

/**
 * 提取页面中所有可翻译的文本节点
 */
function extractTextNodes(root: Element = document.body): TextNodeInfo[] {
  const textNodes: TextNodeInfo[] = [];

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node: Text) => {
        const parent = node.parentElement;

        // 跳过没有父元素的节点
        if (!parent) {
          return NodeFilter.FILTER_REJECT;
        }

        // 跳过已经翻译过的节点
        if (parent.hasAttribute(TRANSLATED_ATTR)) {
          return NodeFilter.FILTER_REJECT;
        }

        // 检查父元素及其祖先是否应该跳过
        let ancestor: Element | null = parent;
        while (ancestor) {
          if (shouldSkipElement(ancestor)) {
            return NodeFilter.FILTER_REJECT;
          }
          ancestor = ancestor.parentElement;
        }

        // 检查文本内容
        const text = node.textContent || '';
        if (!shouldTranslateText(text)) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    const parent = node.parentElement;
    if (parent) {
      textNodes.push({
        node,
        originalText: node.textContent || '',
        parentElement: parent,
      });
    }
  }

  return textNodes;
}

// ============================================================
// Translation Logic
// ============================================================

/**
 * 批量翻译文本
 */
async function translateBatch(
  texts: string[],
  targetLanguage?: TargetLanguage
): Promise<string[]> {
  try {
    const payload: TranslatePageSegmentPayload = {
      texts,
      targetLanguage,
    };

    const response = await sendMessage(MessageTypes.TRANSLATE_PAGE_SEGMENT, payload);

    if (response.success && response.data) {
      return (response.data as TranslatePageSegmentResult).translations;
    }

    // 更详细的错误信息
    const errorInfo = response.error;
    const errorMessage = errorInfo?.message || errorInfo?.code || JSON.stringify(errorInfo);
    console.error('[LingoRecall PageTranslator] Translation failed:', errorMessage);

    // 如果是配置错误，抛出异常让上层处理
    if (errorInfo?.code === 'AI_INVALID_KEY' || errorInfo?.code === 'AI_API_ERROR') {
      throw new Error(errorMessage);
    }

    return texts; // 其他失败时返回原文
  } catch (error) {
    // 处理各种错误类型
    let errorMessage: string;
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      const errObj = error as Record<string, unknown>;
      errorMessage = errObj.message as string || errObj.error as string || JSON.stringify(error);
    } else {
      errorMessage = String(error) || 'Unknown error';
    }
    console.error('[LingoRecall PageTranslator] Translation error:', errorMessage);
    throw new Error(errorMessage); // 重新抛出让上层处理
  }
}

/**
 * 应用翻译到文本节点
 */
function applyTranslation(nodeInfo: TextNodeInfo, translatedText: string): void {
  const { node, originalText, parentElement } = nodeInfo;

  // 保存到翻译注册表（独立于 DOM，SPA 重新渲染也不会丢失）
  addToRegistry(originalText, translatedText);

  // 使用直接应用函数
  applyTranslationDirect(node, originalText, translatedText, parentElement);
}

/**
 * 查找元素内的第一个文本节点
 * 用于在 SPA 重新渲染后找到新的文本节点
 */
function findTextNode(element: HTMLElement): Text | null {
  // 优先检查直接子节点
  for (const child of element.childNodes) {
    if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
      return child as Text;
    }
  }

  // 如果没有直接文本子节点，递归查找
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node: Text) => {
        if (node.textContent?.trim()) {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_REJECT;
      },
    }
  );

  return walker.nextNode() as Text | null;
}

/**
 * 切换单个元素的显示状态（使用 data 属性）
 */
function toggleSingleElement(element: HTMLElement): void {
  const original = element.getAttribute(ORIGINAL_TEXT_ATTR);
  const translated = element.getAttribute(TRANSLATED_TEXT_ATTR);
  const state = element.getAttribute(TRANSLATION_STATE_ATTR);

  if (!original || !translated) return;

  // 查找元素内的文本节点
  const textNode = findTextNode(element);
  if (!textNode) return;

  if (state === 'showing-translation') {
    textNode.textContent = original;
    element.setAttribute(TRANSLATION_STATE_ATTR, 'showing-original');
  } else {
    textNode.textContent = translated;
    element.setAttribute(TRANSLATION_STATE_ATTR, 'showing-translation');
  }
}

// ============================================================
// Public API
// ============================================================

/**
 * 设置进度回调
 */
export function setProgressCallback(callback: ProgressCallback | null): void {
  progressCallback = callback;
}

/**
 * 获取当前翻译状态
 */
export function getTranslationState(): TranslationState {
  return currentState;
}

/**
 * 检查页面是否已翻译
 * 检查翻译注册表，这是最可靠的来源
 */
export function isPageTranslated(): boolean {
  // 优先检查翻译注册表（最可靠）
  if (translationRegistry.size > 0) {
    return true;
  }
  // 备用检查：内存中的 Map
  if (translatedNodes.size > 0) {
    return true;
  }
  // 最后检查 DOM 中是否有已翻译的元素
  return document.querySelectorAll(`[${TRANSLATED_ATTR}]`).length > 0;
}

/**
 * 翻译整个页面
 */
export async function translatePage(
  targetLanguage?: TargetLanguage
): Promise<TranslationResult> {
  // 防止重复翻译
  if (currentState === 'translating') {
    return {
      success: false,
      translatedCount: 0,
      totalCount: 0,
      error: 'Translation already in progress',
    };
  }

  currentState = 'translating';
  progressCallback?.(0, 0, 'translating');

  try {
    // 提取文本节点
    const textNodes = extractTextNodes();
    const totalCount = textNodes.length;

    if (totalCount === 0) {
      currentState = 'idle';
      progressCallback?.(0, 0, 'idle');
      return {
        success: true,
        translatedCount: 0,
        totalCount: 0,
      };
    }

    console.log(`[LingoRecall PageTranslator] Found ${totalCount} text nodes to translate`);

    // 立即更新进度，显示找到的节点数量（从"分析页面"切换到"翻译中"）
    progressCallback?.(0, totalCount, 'translating');

    let translatedCount = 0;

    // 将所有文本节点分成批次
    const batches: { batch: TextNodeInfo[]; texts: string[]; startIndex: number }[] = [];
    for (let i = 0; i < textNodes.length; i += BATCH_SIZE) {
      const batch = textNodes.slice(i, i + BATCH_SIZE);
      const texts = batch.map((info) => {
        const text = info.originalText;
        return text.length > MAX_TEXT_LENGTH
          ? text.substring(0, MAX_TEXT_LENGTH) + '...'
          : text;
      });
      batches.push({ batch, texts, startIndex: i });
    }

    console.log(`[LingoRecall PageTranslator] Split into ${batches.length} batches, processing ${CONCURRENT_BATCHES} at a time`);

    // 并行处理多个批次
    for (let i = 0; i < batches.length; i += CONCURRENT_BATCHES) {
      const concurrentBatches = batches.slice(i, i + CONCURRENT_BATCHES);

      // 并行发送翻译请求
      const translationPromises = concurrentBatches.map(({ texts }) =>
        translateBatch(texts, targetLanguage)
      );

      // 等待所有并发请求完成
      const translationResults = await Promise.all(translationPromises);

      // 应用翻译结果
      concurrentBatches.forEach(({ batch }, batchIndex) => {
        const translations = translationResults[batchIndex];
        batch.forEach((nodeInfo, index) => {
          const translated = translations[index];
          if (translated && translated !== nodeInfo.originalText) {
            applyTranslation(nodeInfo, translated);
            translatedCount++;
          }
        });
      });

      // 更新进度
      const progress = Math.min((i + CONCURRENT_BATCHES) * BATCH_SIZE, totalCount);
      progressCallback?.(progress, totalCount, 'translating');

      // 短暂延迟，让 UI 有机会更新
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    currentState = 'translated';
    showingTranslation = true;
    progressCallback?.(totalCount, totalCount, 'translated');

    // 启动 MutationObserver 监听 DOM 变化，以便在 SPA 重新渲染时重新应用翻译
    startMutationObserver();

    console.log(`[LingoRecall PageTranslator] Translated ${translatedCount}/${totalCount} nodes, registry size: ${translationRegistry.size}`);

    return {
      success: true,
      translatedCount,
      totalCount,
    };
  } catch (error) {
    currentState = 'error';
    progressCallback?.(0, 0, 'error');

    // 更好地处理各种错误类型
    let errorMessage: string;
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      // 处理错误对象（如 API 返回的错误）
      const errObj = error as Record<string, unknown>;
      errorMessage = errObj.message as string || errObj.error as string || JSON.stringify(error);
    } else {
      errorMessage = String(error) || 'Unknown error';
    }
    console.error('[LingoRecall PageTranslator] Translation failed:', errorMessage);

    return {
      success: false,
      translatedCount: 0,
      totalCount: 0,
      error: errorMessage,
    };
  }
}

/**
 * 切换显示原文/译文
 * 使用 DOM 查询遍历所有已翻译元素，以支持 SPA 重新渲染后的切换
 */
export function toggleTranslation(): void {
  if (currentState !== 'translated') {
    return;
  }

  showingTranslation = !showingTranslation;

  // 查找所有已翻译的元素（使用 DOM 查询而非内存中的 Map）
  const translatedElements = document.querySelectorAll<HTMLElement>(`[${TRANSLATED_ATTR}]`);

  translatedElements.forEach((element) => {
    const original = element.getAttribute(ORIGINAL_TEXT_ATTR);
    const translated = element.getAttribute(TRANSLATED_TEXT_ATTR);

    if (!original || !translated) return;

    const textNode = findTextNode(element);
    if (!textNode) return;

    if (showingTranslation) {
      textNode.textContent = translated;
      element.setAttribute(TRANSLATION_STATE_ATTR, 'showing-translation');
    } else {
      textNode.textContent = original;
      element.setAttribute(TRANSLATION_STATE_ATTR, 'showing-original');
    }
  });

  console.log(`[LingoRecall PageTranslator] Toggled to ${showingTranslation ? 'translation' : 'original'} (${translatedElements.length} elements)`);
}

/**
 * 恢复原文（清除所有翻译）
 * 使用 DOM 查询遍历所有已翻译元素，以支持 SPA 重新渲染后的恢复
 */
export function restoreOriginal(): void {
  // 查找所有已翻译的元素（使用 DOM 查询）
  const translatedElements = document.querySelectorAll<HTMLElement>(`[${TRANSLATED_ATTR}]`);

  translatedElements.forEach((element) => {
    const original = element.getAttribute(ORIGINAL_TEXT_ATTR);

    if (original) {
      const textNode = findTextNode(element);
      if (textNode) {
        textNode.textContent = original;
      }
    }

    // 清除所有翻译相关的属性
    element.removeAttribute(TRANSLATED_ATTR);
    element.removeAttribute(ORIGINAL_TEXT_ATTR);
    element.removeAttribute(TRANSLATED_TEXT_ATTR);
    element.removeAttribute(TRANSLATION_STATE_ATTR);
    element.removeAttribute('data-lingorecall-clickable');
    element.classList.remove(TRANSLATED_CLASS);
    element.style.cursor = '';
    element.title = '';
  });

  // 清空内存中的 Map 和注册表
  translatedNodes.clear();
  translationRegistry.clear();
  currentState = 'idle';
  showingTranslation = true;

  // 停止 MutationObserver
  stopMutationObserver();

  console.log(`[LingoRecall PageTranslator] Restored original text (${translatedElements.length} elements)`);
}

/**
 * 检查是否正在显示翻译
 */
export function isShowingTranslation(): boolean {
  return showingTranslation;
}

// ============================================================
// SPA Navigation Detection
// ============================================================

/** 标记 SPA 导航监听器是否已初始化 */
let spaNavigationListenerInitialized = false;

/**
 * 初始化 SPA 导航监听器
 * 监听 popstate 事件和 pushState/replaceState 调用
 * 当检测到页面导航时，清除翻译状态
 */
export function initSpaNavigationListener(): void {
  if (spaNavigationListenerInitialized) {
    return;
  }

  // 记录初始 URL
  currentPageUrl = window.location.href;

  // 监听 popstate 事件（浏览器前进/后退按钮）
  window.addEventListener('popstate', () => {
    checkAndClearOnNavigation();
  });

  // 拦截 pushState 和 replaceState
  // 这是监听 SPA 前端路由导航的关键
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function(...args) {
    const result = originalPushState.apply(this, args);
    // 延迟检查，确保 URL 已更新
    setTimeout(() => checkAndClearOnNavigation(), 0);
    return result;
  };

  history.replaceState = function(...args) {
    const result = originalReplaceState.apply(this, args);
    // 延迟检查，确保 URL 已更新
    setTimeout(() => checkAndClearOnNavigation(), 0);
    return result;
  };

  spaNavigationListenerInitialized = true;
  console.log('[LingoRecall PageTranslator] SPA navigation listener initialized');
}
