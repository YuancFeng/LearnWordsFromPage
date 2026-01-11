/**
 * LingoRecall AI - Highlight Module
 * Story 2.4 实现 - AC1: 高亮显示和滚动定位
 *
 * 功能：
 * - 在页面中高亮显示目标文本
 * - 平滑滚动到目标位置
 * - 5 秒后自动淡出高亮
 *
 * @module content/highlight
 */

/**
 * 高亮配置
 */
export interface HighlightConfig {
  /** 高亮背景色 */
  backgroundColor: string;
  /** 高亮动画持续时间 (毫秒) */
  animationDuration: number;
  /** 高亮淡出延迟 (毫秒) */
  fadeOutDelay: number;
  /** 滚动行为 */
  scrollBehavior: ScrollBehavior;
  /** 滚动位置 */
  scrollBlock: ScrollLogicalPosition;
}

/**
 * 默认高亮配置
 * Story 2.4 - AC1: #FEF08A 背景色，5 秒淡出
 */
const DEFAULT_CONFIG: HighlightConfig = {
  backgroundColor: '#FEF08A', // 黄色高亮
  animationDuration: 500,
  fadeOutDelay: 5000, // 5 秒后淡出
  scrollBehavior: 'smooth',
  scrollBlock: 'center',
};

/**
 * 高亮元素类名
 */
const HIGHLIGHT_CLASS = 'lingorecall-highlight';

/**
 * 高亮元素样式
 */
const HIGHLIGHT_STYLES = `
  .${HIGHLIGHT_CLASS} {
    background-color: #FEF08A !important;
    border-radius: 2px;
    padding: 0 2px;
    transition: background-color 0.5s ease-out;
    box-shadow: 0 0 0 2px rgba(254, 240, 138, 0.5);
  }
  .${HIGHLIGHT_CLASS}.fade-out {
    background-color: transparent !important;
    box-shadow: none;
  }
`;

/** 当前活动的高亮元素 */
let activeHighlights: HTMLElement[] = [];
/** 淡出定时器 */
let fadeOutTimer: number | null = null;

/**
 * 注入高亮样式
 */
function injectHighlightStyles(): void {
  const styleId = 'lingorecall-highlight-styles';
  if (document.getElementById(styleId)) {
    return;
  }

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = HIGHLIGHT_STYLES;
  document.head.appendChild(style);
}

/**
 * 收集 Range 内的文本片段
 * 将跨节点范围拆分为多个单节点 Range，避免破坏原有 DOM 结构
 *
 * @param range - 原始 Range
 * @returns 单节点 Range 列表
 */
function collectTextRanges(range: Range): Range[] {
  const root = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
    ? range.commonAncestorContainer
    : range.commonAncestorContainer.parentNode;

  if (!root) {
    return [];
  }

  const ranges: Range[] = [];
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        try {
          if (range.intersectsNode(node)) {
            return NodeFilter.FILTER_ACCEPT;
          }
        } catch (error) {
          console.warn('[LingoRecall] Failed to check range intersection:', error);
        }
        return NodeFilter.FILTER_REJECT;
      },
    }
  );

  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    const content = node.textContent || '';
    if (!content) {
      continue;
    }

    const segmentRange = document.createRange();
    segmentRange.selectNodeContents(node);

    if (range.startContainer === node) {
      segmentRange.setStart(node, range.startOffset);
    }
    if (range.endContainer === node) {
      segmentRange.setEnd(node, range.endOffset);
    }

    if (!segmentRange.collapsed) {
      ranges.push(segmentRange);
    }
  }

  return ranges;
}

/**
 * 使用 <mark> 包裹指定 Range（仅用于单文本节点范围）
 *
 * @param range - 单节点 Range
 * @returns 高亮元素或 null
 */
function wrapRangeWithMark(range: Range): HTMLElement | null {
  if (range.collapsed) {
    return null;
  }

  const highlightMark = document.createElement('mark');
  highlightMark.className = HIGHLIGHT_CLASS;

  try {
    range.surroundContents(highlightMark);
    return highlightMark;
  } catch (error) {
    console.warn('[LingoRecall] Failed to wrap range with mark:', error);
    return null;
  }
}

/**
 * 高亮指定的 Range
 * Story 2.4 - AC1: 黄色背景高亮，5 秒淡出
 *
 * @param range - 要高亮的 Range 对象
 * @param config - 高亮配置
 * @returns 是否成功高亮
 */
export function highlightRange(
  range: Range,
  config: Partial<HighlightConfig> = {}
): boolean {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  try {
    // 确保样式已注入
    injectHighlightStyles();

    // 清除之前的高亮
    clearHighlights();

    const highlightMarks: HTMLElement[] = [];

    // 单文本节点范围，直接包裹
    if (range.startContainer === range.endContainer && range.startContainer.nodeType === Node.TEXT_NODE) {
      const mark = wrapRangeWithMark(range);
      if (mark) {
        highlightMarks.push(mark);
      }
    } else {
      // 跨节点范围：拆分为多个单节点 Range 逐个包裹
      const segments = collectTextRanges(range);
      for (const segment of segments) {
        const mark = wrapRangeWithMark(segment);
        if (mark) {
          highlightMarks.push(mark);
        }
      }
    }

    if (highlightMarks.length === 0) {
      return false;
    }

    activeHighlights = highlightMarks;

    // 滚动到首个高亮位置
    scrollToHighlight(highlightMarks[0], mergedConfig);

    // 设置淡出定时器
    fadeOutTimer = window.setTimeout(() => {
      fadeOutHighlights();
    }, mergedConfig.fadeOutDelay);

    console.log('[LingoRecall] Text highlighted successfully');
    return true;
  } catch (error) {
    console.error('[LingoRecall] Failed to highlight range:', error);
    return false;
  }
}

/**
 * 滚动到高亮元素
 *
 * @param element - 高亮元素
 * @param config - 高亮配置
 */
function scrollToHighlight(element: HTMLElement, config: HighlightConfig): void {
  try {
    element.scrollIntoView({
      behavior: config.scrollBehavior,
      block: config.scrollBlock,
      inline: 'nearest',
    });
  } catch (error) {
    console.warn('[LingoRecall] Failed to scroll to highlight:', error);
    // 降级：使用 window.scrollTo
    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset + rect.top - window.innerHeight / 2;
    window.scrollTo({
      top: scrollTop,
      behavior: 'smooth',
    });
  }
}

/**
 * 淡出高亮效果
 */
function fadeOutHighlights(): void {
  for (const highlight of activeHighlights) {
    highlight.classList.add('fade-out');
  }

  // 淡出动画完成后移除高亮元素
  setTimeout(() => {
    removeHighlightElements();
  }, DEFAULT_CONFIG.animationDuration);
}

/**
 * 移除高亮元素，保留原始文本
 */
function removeHighlightElements(): void {
  for (const highlight of activeHighlights) {
    try {
      const parent = highlight.parentNode;
      if (parent) {
        // 将高亮内容移出，保留原始文本
        while (highlight.firstChild) {
          parent.insertBefore(highlight.firstChild, highlight);
        }
        parent.removeChild(highlight);
        // 合并相邻文本节点，尽量恢复原始结构
        parent.normalize();
      }
    } catch (error) {
      console.warn('[LingoRecall] Failed to remove highlight element:', error);
    }
  }
  activeHighlights = [];
}

/**
 * 清除所有高亮
 */
export function clearHighlights(): void {
  // 清除定时器
  if (fadeOutTimer !== null) {
    clearTimeout(fadeOutTimer);
    fadeOutTimer = null;
  }

  // 移除高亮元素
  removeHighlightElements();

  // 移除页面中可能残留的高亮元素
  const existingHighlights = document.querySelectorAll(`.${HIGHLIGHT_CLASS}`);
  existingHighlights.forEach((el) => {
    const parent = el.parentNode;
    if (parent) {
      while (el.firstChild) {
        parent.insertBefore(el.firstChild, el);
      }
      parent.removeChild(el);
      // 合并相邻文本节点，避免遗留碎片
      parent.normalize();
    }
  });
}

/**
 * 仅滚动到 Range 位置，不添加高亮
 * 用于定位失败时的降级处理
 *
 * @param range - Range 对象
 * @returns 是否成功滚动
 */
export function scrollToRange(range: Range): boolean {
  try {
    // 创建临时标记元素
    const marker = document.createElement('span');
    range.insertNode(marker);

    marker.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest',
    });

    // 立即移除标记
    marker.parentNode?.removeChild(marker);
    return true;
  } catch (error) {
    console.warn('[LingoRecall] Failed to scroll to range:', error);
    return false;
  }
}

/**
 * 高亮并滚动到指定文本
 * 综合功能入口
 *
 * @param range - Range 对象
 * @returns 高亮结果
 */
export interface HighlightResult {
  success: boolean;
  scrolledTo: boolean;
  highlighted: boolean;
}

export function highlightAndScroll(range: Range): HighlightResult {
  const highlighted = highlightRange(range);
  return {
    success: highlighted,
    scrolledTo: highlighted,
    highlighted,
  };
}
