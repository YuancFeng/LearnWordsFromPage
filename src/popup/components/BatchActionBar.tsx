/**
 * LingoRecall AI - BatchActionBar Component
 * Story 4.6 - Task 5: 批量选择操作栏
 *
 * 用于批量选择词汇后显示的操作工具栏
 *
 * @module popup/components/BatchActionBar
 */

import React from 'react';
import { Tag as TagIcon, X, Loader2 } from 'lucide-react';

/**
 * BatchActionBar 属性
 */
export interface BatchActionBarProps {
  /** 已选中的词汇数量 */
  selectedCount: number;
  /** 添加标签按钮点击回调 */
  onAddTags: () => void;
  /** 取消选择回调 */
  onClearSelection: () => void;
  /** 是否正在处理 */
  isProcessing?: boolean;
}

/**
 * 批量操作工具栏组件
 * Story 4.6 - AC4: 批量添加标签
 *
 * @example
 * ```tsx
 * <BatchActionBar
 *   selectedCount={5}
 *   onAddTags={() => setShowBatchTagPopup(true)}
 *   onClearSelection={() => setSelectedIds([])}
 * />
 * ```
 */
export function BatchActionBar({
  selectedCount,
  onAddTags,
  onClearSelection,
  isProcessing = false,
}: BatchActionBarProps): React.ReactElement | null {
  // 没有选中时不显示
  if (selectedCount === 0) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-40"
      data-testid="batch-action-bar"
    >
      <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
        {/* 选中数量 */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            已选 {selectedCount} 个词汇
          </span>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          {/* 取消选择 */}
          <button
            type="button"
            onClick={onClearSelection}
            disabled={isProcessing}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            data-testid="batch-cancel-button"
          >
            <X size={16} />
            <span>取消</span>
          </button>

          {/* 添加标签按钮 */}
          <button
            type="button"
            onClick={onAddTags}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="batch-add-tags-button"
          >
            {isProcessing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>处理中...</span>
              </>
            ) : (
              <>
                <TagIcon size={16} />
                <span>添加标签</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BatchActionBar;
