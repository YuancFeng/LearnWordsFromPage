/**
 * LingoRecall AI - TagSelector Component
 * Story 4.6 - Task 1: 标签选择器组件
 *
 * 用于给词汇添加或移除标签的弹出选择器
 *
 * @module popup/components/TagSelector
 */

import React, { useState, useEffect, useRef } from 'react';
import { Tag as TagIcon, Check, Plus, X } from 'lucide-react';
import type { Tag } from '../../shared/types/tag';
import { getColorWithOpacity } from '../../shared/types/tag';

/**
 * TagSelector 属性
 */
export interface TagSelectorProps {
  /** 所有可用的标签 */
  allTags: Tag[];
  /** 当前词汇已选中的标签 ID */
  selectedTagIds: string[];
  /** 标签选中/取消选中回调 */
  onToggle: (tagId: string, isSelected: boolean) => void;
  /** 关闭选择器回调 */
  onClose: () => void;
  /** 打开标签管理回调（可选） */
  onManageTags?: () => void;
  /** 是否正在加载 */
  isLoading?: boolean;
}

/**
 * 标签选择器组件
 * Story 4.6 - AC1, AC2, AC3: 词汇标签关联
 *
 * @example
 * ```tsx
 * <TagSelector
 *   allTags={tags}
 *   selectedTagIds={word.tagIds}
 *   onToggle={(tagId, isSelected) => handleToggleTag(wordId, tagId, isSelected)}
 *   onClose={() => setShowTagSelector(false)}
 * />
 * ```
 */
export function TagSelector({
  allTags,
  selectedTagIds,
  onToggle,
  onClose,
  onManageTags,
  isLoading = false,
}: TagSelectorProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // ESC 键关闭
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleTagClick = (tagId: string) => {
    if (isLoading) return;
    const isCurrentlySelected = selectedTagIds.includes(tagId);
    onToggle(tagId, !isCurrentlySelected);
  };

  return (
    <div
      ref={containerRef}
      className="absolute right-0 top-full mt-1 z-30 w-64 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 shadow-lg"
      data-testid="tag-selector"
    >
      {/* 头部 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <TagIcon size={14} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            选择标签
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"
          aria-label="关闭"
        >
          <X size={14} />
        </button>
      </div>

      {/* 标签列表 */}
      <div className="p-2 max-h-60 overflow-y-auto">
        {allTags.length === 0 ? (
          <div className="py-4 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              还没有创建标签
            </p>
            {onManageTags && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onManageTags();
                }}
                className="text-sm text-blue-500 hover:text-blue-700"
              >
                去创建标签
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {allTags.map((tag) => {
              const isSelected = selectedTagIds.includes(tag.id);

              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleTagClick(tag.id)}
                  disabled={isLoading}
                  className={`
                    w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors
                    ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    ${isSelected
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }
                  `}
                  data-testid={`tag-selector-option-${tag.id}`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span
                      className={`${isSelected ? 'font-medium' : ''} text-gray-700 dark:text-gray-300`}
                    >
                      {tag.name}
                    </span>
                  </div>

                  {isSelected && (
                    <Check size={16} className="text-blue-500 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 底部操作 */}
      {onManageTags && allTags.length > 0 && (
        <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700">
          <button
            type="button"
            onClick={() => {
              onClose();
              onManageTags();
            }}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <Plus size={12} />
            <span>管理标签</span>
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * 标签选择按钮组件
 * 用于在词汇卡片上显示的标签按钮
 */
export interface TagSelectorButtonProps {
  /** 已选标签数量 */
  selectedCount: number;
  /** 点击回调 */
  onClick: () => void;
  /** 是否禁用 */
  disabled?: boolean;
}

export function TagSelectorButton({
  selectedCount,
  onClick,
  disabled = false,
}: TagSelectorButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${selectedCount > 0
          ? 'text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/30'
          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:text-gray-200 dark:hover:bg-gray-700'
        }
      `}
      title="管理标签"
      data-testid="tag-selector-button"
    >
      <TagIcon size={14} />
      {selectedCount > 0 && (
        <span className="font-medium">{selectedCount}</span>
      )}
    </button>
  );
}

export default TagSelector;
