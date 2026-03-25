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
import { ErrorCode } from '../shared/types/errors';
import type { TargetLanguage } from '../shared/types/settings';
import i18n from '../i18n';

// ============================================================
// Constants
// ============================================================

/** 每批翻译的最大文本数量（减小以避免超时） */
const BATCH_SIZE = 10;

/** 并发请求数量（设为1避免触发速率限制） */
const CONCURRENT_BATCHES = 1;

/** 批次间延迟（毫秒），避免触发速率限制 */
const BATCH_DELAY_MS = 1500;

/** 单个文本的最大字符数（超过则截断） */
const MAX_TEXT_LENGTH = 2000;

/** 单个批次的最大重试次数 */
const MAX_BATCH_RETRIES = 2;

/** 速率限制后等待一个完整冷却窗口，再继续当前批次 */
const RATE_LIMIT_RETRY_DELAY_MS = 65000;

/** 网络抖动 / 超时等瞬时问题的最小重试延迟 */
const TRANSIENT_ERROR_RETRY_DELAY_MS = 5000;

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
  partial?: boolean;
  completedAll?: boolean;
  error?: string;
}

/** 一个页面文本节点的完整翻译计划 */
interface TranslationPlan {
  /** 原始 DOM 节点信息 */
  nodeInfo: TextNodeInfo;
  /** 送给 AI 的分片 */
  segments: string[];
  /** 各分片的译文，索引与 segments 一一对应 */
  translatedSegments: string[];
}

/** 一个可独立发送给 AI 的翻译单元 */
interface TranslationUnit {
  /** 归属哪个文本节点计划 */
  planIndex: number;
  /** 该计划下的第几个分片 */
  segmentIndex: number;
  /** 实际要翻译的文本 */
  text: string;
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
 * 使用 span 包装器包装每个翻译的文本节点，避免多个文本节点共享父元素时属性被覆盖
 */
function applyTranslationDirect(
  node: Text,
  originalText: string,
  translatedText: string,
  _parentElement: HTMLElement
): void {
  // 存储到节点映射
  translatedNodes.set(node, {
    original: originalText,
    translated: translatedText,
  });

  // 创建 span 包装器来包装这个文本节点
  const wrapper = document.createElement('span');
  wrapper.setAttribute(TRANSLATED_ATTR, 'true');
  wrapper.setAttribute(ORIGINAL_TEXT_ATTR, originalText);
  wrapper.setAttribute(TRANSLATED_TEXT_ATTR, translatedText);
  wrapper.setAttribute(TRANSLATION_STATE_ATTR, 'showing-translation');
  wrapper.classList.add(TRANSLATED_CLASS);
  wrapper.style.cursor = 'pointer';
  wrapper.title = i18n.t('pageTranslation.clickToToggle', 'Click to toggle original/translation');

  // 将文本节点用 wrapper 包装
  node.parentNode?.insertBefore(wrapper, node);
  wrapper.appendChild(node);

  // 更新文本内容为翻译结果
  node.textContent = translatedText;

  // 添加点击切换功能
  wrapper.addEventListener('click', (e) => {
    // 如果点击的是链接或链接内的元素，不拦截，让链接正常跳转
    const target = e.target as HTMLElement;
    if (target.closest('a') || target.tagName === 'A') {
      return;
    }

    // 如果点击的是按钮或其他交互元素，也不拦截
    if (target.closest('button') || target.tagName === 'BUTTON') {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    toggleSingleElement(wrapper);
  });
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
 * 为长文本寻找一个“尽量自然”的切分点。
 * 优先按段落、换行、句号等边界切，只有实在找不到才硬切。
 */
function findSplitPoint(text: string, maxLength: number): number {
  const minSplitPoint = Math.floor(maxLength * 0.6);
  const searchWindow = text.slice(0, maxLength + 1);
  const separators = [
    '\n\n',
    '\n',
    '. ',
    '! ',
    '? ',
    '。', '！', '？',
    '; ',
    '；',
    ', ',
    '，',
    '、',
    ' ',
  ];

  for (const separator of separators) {
    const index = searchWindow.lastIndexOf(separator);
    if (index >= minSplitPoint) {
      return index + separator.length;
    }
  }

  return maxLength;
}

/**
 * 将超长文本拆成多个可独立翻译的片段。
 * 关键点：这里只分块，不截断，保证整段正文最终都能翻译到。
 */
function splitLongTextForTranslation(text: string): string[] {
  const normalizedText = text.trim();
  if (normalizedText.length <= MAX_TEXT_LENGTH) {
    return [normalizedText];
  }

  const segments: string[] = [];
  let remaining = normalizedText;

  while (remaining.length > MAX_TEXT_LENGTH) {
    const splitPoint = findSplitPoint(remaining, MAX_TEXT_LENGTH);
    const chunk = remaining.slice(0, splitPoint).trim();
    if (chunk) {
      segments.push(chunk);
    }
    remaining = remaining.slice(splitPoint).trim();
  }

  if (remaining) {
    segments.push(remaining);
  }

  return segments.length > 0 ? segments : [normalizedText];
}

/**
 * 把页面文本节点转换成翻译计划和翻译单元。
 * 一个超长文本节点会被拆成多个 unit，但最终仍会合并回同一个 DOM 节点。
 */
function buildTranslationUnits(textNodes: TextNodeInfo[]): {
  plans: TranslationPlan[];
  units: TranslationUnit[];
} {
  const plans = textNodes.map<TranslationPlan>((nodeInfo) => ({
    nodeInfo,
    segments: splitLongTextForTranslation(nodeInfo.originalText),
    translatedSegments: [],
  }));

  const units = plans.flatMap((plan, planIndex) =>
    plan.segments.map((text, segmentIndex) => ({
      planIndex,
      segmentIndex,
      text,
    }))
  );

  return { plans, units };
}

/**
 * 将长文本的多个译文片段重新拼成一个完整译文。
 * 中日韩目标语言默认不额外插入空格，避免译文出现奇怪空格。
 */
function joinTranslatedSegments(
  translatedSegments: string[],
  targetLanguage?: TargetLanguage
): string {
  const joiner = targetLanguage && ['zh-CN', 'zh-TW', 'ja', 'ko'].includes(targetLanguage)
    ? ''
    : ' ';

  return translatedSegments
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join(joiner)
    .trim();
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

    // 这些错误都不能静默降级为“原文就是结果”，否则上层会误判为已完成。
    if (
      errorInfo?.code === ErrorCode.AI_RATE_LIMIT ||
      errorInfo?.code === ErrorCode.AI_INVALID_KEY ||
      errorInfo?.code === ErrorCode.AI_API_ERROR ||
      errorInfo?.code === ErrorCode.EXTENSION_CONTEXT_INVALIDATED ||
      errorInfo?.code === ErrorCode.NETWORK_ERROR ||
      errorInfo?.code === ErrorCode.TIMEOUT
    ) {
      const errMsg = errorInfo?.code === ErrorCode.AI_RATE_LIMIT
        ? 'RATE_LIMIT'
        : errorInfo?.code === ErrorCode.EXTENSION_CONTEXT_INVALIDATED
          ? 'EXTENSION_CONTEXT_INVALIDATED'
          : errorMessage;
      throw new Error(errMsg);
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

    // 速率限制 / 熔断器 / 超时 / 网络错误 → 重新抛出让上层循环捕获并决定终止
    const normalized = errorMessage.toUpperCase();
    if (
      normalized.includes('RATE_LIMIT') ||
      normalized.includes('CIRCUIT_OPEN') ||
      normalized.includes('429') ||
      normalized.includes('TIMEOUT') ||
      normalized.includes('NETWORK')
    ) {
      throw new Error(errorMessage);
    }

    // 其他错误 → 返回原文（静默降级）
    return texts;
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
    const totalNodeCount = textNodes.length;

    if (totalNodeCount === 0) {
      currentState = 'idle';
      progressCallback?.(0, 0, 'idle');
      return {
        success: true,
        translatedCount: 0,
        totalCount: 0,
      };
    }

    const { plans, units } = buildTranslationUnits(textNodes);
    const totalUnitCount = units.length;

    console.log(
      `[LingoRecall PageTranslator] Found ${totalNodeCount} text nodes to translate ` +
      `(${totalUnitCount} translation units after long-text splitting)`
    );

    // 进度条展示 AI 实际要处理的单元数，比“节点数”更真实。
    progressCallback?.(0, totalUnitCount, 'translating');

    // 将所有翻译单元分成批次
    const batches: { batch: TranslationUnit[]; texts: string[]; startIndex: number }[] = [];
    for (let i = 0; i < units.length; i += BATCH_SIZE) {
      const batch = units.slice(i, i + BATCH_SIZE);
      const texts = batch.map((unit) => unit.text);
      batches.push({ batch, texts, startIndex: i });
    }

    console.log(`[LingoRecall PageTranslator] Split into ${batches.length} batches, processing ${CONCURRENT_BATCHES} at a time`);

    let processedUnitCount = 0;
    // 连续失败计数器（用于自适应中止）
    let consecutiveFailures = 0;
    // 自适应批次延迟（失败后翻倍）
    let adaptiveBatchDelay = BATCH_DELAY_MS;
    let abortedError: string | undefined;

    // 顺序处理批次（避免速率限制）
    for (let i = 0; i < batches.length; i += CONCURRENT_BATCHES) {
      const concurrentBatches = batches.slice(i, i + CONCURRENT_BATCHES);
      let batchHandled = false;
      let batchRetryCount = 0;

      while (!batchHandled) {
        try {
          // 发送翻译请求（CONCURRENT_BATCHES=1 时为顺序执行）
          const translationPromises = concurrentBatches.map(({ texts }) =>
            translateBatch(texts, targetLanguage)
          );

          // 等待请求完成
          const translationResults = await Promise.all(translationPromises);

          // 成功：重置连续失败计数和自适应延迟
          consecutiveFailures = 0;
          adaptiveBatchDelay = BATCH_DELAY_MS;

          // 只先缓存译文，等整个节点所有分片都齐了再一次性回写 DOM。
          concurrentBatches.forEach(({ batch }, batchIndex) => {
            const translations = translationResults[batchIndex];
            batch.forEach((unit, index) => {
              plans[unit.planIndex].translatedSegments[unit.segmentIndex] = translations[index];
            });
            processedUnitCount += batch.length;
          });

          batchHandled = true;
        } catch (batchError) {
          const batchErrorMessage = batchError instanceof Error ? batchError.message : String(batchError);
          const normalizedError = batchErrorMessage.toUpperCase();
          console.error(`[LingoRecall PageTranslator] Batch ${i / CONCURRENT_BATCHES + 1} failed:`, batchErrorMessage);

          if (normalizedError.includes('EXTENSION_CONTEXT_INVALIDATED')) {
            abortedError = '扩展已更新，请刷新页面后重试';
            break;
          }

          if (normalizedError.includes('API_KEY')) {
            abortedError = 'API Key 无效，请检查设置';
            break;
          }

          const isRateLimitError =
            normalizedError.includes('RATE_LIMIT') ||
            normalizedError.includes('CIRCUIT_OPEN') ||
            normalizedError.includes('429') ||
            normalizedError.includes('RESOURCE_EXHAUSTED');

          const isTransientError =
            isRateLimitError ||
            normalizedError.includes('TIMEOUT') ||
            normalizedError.includes('NETWORK') ||
            normalizedError.includes('FETCH');

          if (isTransientError && batchRetryCount < MAX_BATCH_RETRIES) {
            batchRetryCount++;
            const retryDelay = isRateLimitError
              ? RATE_LIMIT_RETRY_DELAY_MS
              : Math.max(adaptiveBatchDelay, TRANSIENT_ERROR_RETRY_DELAY_MS);
            console.warn(
              `[LingoRecall PageTranslator] Retrying batch ${i / CONCURRENT_BATCHES + 1} ` +
              `in ${retryDelay}ms (${batchRetryCount}/${MAX_BATCH_RETRIES})`
            );
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
            continue;
          }

          // 非致命失败会被统计为 partial；同一时间保持少量重试，避免长文一开始就彻底放弃。
          consecutiveFailures++;
          adaptiveBatchDelay = Math.min(adaptiveBatchDelay * 2, 12000);

          if (isRateLimitError) {
            abortedError = '请求过于频繁，剩余内容未完成翻译';
            break;
          }

          if (consecutiveFailures >= 2) {
            abortedError = '网络不稳定，剩余内容未完成翻译';
            console.warn(`[LingoRecall PageTranslator] ${consecutiveFailures} consecutive batch failures, aborting remaining batches`);
            break;
          }

          // 当前批次放弃，继续后续批次，最终会显示为 partial。
          batchHandled = true;
        }
      }

      if (abortedError) {
        break;
      }

      // 更新进度
      progressCallback?.(processedUnitCount, totalUnitCount, 'translating');

      // 批次间延迟（使用自适应延迟），避免触发 API 速率限制
      if (i + CONCURRENT_BATCHES < batches.length) {
        await new Promise((resolve) => setTimeout(resolve, adaptiveBatchDelay));
      }
    }

    let translatedCount = 0;
    plans.forEach((plan) => {
      if (plan.translatedSegments.length !== plan.segments.length) {
        return;
      }

      if (plan.translatedSegments.some((segment) => typeof segment !== 'string' || segment.length === 0)) {
        return;
      }

      const translatedText = plan.segments.length === 1
        ? plan.translatedSegments[0]
        : joinTranslatedSegments(plan.translatedSegments, targetLanguage);

      if (translatedText && normalizeText(translatedText) !== normalizeText(plan.nodeInfo.originalText)) {
        applyTranslation(plan.nodeInfo, translatedText);
        translatedCount++;
      }
    });

    const completedAll = !abortedError && processedUnitCount === totalUnitCount;

    // 判断翻译是否有实际成果
    if (translatedCount > 0) {
      currentState = 'translated';
      showingTranslation = true;
      progressCallback?.(
        completedAll ? totalUnitCount : processedUnitCount,
        totalUnitCount,
        'translated'
      );

      // 启动 MutationObserver 监听 DOM 变化，以便在 SPA 重新渲染时重新应用翻译
      startMutationObserver();
    } else if (consecutiveFailures > 0 || abortedError) {
      // 所有批次都失败了，没有任何翻译成功
      currentState = 'error';
      progressCallback?.(processedUnitCount, totalUnitCount, 'error');
    } else {
      // 没有需要翻译的内容（全部相同或为空）
      currentState = 'translated';
      showingTranslation = true;
      progressCallback?.(totalUnitCount, totalUnitCount, 'translated');
    }

    console.log(
      `[LingoRecall PageTranslator] Translated ${translatedCount}/${totalNodeCount} nodes, ` +
      `processed ${processedUnitCount}/${totalUnitCount} units, registry size: ${translationRegistry.size}`
    );

    return {
      success: completedAll,
      translatedCount,
      totalCount: totalNodeCount,
      partial: translatedCount > 0 && !completedAll,
      completedAll,
      error: !completedAll
        ? abortedError || '翻译部分失败，请稍后重试'
        : undefined,
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
 * 使用 DOM 查询遍历所有已翻译的 span 包装器
 */
export function toggleTranslation(): void {
  if (currentState !== 'translated') {
    return;
  }

  showingTranslation = !showingTranslation;

  // 查找所有已翻译的 span 包装器
  const translatedElements = document.querySelectorAll<HTMLElement>(`span[${TRANSLATED_ATTR}]`);

  translatedElements.forEach((wrapper) => {
    const original = wrapper.getAttribute(ORIGINAL_TEXT_ATTR);
    const translated = wrapper.getAttribute(TRANSLATED_TEXT_ATTR);

    if (!original || !translated) return;

    // span 包装器内应该只有一个直接的文本节点
    const textNode = wrapper.firstChild;
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;

    if (showingTranslation) {
      textNode.textContent = translated;
      wrapper.setAttribute(TRANSLATION_STATE_ATTR, 'showing-translation');
    } else {
      textNode.textContent = original;
      wrapper.setAttribute(TRANSLATION_STATE_ATTR, 'showing-original');
    }
  });

  console.log(`[LingoRecall PageTranslator] Toggled to ${showingTranslation ? 'translation' : 'original'} (${translatedElements.length} elements)`);
}

/**
 * 恢复原文（清除所有翻译）
 * 使用 DOM 查询遍历所有已翻译元素，以支持 SPA 重新渲染后的恢复
 * 移除 span 包装器，将文本节点放回原位
 */
export function restoreOriginal(): void {
  // 查找所有已翻译的 span 包装器（使用 DOM 查询）
  const translatedElements = document.querySelectorAll<HTMLElement>(`span[${TRANSLATED_ATTR}]`);
  let restoredCount = 0;

  translatedElements.forEach((wrapper) => {
    const original = wrapper.getAttribute(ORIGINAL_TEXT_ATTR);
    const parent = wrapper.parentNode;

    if (!parent) return;

    // 找到 wrapper 内的文本节点
    const textNode = findTextNode(wrapper);

    if (textNode && original) {
      // 恢复原文
      textNode.textContent = original;

      // 将文本节点从 wrapper 中移出，放回原位置
      parent.insertBefore(textNode, wrapper);

      // 移除 wrapper
      parent.removeChild(wrapper);

      restoredCount++;
    } else {
      // 如果没有文本节点，创建一个新的
      if (original) {
        const newTextNode = document.createTextNode(original);
        parent.insertBefore(newTextNode, wrapper);
      }
      parent.removeChild(wrapper);
      restoredCount++;
    }
  });

  // 清空内存中的 Map 和注册表
  translatedNodes.clear();
  translationRegistry.clear();
  currentState = 'idle';
  showingTranslation = true;

  // 停止 MutationObserver
  stopMutationObserver();

  console.log(`[LingoRecall PageTranslator] Restored original text (${restoredCount} elements)`);
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
