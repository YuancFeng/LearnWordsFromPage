/**
 * LingoRecall AI - TagFilter Component
 * Story 4.5 - Task 2: 标签筛选组件
 *
 * 用于在词汇列表中按标签筛选
 *
 * @module popup/components/TagFilter
 */

import React, { useState } from 'react';
import { Check, ChevronDown, Tag as TagIcon, X } from 'lucide-react';
import type { Tag } from '../../shared/types/tag';
import { getColorWithOpacity } from '../../shared/types/tag';

/**
 * TagFilter 属性
 */
export interface TagFilterProps {
  /** 所有可用的标签 */
  tags: Tag[];
  /** 当前选中的标签 ID 列表 */
  selectedIds: string[];
  /** 标签选中状态变化回调 */
  onToggle: (tagId: string) => void;
  /** 清除所有选中的标签 */
  onClearAll?: () => void;
  /** 是否禁用 */
  disabled?: boolean;
}

/**
 * 标签筛选组件
 * Story 4.5 - AC2: 多标签筛选
 *
 * @example
 * ```tsx
 * <TagFilter
 *   tags={allTags}
 *   selectedIds={selectedTagIds}
 *   onToggle={(tagId) => toggleTag(tagId)}
 *   onClearAll={() => clearTagFilter()}
 * />
 * ```
 */
export function TagFilter({
  tags,
  selectedIds,
  onToggle,
  onClearAll,
  disabled = false,
}: TagFilterProps): React.ReactElement | null {
  const [isExpanded, setIsExpanded] = useState(false);

  // 如果没有标签，不显示组件
  if (tags.length === 0) {
    return null;
  }

  const selectedTags = tags.filter((tag) => selectedIds.includes(tag.id));
  const hasSelection = selectedIds.length > 0;

  return (
    <div className="relative" data-testid="tag-filter">
      {/* 筛选按钮 */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}
          ${hasSelection
            ? 'border-blue-300 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20'
            : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800'
          }
        `}
        data-testid="tag-filter-button"
      >
        <TagIcon size={16} className="text-gray-500 dark:text-gray-400" />
        <span className="text-gray-700 dark:text-gray-300">
          {hasSelection ? `${selectedIds.length} 个标签` : '标签筛选'}
        </span>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* 已选中的标签徽章 */}
      {hasSelection && (
        <div className="flex flex-wrap gap-1 mt-2" data-testid="selected-tags">
          {selectedTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: getColorWithOpacity(tag.color, 0.15),
                color: tag.color,
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
              {tag.name}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(tag.id);
                }}
                className="hover:opacity-70"
                aria-label={`移除 ${tag.name} 筛选`}
              >
                <X size={12} />
              </button>
            </span>
          ))}

          {/* 清除全部按钮 */}
          {onClearAll && selectedIds.length > 1 && (
            <button
              type="button"
              onClick={onClearAll}
              className="px-2 py-0.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              data-testid="clear-tag-filter"
            >
              清除全部
            </button>
          )}
        </div>
      )}

      {/* 下拉面板 */}
      {isExpanded && (
        <>
          {/* 点击外部关闭 */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsExpanded(false)}
          />

          {/* 标签选择面板 */}
          <div
            className="absolute left-0 top-full mt-1 z-20 w-64 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 shadow-lg p-3"
            data-testid="tag-filter-dropdown"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  按标签筛选
                </span>
                {hasSelection && onClearAll && (
                  <button
                    type="button"
                    onClick={() => {
                      onClearAll();
                      setIsExpanded(false);
                    }}
                    className="text-xs text-blue-500 hover:text-blue-700"
                  >
                    清除
                  </button>
                )}
              </div>

              {/* 标签列表 */}
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const isSelected = selectedIds.includes(tag.id);

                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => onToggle(tag.id)}
                      className={`
                        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors
                        ${isSelected
                          ? 'text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }
                      `}
                      style={isSelected ? { backgroundColor: tag.color } : undefined}
                      data-testid={`tag-option-${tag.id}`}
                    >
                      {!isSelected && (
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                      )}
                      <span>{tag.name}</span>
                      {isSelected && <Check size={14} />}
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                选择多个标签将显示包含所有选中标签的词汇
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default TagFilter;
