/**
 * LingoRecall AI - NoResults Component
 * Story 2.5 实现 - AC3: 空结果状态
 *
 * 搜索无结果时显示的空状态组件
 *
 * @module popup/components/NoResults
 */

import React from 'react';
import { SearchX } from 'lucide-react';

/**
 * NoResults 组件属性
 */
export interface NoResultsProps {
  /** 当前搜索查询 */
  query: string;
  /** 清除搜索回调 */
  onClear: () => void;
}

/**
 * 空搜索结果组件
 * Story 2.5 - AC3: 显示 "No matching words found" 和 "Clear Search" 按钮
 *
 * @param props NoResultsProps
 * @returns React.ReactElement
 *
 * @example
 * ```tsx
 * <NoResults
 *   query={searchQuery}
 *   onClear={clearSearch}
 * />
 * ```
 */
export function NoResults({ query, onClear }: NoResultsProps): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {/* 搜索图标 */}
      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
        <SearchX size={40} className="text-gray-300" />
      </div>

      {/* 主标题 */}
      <h3 className="text-xl font-bold text-gray-900 mb-2">
        No matching words found
      </h3>

      {/* 搜索关键词提示 */}
      <p className="text-gray-400 mb-6 max-w-xs">
        No words match "<span className="font-medium text-gray-600">{query}</span>"
      </p>

      {/* 清除搜索按钮 */}
      <button
        onClick={onClear}
        className="px-6 py-2.5 bg-blue-50 text-blue-600 text-sm font-bold rounded-xl hover:bg-blue-100 transition-colors"
        type="button"
      >
        Clear Search
      </button>
    </div>
  );
}

export default NoResults;
