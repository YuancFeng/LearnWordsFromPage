/**
 * LingoRecall AI - TagBadge Component
 * Story 4.4 - Task 7: 标签徽章组件
 *
 * 用于在词汇列表和其他地方显示标签
 *
 * @module popup/components/TagBadge
 */

import React from 'react';
import type { Tag } from '../../shared/types/tag';
import { getColorWithOpacity } from '../../shared/types/tag';

/**
 * TagBadge 属性
 */
export interface TagBadgeProps {
  /** 标签对象 */
  tag: Tag;
  /** 尺寸 */
  size?: 'sm' | 'md';
  /** 是否可移除 */
  removable?: boolean;
  /** 移除回调 */
  onRemove?: () => void;
  /** 点击回调（用于筛选） */
  onClick?: () => void;
}

/**
 * 标签徽章组件
 * Story 4.4 - AC1: 显示标签
 *
 * @example
 * ```tsx
 * <TagBadge tag={tag} size="sm" />
 * <TagBadge tag={tag} removable onRemove={() => handleRemove(tag.id)} />
 * ```
 */
export function TagBadge({
  tag,
  size = 'sm',
  removable = false,
  onRemove,
  onClick,
}: TagBadgeProps): React.ReactElement {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.();
  };

  const handleClick = () => {
    onClick?.();
  };

  const bgColor = getColorWithOpacity(tag.color, 0.15);
  const textColor = tag.color;

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        ${sizeClasses[size]}
        ${onClick ? 'cursor-pointer hover:opacity-80' : ''}
        transition-opacity
      `}
      style={{
        backgroundColor: bgColor,
        color: textColor,
      }}
      onClick={onClick ? handleClick : undefined}
      data-testid={`tag-badge-${tag.id}`}
    >
      {/* 颜色圆点 */}
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: tag.color }}
      />

      {/* 标签名称 */}
      <span className="truncate max-w-[100px]">{tag.name}</span>

      {/* 移除按钮 */}
      {removable && onRemove && (
        <button
          type="button"
          onClick={handleRemove}
          className="ml-0.5 hover:opacity-60 transition-opacity"
          aria-label={`移除标签 ${tag.name}`}
          data-testid={`tag-remove-${tag.id}`}
        >
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </span>
  );
}

/**
 * 多标签展示组件
 * 显示多个标签徽章
 */
export interface TagBadgeListProps {
  /** 标签列表 */
  tags: Tag[];
  /** 尺寸 */
  size?: 'sm' | 'md';
  /** 最大显示数量，超出显示 +N */
  maxDisplay?: number;
  /** 标签点击回调 */
  onTagClick?: (tag: Tag) => void;
}

export function TagBadgeList({
  tags,
  size = 'sm',
  maxDisplay = 3,
  onTagClick,
}: TagBadgeListProps): React.ReactElement | null {
  if (!tags || tags.length === 0) return null;

  const displayTags = tags.slice(0, maxDisplay);
  const remainingCount = tags.length - maxDisplay;

  return (
    <div className="flex flex-wrap gap-1" data-testid="tag-badge-list">
      {displayTags.map((tag) => (
        <TagBadge
          key={tag.id}
          tag={tag}
          size={size}
          onClick={onTagClick ? () => onTagClick(tag) : undefined}
        />
      ))}

      {remainingCount > 0 && (
        <span
          className={`
            inline-flex items-center rounded-full font-medium
            bg-gray-100 text-gray-600
            ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'}
          `}
          title={tags
            .slice(maxDisplay)
            .map((t) => t.name)
            .join(', ')}
          data-testid="tag-badge-overflow"
        >
          +{remainingCount}
        </span>
      )}
    </div>
  );
}

export default TagBadge;
