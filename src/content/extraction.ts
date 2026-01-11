/**
 * LingoRecall AI - Unified Extraction Module
 * 提供统一的文本选择信息提取功能
 * 整合 XPath、偏移量和上下文提取，返回完整的 SourceLocation
 *
 * @module content/extraction
 */

import type { SourceLocation } from '../shared/types/location';
import { getXPath, getTextPosition, evaluateXPath, verifyXPathText } from './xpath';
import { extractContext } from './context';

export type { SourceLocation } from '../shared/types/location';

/**
 * 从当前选择中提取完整的源位置信息
 * 这是主要的导出函数，整合所有定位信息
 *
 * @param selection - 浏览器选择对象
 * @returns 完整的 SourceLocation 对象，如果选择无效则返回 null
 *
 * @example
 * const selection = window.getSelection();
 * if (selection) {
 *   const location = extractSourceLocation(selection);
 *   if (location) {
 *     console.log('XPath:', location.xpath);
 *     console.log('Original text:', location.originalText);
 *     console.log('Context:', location.contextBefore, '...', location.contextAfter);
 *   }
 * }
 */
export function extractSourceLocation(selection: Selection): SourceLocation | null {
  // 验证选择有效性
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const rawText = selection.toString();
  const selectedText = rawText.trim();

  // 空文本选择无效
  if (!selectedText) {
    return null;
  }

  // 获取文本位置信息（XPath + 偏移量）
  const position = getTextPosition(range);
  if (!position) {
    console.warn('[LingoRecall] Failed to get text position');
    return null;
  }

  // 处理首尾空白，保证 offset/length 与原文一致
  const leadingWhitespace = rawText.length - rawText.trimStart().length;
  const trailingWhitespace = rawText.length - rawText.trimEnd().length;
  const adjustedLength = Math.max(0, position.textLength - leadingWhitespace - trailingWhitespace);
  if (adjustedLength === 0) {
    return null;
  }
  const adjustedOffset = position.textOffset + leadingWhitespace;

  // 获取上下文信息
  const context = extractContext(range);

  // 组装完整的 SourceLocation
  return {
    xpath: position.xpath,
    textOffset: adjustedOffset,
    textLength: adjustedLength,
    contextBefore: context.contextBefore,
    contextAfter: context.contextAfter,
    originalText: selectedText,
    sourceUrl: window.location.href,
    sourceTitle: document.title,
  };
}

/**
 * 从 Range 对象提取源位置信息
 * 当已有 Range 对象时使用此函数，避免重新获取
 *
 * @param range - 选择范围对象
 * @returns 完整的 SourceLocation 对象，如果范围无效则返回 null
 */
export function extractSourceLocationFromRange(range: Range): SourceLocation | null {
  if (!range) {
    return null;
  }

  const rawText = range.toString();
  const selectedText = rawText.trim();

  if (!selectedText) {
    return null;
  }

  const position = getTextPosition(range);
  if (!position) {
    return null;
  }

  const leadingWhitespace = rawText.length - rawText.trimStart().length;
  const trailingWhitespace = rawText.length - rawText.trimEnd().length;
  const adjustedLength = Math.max(0, position.textLength - leadingWhitespace - trailingWhitespace);
  if (adjustedLength === 0) {
    return null;
  }
  const adjustedOffset = position.textOffset + leadingWhitespace;

  const context = extractContext(range);

  return {
    xpath: position.xpath,
    textOffset: adjustedOffset,
    textLength: adjustedLength,
    contextBefore: context.contextBefore,
    contextAfter: context.contextAfter,
    originalText: selectedText,
    sourceUrl: window.location.href,
    sourceTitle: document.title,
  };
}

/**
 * 验证源位置信息是否仍然有效
 * 检查 XPath 是否能定位到原始文本
 *
 * @param location - 源位置信息
 * @returns 验证结果对象
 *
 * @example
 * const result = verifyLocation(savedLocation);
 * if (result.valid) {
 *   console.log('Location still valid');
 * } else {
 *   console.log('Location invalid:', result.reason);
 *   // 可以尝试使用上下文匹配作为回退
 * }
 */
export function verifyLocation(location: SourceLocation): {
  valid: boolean;
  reason?: string;
  method?: 'xpath' | 'context';
} {
  // 首先尝试 XPath 定位
  const xpathValid = verifyXPathText(
    location.xpath,
    location.originalText,
    location.textOffset,
    location.textLength
  );

  if (xpathValid) {
    return { valid: true, method: 'xpath' };
  }

  // XPath 失效，尝试上下文匹配
  const contextMatch = findByContext(location);
  if (contextMatch) {
    return { valid: true, method: 'context' };
  }

  return {
    valid: false,
    reason: 'XPath invalid and context match failed',
  };
}

/**
 * 使用上下文信息在页面中查找文本
 * 当 XPath 失效时的回退策略
 *
 * @param location - 源位置信息
 * @returns 找到的 Range 对象，如果未找到则返回 null
 */
export function findByContext(location: SourceLocation): Range | null {
  const { contextBefore, contextAfter, originalText } = location;

  // 构建搜索模式：上下文前 + 原文 + 上下文后
  const searchPattern = contextBefore + originalText + contextAfter;

  // 在整个文档中搜索
  const bodyText = document.body.textContent || '';

  // 查找包含模式的位置
  const patternIndex = bodyText.indexOf(searchPattern);
  if (patternIndex === -1) {
    // 尝试只用原文搜索
    const originalIndex = bodyText.indexOf(originalText);
    if (originalIndex === -1) {
      return null;
    }

    // 找到了原文，但没有完整上下文匹配
    // 返回 null 表示不够精确
    return null;
  }

  // 找到了完整匹配，创建 Range
  // 计算原文在模式中的起始位置
  const textStartInBody = patternIndex + contextBefore.length;

  // 使用 TreeWalker 在 DOM 中定位文本
  return createRangeForText(originalText, textStartInBody);
}

/**
 * 在文档中为指定文本创建 Range
 * 使用 TreeWalker 遍历文本节点
 *
 * @param text - 要定位的文本
 * @param approximateOffset - 在 body.textContent 中的大致偏移
 * @returns Range 对象，如果未找到则返回 null
 */
function createRangeForText(text: string, approximateOffset: number): Range | null {
  const treeWalker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null
  );

  let currentOffset = 0;
  let node: Text | null;

  while ((node = treeWalker.nextNode() as Text)) {
    const nodeText = node.textContent || '';
    const nodeLength = nodeText.length;

    // 检查目标偏移是否在当前节点范围内
    if (currentOffset + nodeLength > approximateOffset) {
      // 在当前节点中查找文本
      const localOffset = approximateOffset - currentOffset;
      const foundIndex = nodeText.indexOf(text, Math.max(0, localOffset - text.length));

      if (foundIndex !== -1) {
        const range = document.createRange();
        range.setStart(node, foundIndex);
        range.setEnd(node, foundIndex + text.length);
        return range;
      }
    }

    currentOffset += nodeLength;
  }

  return null;
}

/**
 * 高亮显示源位置对应的文本
 * 用于跳回原文时的视觉提示
 *
 * @param location - 源位置信息
 * @returns 是否成功高亮
 */
export function highlightSourceLocation(location: SourceLocation): boolean {
  // 首先验证当前页面 URL 是否匹配
  if (window.location.href !== location.sourceUrl) {
    console.warn('[LingoRecall] URL mismatch, cannot highlight');
    return false;
  }

  // 尝试 XPath 定位
  const node = evaluateXPath(location.xpath);
  if (node) {
    const text = node.textContent || '';
    const foundText = text.substring(
      location.textOffset,
      location.textOffset + location.textLength
    );

    if (foundText === location.originalText) {
      // XPath 定位成功，创建 Range 并高亮
      try {
        const range = document.createRange();

        if (node.nodeType === Node.TEXT_NODE) {
          range.setStart(node, location.textOffset);
          range.setEnd(node, location.textOffset + location.textLength);
        } else {
          // 如果是元素节点，需要找到正确的文本节点
          const textNode = findTextNodeAtOffset(node, location.textOffset);
          if (textNode) {
            range.setStart(textNode.node, textNode.localOffset);
            range.setEnd(textNode.node, textNode.localOffset + location.textLength);
          } else {
            return false;
          }
        }

        // 滚动到视图并选中
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);

          // 滚动到选中区域
          const element = range.commonAncestorContainer.parentElement;
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }

          return true;
        }
      } catch (error) {
        console.error('[LingoRecall] Highlight error:', error);
      }
    }
  }

  // XPath 失效，尝试上下文匹配
  const contextRange = findByContext(location);
  if (contextRange) {
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(contextRange);

      const element = contextRange.commonAncestorContainer.parentElement;
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      return true;
    }
  }

  return false;
}

/**
 * 在节点中查找指定偏移量处的文本节点
 *
 * @param node - 起始节点
 * @param offset - 目标偏移量
 * @returns 文本节点和本地偏移量，如果未找到则返回 null
 */
function findTextNodeAtOffset(
  node: Node,
  offset: number
): { node: Text; localOffset: number } | null {
  const treeWalker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null);

  let currentOffset = 0;
  let textNode: Text | null;

  while ((textNode = treeWalker.nextNode() as Text)) {
    const nodeLength = (textNode.textContent || '').length;

    if (currentOffset + nodeLength > offset) {
      return {
        node: textNode,
        localOffset: offset - currentOffset,
      };
    }

    currentOffset += nodeLength;
  }

  return null;
}

// 导出工具函数供其他模块使用
export { getXPath, getTextPosition, evaluateXPath } from './xpath';
export { extractContext, getFullContext } from './context';
