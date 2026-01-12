/**
 * LingoRecall AI - XPath Generation Utilities
 * 提供 XPath 生成和评估功能，用于精确定位 DOM 节点
 *
 * XPath 生成规则：
 * 1. 如果元素有 id 属性，使用 `//*[@id="xxx"]` 形式（最稳定）
 * 2. 否则使用索引形式如 `/html/body/div[2]/p[3]`
 * 3. 文本节点使用 `/text()[n]` 形式
 *
 * @module content/xpath
 */

import type { TextPosition, XPathEvaluationResult } from '../shared/types/location';

/**
 * 为给定的 DOM 节点生成唯一的 XPath 表达式
 * 优先使用 id 属性以获得更稳定的路径
 *
 * @param node - 目标 DOM 节点
 * @returns XPath 表达式字符串，如果无法生成则返回空字符串
 *
 * @example
 * // 元素有 id 的情况
 * const div = document.getElementById('main');
 * getXPath(div); // '//*[@id="main"]'
 *
 * @example
 * // 普通元素的情况
 * const p = document.querySelector('div > p:nth-child(2)');
 * getXPath(p); // '/html/body/div[1]/p[2]'
 *
 * @example
 * // 文本节点的情况
 * const textNode = document.querySelector('p').firstChild;
 * getXPath(textNode); // '/html/body/p[1]/text()[1]'
 */
export function getXPath(node: Node): string {
  // 空节点检查
  if (!node) {
    return '';
  }

  // 处理文本节点 - 需要找到父元素并计算文本节点索引
  if (node.nodeType === Node.TEXT_NODE) {
    const parent = node.parentElement;
    if (!parent) {
      return '';
    }

    // 查找当前文本节点在兄弟文本节点中的索引
    const textNodes = Array.from(parent.childNodes).filter(
      (n) => n.nodeType === Node.TEXT_NODE
    );
    const textIndex = textNodes.indexOf(node as ChildNode) + 1;

    // 递归获取父元素的 XPath，然后添加文本节点部分
    return `${getXPath(parent)}/text()[${textIndex}]`;
  }

  // 只处理元素节点
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const element = node as Element;

  // 如果是 html 元素，返回根路径
  if (element.tagName.toLowerCase() === 'html') {
    return '/html';
  }

  // 如果元素有唯一 id，直接使用 id 选择器（最稳定的方式）
  if (element.id) {
    // 检查 id 是否唯一（某些页面可能有重复 id）
    const elementsWithSameId = document.querySelectorAll(`#${CSS.escape(element.id)}`);
    if (elementsWithSameId.length === 1) {
      return `//*[@id="${element.id}"]`;
    }
  }

  // 构建基于索引的路径
  const parts: string[] = [];
  let current: Element | null = element;

  while (current && current !== document.documentElement) {
    let selector = current.tagName.toLowerCase();

    // 再次检查当前元素是否有唯一 id（可以提前结束递归）
    if (current.id) {
      const elementsWithSameId = document.querySelectorAll(`#${CSS.escape(current.id)}`);
      if (elementsWithSameId.length === 1) {
        parts.unshift(`//*[@id="${current.id}"]`);
        break;
      }
    }

    // 计算在同标签名兄弟元素中的索引
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (child) => child.tagName === current!.tagName
      );

      // 只有当存在多个同标签兄弟时才添加索引
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `[${index}]`;
      }
    }

    parts.unshift(selector);
    current = parent;
  }

  // 如果路径以 id 选择器开始，直接返回
  if (parts.length > 0 && parts[0].startsWith('//*[@id=')) {
    return parts.join('/');
  }

  // 否则从 html 开始构建完整路径
  return '/html/' + parts.join('/');
}

/**
 * 评估 XPath 表达式并返回匹配的第一个节点
 *
 * @param xpath - XPath 表达式
 * @returns 匹配的节点，如果没有匹配或发生错误则返回 null
 *
 * @example
 * const node = evaluateXPath('//*[@id="main"]/p[1]');
 * if (node) {
 *   console.log(node.textContent);
 * }
 */
export function evaluateXPath(xpath: string): Node | null {
  if (!xpath) {
    return null;
  }

  try {
    const result = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    return result.singleNodeValue;
  } catch (error) {
    console.error('[LingoRecall] XPath evaluation error:', error);
    return null;
  }
}

/**
 * 评估 XPath 并返回详细的评估结果
 * 包含成功状态、节点引用和可能的错误信息
 *
 * @param xpath - XPath 表达式
 * @returns 评估结果对象
 */
export function evaluateXPathWithDetails(xpath: string): XPathEvaluationResult {
  if (!xpath) {
    return {
      found: false,
      node: null,
      error: 'Empty XPath expression',
    };
  }

  try {
    const result = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );

    const node = result.singleNodeValue;
    return {
      found: node !== null,
      node,
    };
  } catch (error) {
    return {
      found: false,
      node: null,
      error: error instanceof Error ? error.message : 'Unknown XPath error',
    };
  }
}

/**
 * 获取选择范围的文本位置信息
 * 包含 XPath、偏移量和长度
 *
 * @param range - 选择范围对象
 * @returns 文本位置信息，如果无法获取则返回 null
 *
 * @example
 * const selection = window.getSelection();
 * if (selection && selection.rangeCount > 0) {
 *   const range = selection.getRangeAt(0);
 *   const position = getTextPosition(range);
 *   console.log(position);
 *   // { xpath: '/html/body/p[1]/text()[1]', textOffset: 5, textLength: 10 }
 * }
 */
export function getTextPosition(range: Range): TextPosition | null {
  if (!range) {
    return null;
  }

  const text = range.toString();
  if (!text) {
    return null;
  }

  // 使用共同祖先作为定位容器，支持跨节点选择
  const commonAncestor = range.commonAncestorContainer;
  const container = commonAncestor.nodeType === Node.ELEMENT_NODE
    ? (commonAncestor as Element)
    : commonAncestor.parentElement;

  const fallbackElement = range.startContainer.nodeType === Node.ELEMENT_NODE
    ? (range.startContainer as Element)
    : range.startContainer.parentElement;

  const targetElement = container || fallbackElement;
  if (!targetElement) {
    return null;
  }

  const xpath = getXPath(targetElement);
  if (!xpath) {
    return null;
  }

  try {
    const beforeRange = document.createRange();
    beforeRange.selectNodeContents(targetElement);
    beforeRange.setEnd(range.startContainer, range.startOffset);
    const beforeText = beforeRange.toString();

    return {
      xpath,
      textOffset: beforeText.length,
      textLength: text.length,
    };
  } catch (error) {
    console.warn('[LingoRecall] Failed to calculate relative offset, falling back to startOffset', error);
    return {
      xpath,
      textOffset: range.startOffset,
      textLength: text.length,
    };
  }
}

/**
 * 验证 XPath 是否能正确定位到预期的文本
 *
 * @param xpath - XPath 表达式
 * @param expectedText - 预期的文本内容
 * @param offset - 文本偏移量
 * @param length - 文本长度
 * @returns 是否匹配成功
 */
export function verifyXPathText(
  xpath: string,
  expectedText: string,
  offset: number,
  length: number
): boolean {
  const node = evaluateXPath(xpath);
  if (!node) {
    return false;
  }

  const text = node.textContent || '';
  const found = text.substring(offset, offset + length);

  return found === expectedText;
}

// ============================================================
// Story 2.4: Highlight Location Functions
// ============================================================

/**
 * 获取指定偏移量处的文本节点
 * 遍历元素的所有文本子节点，找到包含目标偏移量的节点
 *
 * @param element - 父元素节点
 * @param targetOffset - 目标字符偏移量
 * @returns 包含目标偏移量的文本节点及其本地偏移量
 */
export function getTextNodeAtOffset(
  element: Node,
  targetOffset: number
): { node: Text; localOffset: number } | null {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);

  let currentOffset = 0;
  let textNode: Text | null;

  while ((textNode = walker.nextNode() as Text | null)) {
    const nodeLength = textNode.textContent?.length || 0;

    if (currentOffset + nodeLength > targetOffset) {
      return {
        node: textNode,
        localOffset: targetOffset - currentOffset,
      };
    }

    currentOffset += nodeLength;
  }

  return null;
}

/**
 * 使用 XPath 和文本偏移量定位文本范围
 * Story 2.4 - AC1: XPath + textOffset 定位
 *
 * @param xpath - XPath 表达式
 * @param textOffset - 文本偏移量
 * @param textLength - 文本长度
 * @returns DOM Range 对象，如果定位失败返回 null
 */
export function locateTextByXPath(
  xpath: string,
  textOffset: number,
  textLength: number
): Range | null {
  const element = evaluateXPath(xpath);
  if (!element) {
    // XPath 失效是预期行为（SPA 动态 DOM），降级为 log 级别避免错误面板显示
    console.log('[LingoRecall] XPath evaluation returned null (will fallback to context match):', xpath);
    return null;
  }

  const textLocation = getTextNodeAtOffset(element, textOffset);
  if (!textLocation) {
    // 文本节点偏移失败也是 DOM 变化的预期情况
    console.log('[LingoRecall] Could not find text node at offset (will fallback to context match):', textOffset);
    return null;
  }

  const { node, localOffset } = textLocation;
  const nodeLength = node.textContent?.length || 0;

  // 检查文本是否在单个节点内
  if (localOffset + textLength <= nodeLength) {
    try {
      const range = document.createRange();
      range.setStart(node, localOffset);
      range.setEnd(node, localOffset + textLength);
      return range;
    } catch (error) {
      console.warn('[LingoRecall] Failed to create range in single node:', error);
      return null;
    }
  }

  // 处理跨越多个文本节点的情况
  return createMultiNodeRange(element, textOffset, textLength);
}

/**
 * 创建跨越多个文本节点的 Range
 *
 * @param element - 父元素
 * @param startOffset - 起始偏移量
 * @param length - 文本长度
 * @returns DOM Range 对象
 */
function createMultiNodeRange(
  element: Node,
  startOffset: number,
  length: number
): Range | null {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
  const range = document.createRange();

  let currentOffset = 0;
  let started = false;
  let remaining = length;
  let endSet = false;
  let textNode: Text | null;

  while ((textNode = walker.nextNode() as Text | null)) {
    const nodeLength = textNode.textContent?.length || 0;

    if (!started && currentOffset + nodeLength > startOffset) {
      // 设置范围起点
      const localStart = startOffset - currentOffset;
      range.setStart(textNode, localStart);
      started = true;
      remaining -= nodeLength - localStart;
    } else if (started) {
      if (remaining <= nodeLength) {
        // 设置范围终点
        range.setEnd(textNode, Math.max(0, remaining));
        endSet = true;
        break;
      }
      remaining -= nodeLength;
    }

    currentOffset += nodeLength;
  }

  return started && endSet ? range : null;
}
