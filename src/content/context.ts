/**
 * LingoRecall AI - Context Extraction Utilities
 * 提供选中文本上下文提取功能，用于文本匹配回退策略
 *
 * 当 XPath 因页面动态变化而失效时，可以使用上下文信息进行文本匹配定位
 *
 * @module content/context
 */

import type { ContextInfo } from '../shared/types/location';

/** 默认上下文长度：100 字符 */
const DEFAULT_CONTEXT_LENGTH = 100;

/**
 * 从选择范围中提取上下文信息
 * 获取选中文本前后各 100 字符的上下文
 *
 * @param range - 选择范围对象
 * @param contextLength - 上下文长度，默认 100 字符
 * @returns 上下文信息对象
 *
 * @example
 * const selection = window.getSelection();
 * if (selection && selection.rangeCount > 0) {
 *   const range = selection.getRangeAt(0);
 *   const context = extractContext(range);
 *   console.log(context);
 *   // { contextBefore: '...前文...', contextAfter: '...后文...' }
 * }
 */
export function extractContext(
  range: Range,
  contextLength: number = DEFAULT_CONTEXT_LENGTH
): ContextInfo {
  if (!range) {
    return {
      contextBefore: '',
      contextAfter: '',
    };
  }

  try {
    // 获取周围的文本
    const { before, after } = getSurroundingText(range);

    return {
      contextBefore: truncateStart(before, contextLength),
      contextAfter: truncateEnd(after, contextLength),
    };
  } catch (error) {
    console.error('[LingoRecall] Context extraction error:', error);
    return {
      contextBefore: '',
      contextAfter: '',
    };
  }
}

/**
 * 获取选择范围周围的文本
 * 使用 Range API 精确获取选区前后的文本内容
 *
 * @param range - 选择范围对象
 * @returns 包含前后文本的对象
 */
function getSurroundingText(range: Range): { before: string; after: string } {
  const container = range.commonAncestorContainer;

  // 找到合适的上下文容器
  // 如果是文本节点，向上查找到段落级别的容器
  let contextContainer: Node = container;

  // 尝试找到更合适的容器（如 <p>、<div>、<article> 等块级元素）
  if (container.nodeType === Node.TEXT_NODE) {
    const parent = container.parentElement;
    if (parent) {
      // 向上查找块级元素作为上下文容器
      contextContainer = findBlockContainer(parent) || parent;
    }
  } else if (container.nodeType === Node.ELEMENT_NODE) {
    contextContainer = findBlockContainer(container as Element) || container;
  }

  let before = '';
  let after = '';

  try {
    // 创建从容器起始到选择起点的范围
    const beforeRange = document.createRange();
    beforeRange.selectNodeContents(contextContainer);
    beforeRange.setEnd(range.startContainer, range.startOffset);
    before = beforeRange.toString();
  } catch (e) {
    // 如果创建范围失败，尝试使用备用方法
    console.warn('[LingoRecall] Before range creation failed, using fallback');
    before = getTextBeforeSelection(range);
  }

  try {
    // 创建从选择终点到容器末尾的范围
    const afterRange = document.createRange();
    afterRange.setStart(range.endContainer, range.endOffset);
    afterRange.selectNodeContents(contextContainer);
    afterRange.setStart(range.endContainer, range.endOffset);
    after = afterRange.toString();
  } catch (e) {
    // 如果创建范围失败，尝试使用备用方法
    console.warn('[LingoRecall] After range creation failed, using fallback');
    after = getTextAfterSelection(range);
  }

  return { before, after };
}

/**
 * 查找块级容器元素
 * 向上遍历 DOM 树，找到合适的块级父元素
 *
 * @param element - 起始元素
 * @returns 块级容器元素，如果未找到则返回 null
 */
function findBlockContainer(element: Element): Element | null {
  const blockTags = new Set([
    'P',
    'DIV',
    'ARTICLE',
    'SECTION',
    'MAIN',
    'ASIDE',
    'BLOCKQUOTE',
    'LI',
    'TD',
    'TH',
    'DD',
    'DT',
    'FIGCAPTION',
    'HEADER',
    'FOOTER',
    'NAV',
  ]);

  let current: Element | null = element;

  // 限制向上查找的层级，避免获取过多无关内容
  let maxDepth = 5;

  while (current && maxDepth > 0) {
    if (blockTags.has(current.tagName)) {
      return current;
    }
    current = current.parentElement;
    maxDepth--;
  }

  return null;
}

/**
 * 备用方法：获取选择前的文本
 * 当 Range API 失败时使用
 *
 * @param range - 选择范围
 * @returns 选择前的文本
 */
function getTextBeforeSelection(range: Range): string {
  const startNode = range.startContainer;
  const startOffset = range.startOffset;

  if (startNode.nodeType === Node.TEXT_NODE) {
    const text = startNode.textContent || '';
    return text.substring(0, startOffset);
  }

  return '';
}

/**
 * 备用方法：获取选择后的文本
 * 当 Range API 失败时使用
 *
 * @param range - 选择范围
 * @returns 选择后的文本
 */
function getTextAfterSelection(range: Range): string {
  const endNode = range.endContainer;
  const endOffset = range.endOffset;

  if (endNode.nodeType === Node.TEXT_NODE) {
    const text = endNode.textContent || '';
    return text.substring(endOffset);
  }

  return '';
}

/**
 * 从字符串开头截断，保留最后 n 个字符
 * 用于获取选区前的上下文
 *
 * @param text - 原始文本
 * @param maxLength - 最大保留长度
 * @returns 截断后的文本
 *
 * @example
 * truncateStart('Hello World', 5); // 'World'
 */
function truncateStart(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  // 保留最后 maxLength 个字符
  return text.slice(-maxLength);
}

/**
 * 从字符串末尾截断，保留前 n 个字符
 * 用于获取选区后的上下文
 *
 * @param text - 原始文本
 * @param maxLength - 最大保留长度
 * @returns 截断后的文本
 *
 * @example
 * truncateEnd('Hello World', 5); // 'Hello'
 */
function truncateEnd(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  // 保留前 maxLength 个字符
  return text.slice(0, maxLength);
}

/**
 * 获取完整的上下文（前后合并）
 * 用于调试和验证
 *
 * @param range - 选择范围
 * @param contextLength - 上下文长度
 * @returns 完整的上下文字符串
 */
export function getFullContext(
  range: Range,
  contextLength: number = DEFAULT_CONTEXT_LENGTH
): string {
  const context = extractContext(range, contextLength);
  const selectedText = range.toString();

  return `${context.contextBefore}[${selectedText}]${context.contextAfter}`;
}
