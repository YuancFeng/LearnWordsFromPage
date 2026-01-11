/**
 * LingoRecall AI - HighlightedText Component
 * Story 4.5 - Task 1: 文本高亮组件
 *
 * 用于在搜索结果中高亮显示匹配的文本
 *
 * @module popup/components/HighlightedText
 */

import React from 'react';

/**
 * 转义正则表达式特殊字符
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * HighlightedText 属性
 */
export interface HighlightedTextProps {
  /** 要显示的文本 */
  text: string;
  /** 要高亮的关键词 */
  keyword: string;
  /** 高亮样式类名 */
  highlightClassName?: string;
}

/**
 * 文本高亮组件
 * Story 4.5 - AC1: 搜索结果高亮匹配文本
 *
 * @example
 * ```tsx
 * <HighlightedText
 *   text="Hello World"
 *   keyword="World"
 * />
 * // 结果: Hello <mark>World</mark>
 * ```
 */
export function HighlightedText({
  text,
  keyword,
  highlightClassName = 'bg-yellow-200 rounded px-0.5',
}: HighlightedTextProps): React.ReactElement {
  // 没有关键词时直接返回文本
  if (!keyword.trim()) {
    return <>{text}</>;
  }

  // 使用正则表达式分割文本，保留分隔符
  const escapedKeyword = escapeRegExp(keyword.trim());
  const parts = text.split(new RegExp(`(${escapedKeyword})`, 'gi'));

  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === keyword.toLowerCase() ? (
          <mark key={index} className={highlightClassName}>
            {part}
          </mark>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

/**
 * 高亮多个关键词的版本
 */
export function HighlightedTextMultiple({
  text,
  keywords,
  highlightClassName = 'bg-yellow-200 rounded px-0.5',
}: {
  text: string;
  keywords: string[];
  highlightClassName?: string;
}): React.ReactElement {
  if (!keywords.length || keywords.every((k) => !k.trim())) {
    return <>{text}</>;
  }

  const escapedKeywords = keywords
    .filter((k) => k.trim())
    .map((k) => escapeRegExp(k.trim()));

  if (escapedKeywords.length === 0) {
    return <>{text}</>;
  }

  const pattern = new RegExp(`(${escapedKeywords.join('|')})`, 'gi');
  const parts = text.split(pattern);

  const keywordsLower = keywords.map((k) => k.toLowerCase());

  return (
    <>
      {parts.map((part, index) =>
        keywordsLower.includes(part.toLowerCase()) ? (
          <mark key={index} className={highlightClassName}>
            {part}
          </mark>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

export default HighlightedText;
