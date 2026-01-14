/**
 * LingoRecall AI - Text Matcher
 * Story 2.4 实现 - AC2: Context Fallback Matching
 *
 * 当 XPath 定位失效时，使用上下文进行精确匹配
 * 通过 contextBefore + text + contextAfter 在页面中查找匹配的文本
 *
 * 增强功能：
 * - 支持遍历 iframe 内的文档（同域）
 * - 支持遍历 Shadow DOM
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
  method: 'exact' | 'normalized' | 'text-only' | 'none';
}

// ============================================================
// 增强功能：支持 iframe 和 Shadow DOM 遍历
// ============================================================

/**
 * 收集当前 frame 中所有可访问的文档根节点
 * 包括：主文档、Shadow DOM
 *
 * 注意：不再遍历 iframe，因为使用了 all_frames: true，
 * 每个 iframe 都有自己的 content script 实例
 */
function collectAllDocumentRoots(): Node[] {
  const roots: Node[] = [document.body];

  // 收集当前文档中的 Shadow DOM
  collectShadowRoots(document.body, roots);

  const frameInfo = window === window.top ? 'top-frame' : 'iframe';
  console.log(`[LingoRecall] [${frameInfo}] Collected ${roots.length} document roots (body + shadow DOMs)`);

  return roots;
}

/**
 * 递归收集元素中的所有 Shadow Root
 */
function collectShadowRoots(root: Node, roots: Node[]): void {
  try {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_ELEMENT,
      null
    );

    let node: Node | null;
    while ((node = walker.nextNode())) {
      const element = node as Element;
      // 检查元素是否有 Shadow Root
      if (element.shadowRoot) {
        roots.push(element.shadowRoot);
        // 递归收集 Shadow Root 内的 Shadow DOM
        collectShadowRoots(element.shadowRoot, roots);
      }
    }
  } catch (e) {
    // 静默忽略遍历错误
  }
}

/**
 * 在指定根节点中创建 TreeWalker
 */
function createTextWalker(root: Node): TreeWalker {
  // 获取 root 所属的文档对象
  const ownerDocument = root.ownerDocument || document;

  return ownerDocument.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (parent) {
          const tagName = parent.tagName.toLowerCase();
          if (tagName === 'script' || tagName === 'style' || tagName === 'noscript') {
            return NodeFilter.FILTER_REJECT;
          }
          // 检查元素是否可见
          try {
            const style = (root.ownerDocument || document).defaultView?.getComputedStyle(parent);
            if (style && (style.display === 'none' || style.visibility === 'hidden')) {
              return NodeFilter.FILTER_REJECT;
            }
          } catch (e) {
            // 无法获取样式时，接受节点
          }
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );
}

/**
 * 使用上下文查找文本
 * Story 2.4 - AC2: 上下文回退匹配
 *
 * 匹配策略（按优先级）：
 * 1. 精确匹配: contextBefore + text + contextAfter
 * 2. 规范化匹配: 去除多余空白后匹配
 * 3. 仅文本匹配: 只用目标文本搜索（置信度较低）
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

  // 调试日志：显示搜索的内容
  console.log('[LingoRecall] Context search params:', {
    text,
    contextBefore: contextBefore.substring(0, 50) + (contextBefore.length > 50 ? '...' : ''),
    contextAfter: contextAfter.substring(0, 50) + (contextAfter.length > 50 ? '...' : ''),
  });

  try {
    // 策略 1: 精确匹配完整上下文
    const fullContext = `${contextBefore}${text}${contextAfter}`;
    const exactResult = findTextInDocument(fullContext, text, contextBefore.length);
    if (exactResult) {
      return { found: true, range: exactResult, confidence: 1.0, method: 'exact' };
    }

    // 策略 2: 规范化匹配（处理 SPA 等复杂 DOM 结构导致的空白差异）
    try {
      const normalizedContext = normalizeWhitespace(`${contextBefore}${text}${contextAfter}`);
      const normalizedBefore = normalizeWhitespace(contextBefore);
      const normalizedText = normalizeWhitespace(text);
      const normalizedResult = findNormalizedTextInDocument(
        normalizedContext,
        normalizedText,
        normalizedBefore.length
      );
      if (normalizedResult) {
        return { found: true, range: normalizedResult, confidence: 0.9, method: 'normalized' };
      }
    } catch (e) {
      console.log('[LingoRecall] Normalized matching failed, trying text-only:', e);
    }

    // 策略 3: 仅目标文本匹配（当上下文完全不匹配时的回退）
    // 对于 3 个字符以上的文本都可以尝试（单词级别）
    if (text.length >= 3) {
      try {
        const textOnlyResult = findTextOnlyInDocument(text);
        if (textOnlyResult) {
          return { found: true, range: textOnlyResult, confidence: 0.7, method: 'text-only' };
        }
      } catch (e) {
        console.log('[LingoRecall] Text-only matching failed:', e);
      }
    }
  } catch (e) {
    console.error('[LingoRecall] findTextByContext error:', e);
  }

  return { found: false, range: null, confidence: 0, method: 'none' };
}

/**
 * 规范化空白字符
 * 将连续的空白字符（空格、换行、制表符等）替换为单个空格
 */
function normalizeWhitespace(str: string): string {
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * 在文档中查找包含目标文本的上下文
 * 增强版：支持 iframe 和 Shadow DOM
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
  // 收集当前 frame 中的所有文档根节点
  const roots = collectAllDocumentRoots();

  // 在每个根节点中搜索
  for (const root of roots) {
    const result = findTextInRoot(root, fullText, targetText, targetOffset);
    if (result) {
      return result;
    }
  }

  return null;
}

/**
 * 在单个根节点中查找文本
 */
function findTextInRoot(
  root: Node,
  fullText: string,
  targetText: string,
  targetOffset: number
): Range | null {
  const walker = createTextWalker(root);

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

  // 调试：检查是否能找到目标文本（仅文本，不含上下文）
  const targetOnlyIndex = concatenatedText.indexOf(targetText);
  const rootType = root === document.body ? 'main-body' :
                   (root as ShadowRoot).host ? 'shadow-dom' : 'iframe';
  console.log(`[LingoRecall] Root "${rootType}": textLength=${concatenatedText.length}, targetFound=${targetOnlyIndex !== -1}, targetIndex=${targetOnlyIndex}`);

  // 查找完整上下文
  const contextIndex = concatenatedText.indexOf(fullText);
  if (contextIndex === -1) {
    // 如果完整上下文没找到，但目标文本找到了，打印更多信息
    if (targetOnlyIndex !== -1) {
      console.log(`[LingoRecall] Target "${targetText}" found at ${targetOnlyIndex}, but full context not matched`);
      // 打印目标文本周围的实际内容
      const actualBefore = concatenatedText.substring(Math.max(0, targetOnlyIndex - 30), targetOnlyIndex);
      const actualAfter = concatenatedText.substring(targetOnlyIndex + targetText.length, targetOnlyIndex + targetText.length + 30);
      console.log(`[LingoRecall] Actual context: "${actualBefore}" [${targetText}] "${actualAfter}"`);
    }
    return null;
  }

  // 计算目标文本在文档中的位置
  const targetStartInDoc = contextIndex + targetOffset;
  const targetEndInDoc = targetStartInDoc + targetText.length;

  // 创建 Range
  return createRangeFromOffsets(nodeMap, targetStartInDoc, targetEndInDoc);
}

/**
 * 在文档中查找规范化后的文本（处理空白差异）
 * 增强版：支持 iframe 和 Shadow DOM
 *
 * @param normalizedFullText - 规范化后的完整上下文
 * @param normalizedTargetText - 规范化后的目标文本
 * @param normalizedTargetOffset - 目标文本在规范化上下文中的偏移量
 * @returns Range 对象或 null
 */
function findNormalizedTextInDocument(
  normalizedFullText: string,
  normalizedTargetText: string,
  normalizedTargetOffset: number
): Range | null {
  // 收集所有文档根节点
  const roots = collectAllDocumentRoots();

  for (const root of roots) {
    const result = findNormalizedTextInRoot(root, normalizedFullText, normalizedTargetText, normalizedTargetOffset);
    if (result) {
      return result;
    }
  }

  return null;
}

/**
 * 在单个根节点中查找规范化文本
 */
function findNormalizedTextInRoot(
  root: Node,
  normalizedFullText: string,
  normalizedTargetText: string,
  normalizedTargetOffset: number
): Range | null {
  const walker = createTextWalker(root);

  // 收集文本节点并构建映射
  const textNodes: Text[] = [];
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    textNodes.push(node);
  }

  // 构建原始文本和规范化文本的映射
  let originalText = '';
  let normalizedText = '';
  const nodeMap: { node: Text; startOffset: number; endOffset: number }[] = [];
  const normalizedToOriginal: number[] = [];

  for (const textNode of textNodes) {
    const content = textNode.textContent || '';
    const startOffset = originalText.length;
    originalText += content;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      if (/\s/.test(char)) {
        if (normalizedText.length > 0 && !normalizedText.endsWith(' ')) {
          normalizedToOriginal.push(startOffset + i);
          normalizedText += ' ';
        }
      } else {
        normalizedToOriginal.push(startOffset + i);
        normalizedText += char;
      }
    }

    nodeMap.push({
      node: textNode,
      startOffset,
      endOffset: originalText.length,
    });
  }

  normalizedText = normalizedText.trim();

  const contextIndex = normalizedText.indexOf(normalizedFullText);
  if (contextIndex === -1) {
    return null;
  }

  const normalizedTargetStart = contextIndex + normalizedTargetOffset;
  const normalizedTargetEnd = normalizedTargetStart + normalizedTargetText.length;

  if (normalizedTargetStart >= normalizedToOriginal.length ||
      normalizedTargetEnd > normalizedToOriginal.length) {
    return null;
  }

  const originalTargetStart = normalizedToOriginal[normalizedTargetStart];
  const originalTargetEnd = normalizedTargetEnd < normalizedToOriginal.length
    ? normalizedToOriginal[normalizedTargetEnd]
    : originalText.length;

  return createRangeFromOffsets(nodeMap, originalTargetStart, originalTargetEnd);
}

/**
 * 在文档中仅通过目标文本查找（不使用上下文）
 * 增强版：支持 iframe 和 Shadow DOM
 *
 * @param targetText - 目标文本
 * @returns Range 对象或 null
 */
function findTextOnlyInDocument(targetText: string): Range | null {
  // 收集所有文档根节点
  const roots = collectAllDocumentRoots();

  for (const root of roots) {
    const result = findTextOnlyInRoot(root, targetText);
    if (result) {
      return result;
    }
  }

  return null;
}

/**
 * 在单个根节点中查找目标文本
 */
function findTextOnlyInRoot(root: Node, targetText: string): Range | null {
  const walker = createTextWalker(root);

  // 收集文本节点
  const textNodes: Text[] = [];
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    textNodes.push(node);
  }

  // 构建连接文本和节点映射
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

  // 查找目标文本（精确匹配）
  let targetIndex = concatenatedText.indexOf(targetText);

  // 如果精确匹配失败，尝试规范化匹配
  if (targetIndex === -1) {
    const normalizedTarget = normalizeWhitespace(targetText);
    const normalizedConcat = normalizeWhitespace(concatenatedText);
    const normalizedIndex = normalizedConcat.indexOf(normalizedTarget);

    if (normalizedIndex !== -1) {
      targetIndex = findOriginalIndex(concatenatedText, normalizedTarget);
    }
  }

  if (targetIndex === -1) {
    return null;
  }

  return createRangeFromOffsets(nodeMap, targetIndex, targetIndex + targetText.length);
}

/**
 * 在原始文本中查找规范化文本的起始位置
 * 通过比较规范化后的子串来定位
 */
function findOriginalIndex(originalText: string, normalizedTarget: string): number {
  // 滑动窗口方法：检查原文的每个可能的起始位置
  for (let i = 0; i <= originalText.length - normalizedTarget.length; i++) {
    // 从当前位置开始尝试匹配
    let j = i;
    let matched = 0;

    while (j < originalText.length && matched < normalizedTarget.length) {
      const origChar = originalText[j];
      const targetChar = normalizedTarget[matched];

      // 跳过原文中的多余空白
      if (/\s/.test(origChar)) {
        if (targetChar === ' ') {
          // 匹配空格，继续
          matched++;
          // 跳过原文中连续的空白
          while (j < originalText.length && /\s/.test(originalText[j])) {
            j++;
          }
        } else {
          // 原文有空白但目标没有，跳过原文的空白
          j++;
        }
      } else if (origChar === targetChar) {
        matched++;
        j++;
      } else {
        break;
      }
    }

    if (matched === normalizedTarget.length) {
      return i;
    }
  }

  return -1;
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
