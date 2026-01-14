/**
 * LingoRecall AI - SortDropdown Component
 * Story 2.5 实现 - AC2: 排序功能
 *
 * 排序下拉选择组件，支持按时间和字母排序
 *
 * @module popup/components/SortDropdown
 */

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpDown, Check } from 'lucide-react';

/**
 * 排序选项类型
 */
export type SortOption = 'recent' | 'oldest' | 'alphabetical';

/**
 * 排序选项配置
 */
export interface SortConfig {
  /** 排序字段 */
  field: 'createdAt' | 'text';
  /** 排序方向 */
  order: 'asc' | 'desc';
}

/**
 * 排序选项配置映射
 */
export const SORT_CONFIG: Record<SortOption, SortConfig> = {
  recent: { field: 'createdAt', order: 'desc' },
  oldest: { field: 'createdAt', order: 'asc' },
  alphabetical: { field: 'text', order: 'asc' },
};

/**
 * 排序选项翻译键
 */
const SORT_LABEL_KEYS: Record<SortOption, string> = {
  recent: 'vocabulary.sort.recent',
  oldest: 'vocabulary.sort.oldest',
  alphabetical: 'vocabulary.sort.alphabetical',
};

/**
 * SortDropdown 组件属性
 */
export interface SortDropdownProps {
  /** 当前选中的排序选项 */
  value: SortOption;
  /** 排序选项变化回调 */
  onChange: (value: SortOption) => void;
  /** 是否禁用 */
  disabled?: boolean;
}

/**
 * 排序下拉组件
 * Story 2.5 - AC2: 排序选项
 *
 * @param props SortDropdownProps
 * @returns React.ReactElement
 *
 * @example
 * ```tsx
 * <SortDropdown
 *   value={sortOption}
 *   onChange={handleSortChange}
 * />
 * ```
 */
export function SortDropdown({
  value,
  onChange,
  disabled = false,
}: SortDropdownProps): React.ReactElement {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /**
   * 点击外部关闭下拉菜单
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * 处理选项选择
   */
  const handleOptionSelect = (option: SortOption) => {
    onChange(option);
    setIsOpen(false);
  };

  /**
   * 处理键盘导航
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  const sortOptions: SortOption[] = ['recent', 'oldest', 'alphabetical'];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 触发按钮 */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`
          flex items-center gap-2 px-3 py-2.5 text-sm font-medium
          bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl
          hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500
          transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={t('vocabulary.sortBy')}
        type="button"
      >
        <ArrowUpDown size={14} className="text-gray-400" />
        <span className="text-gray-700 dark:text-gray-200 whitespace-nowrap">{t(SORT_LABEL_KEYS[value])}</span>
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden"
          role="listbox"
          aria-label={t('vocabulary.sortOptions')}
        >
          {sortOptions.map((option) => (
            <button
              key={option}
              onClick={() => handleOptionSelect(option)}
              className={`
                w-full flex items-center justify-between px-4 py-2.5 text-sm text-left
                transition-colors
                ${value === option ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'}
              `}
              role="option"
              aria-selected={value === option}
              type="button"
            >
              <span>{t(SORT_LABEL_KEYS[option])}</span>
              {value === option && (
                <Check size={14} className="text-blue-600 dark:text-blue-400" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default SortDropdown;
