/**
 * LingoRecall AI - Text Matcher
 * Story 2.4 实现 - AC2: Context Fallback Matching
 *
 * 当 XPath 定位失效时，使用上下文进行精确匹配
 * 通过 contextBefore + text + contextAfter 在页面中查找匹配的文本
 *
 * @module content/textMatcher
 */

/**
 * 上下文匹配结果
 */
export interface ContextMatchResult {
  /** 是否找到匹配 */
  found: boolean;
  /** 匹配的 DOM Range */
  range: Range | null;
  /** 匹配置信度 (0-1) */
  confidence: number;
  /** 匹配方法 */
  method: 'exact' | 'none';
}

/**
 * 使用上下文查找文本
 * Story 2.4 - AC2: 上下文回退匹配
 *
 * 匹配策略：
 * 1. 精确匹配: contextBefore + text + contextAfter
 *
 * @param contextBefore - 目标文本前的上下文
 * @param text - 目标文本
 * @param contextAfter - 目标文本后的上下文
 * @returns 匹配结果
 */
export function findTextByContext(
  contextBefore: string,
  text: string,
  contextAfter: string
): ContextMatchResult {
  if (!text) {
    return { found: false, range: null, confidence: 0, method: 'none' };
  }

  // 策略 1: 精确匹配完整上下文
  const fullContext = `${contextBefore}${text}${contextAfter}`;
  const exactResult = findTextInDocument(fullContext, text, contextBefore.length);
  if (exactResult) {
    return { found: true, range: exactResult, confidence: 1.0, method: 'exact' };
  }

  return { found: false, range: null, confidence: 0, method: 'none' };
}

/**
 * 在文档中查找包含目标文本的上下文
 *
 * @param fullText - 完整上下文文本
 * @param targetText - 目标文本
 * @param targetOffset - 目标文本在上下文中的偏移量
 * @returns Range 对象或 null
 */
function findTextInDocument(
  fullText: string,
  targetText: string,
  targetOffset: number
): Range | null {
  // 使用 TreeWalker 遍历所有文本节点
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        // 跳过脚本和样式元素内的文本
        const parent = node.parentElement;
        if (parent) {
          const tagName = parent.tagName.toLowerCase();
          if (tagName === 'script' || tagName === 'style' || tagName === 'noscript') {
            return NodeFilter.FILTER_REJECT;
          }
          // 跳过隐藏元素
          const style = window.getComputedStyle(parent);
          if (style.display === 'none' || style.visibility === 'hidden') {
            return NodeFilter.FILTER_REJECT;
          }
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  // 收集连续文本节点
  const textNodes: Text[] = [];
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    textNodes.push(node);
  }

  // 构建文本到节点的映射
  let concatenatedText = '';
  const nodeMap: { node: Text; startOffset: number; endOffset: number }[] = [];

  for (const textNode of textNodes) {
    const content = textNode.textContent || '';
    const startOffset = concatenatedText.length;
    concatenatedText += content;
    nodeMap.push({
      node: textNode,
      startOffset,
      endOffset: concatenatedText.length,
    });
  }

  // 查找完整上下文
  const contextIndex = concatenatedText.indexOf(fullText);
  if (contextIndex === -1) {
    return null;
  }

  // 计算目标文本在文档中的位置
  const targetStartInDoc = contextIndex + targetOffset;
  const targetEndInDoc = targetStartInDoc + targetText.length;

  // 创建 Range
  return createRangeFromOffsets(nodeMap, targetStartInDoc, targetEndInDoc);
}

/**
 * 根据全局偏移量创建 Range
 *
 * @param nodeMap - 节点映射数组
 * @param startOffset - 起始偏移量
 * @param endOffset - 结束偏移量
 * @returns Range 对象或 null
 */
function createRangeFromOffsets(
  nodeMap: { node: Text; startOffset: number; endOffset: number }[],
  startOffset: number,
  endOffset: number
): Range | null {
  const range = document.createRange();
  let startSet = false;

  for (const mapping of nodeMap) {
    // 设置起点
    if (!startSet && mapping.endOffset > startOffset) {
      const localOffset = startOffset - mapping.startOffset;
      try {
        range.setStart(mapping.node, Math.max(0, localOffset));
        startSet = true;
      } catch (e) {
        console.warn('[LingoRecall] Failed to set range start:', e);
        return null;
      }
    }

    // 设置终点
    if (startSet && mapping.endOffset >= endOffset) {
      const localOffset = endOffset - mapping.startOffset;
      try {
        range.setEnd(mapping.node, Math.min(localOffset, mapping.node.length));
        return range;
      } catch (e) {
        console.warn('[LingoRecall] Failed to set range end:', e);
        return null;
      }
    }
  }

  return startSet ? range : null;
}

/**
 * 验证 Range 是否匹配预期文本
 *
 * @param range - Range 对象
 * @param expectedText - 预期文本
 * @returns 是否匹配
 */
export function verifyRangeText(range: Range, expectedText: string): boolean {
  const actualText = range.toString();
  return actualText === expectedText;
}
