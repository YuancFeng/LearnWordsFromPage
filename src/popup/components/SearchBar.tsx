/**
 * LingoRecall AI - SearchBar Component
 * Story 2.5 实现 - AC1: 搜索输入框, AC3: 清除搜索
 *
 * 搜索栏组件，包含搜索图标、输入框、加载状态、匹配计数和清除按钮
 *
 * @module popup/components/SearchBar
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X, Loader2 } from 'lucide-react';

/**
 * SearchBar 组件属性
 */
export interface SearchBarProps {
  /** 当前搜索值 */
  value: string;
  /** 搜索值变化回调 */
  onChange: (value: string) => void;
  /** 清除搜索回调 */
  onClear: () => void;
  /** 是否正在搜索 */
  isSearching: boolean;
  /** 匹配数量 */
  matchCount: number;
  /** 总数量 */
  totalCount: number;
  /** 占位符文本 */
  placeholder?: string;
  /** 是否禁用 */
  disabled?: boolean;
}

/**
 * 搜索栏组件
 * Story 2.5 - AC1: 搜索输入框
 *
 * @param props SearchBarProps
 * @returns React.ReactElement
 *
 * @example
 * ```tsx
 * <SearchBar
 *   value={searchQuery}
 *   onChange={setSearchQuery}
 *   onClear={clearSearch}
 *   isSearching={isSearching}
 *   matchCount={matchCount}
 *   totalCount={totalCount}
 * />
 * ```
 */
export function SearchBar({
  value,
  onChange,
  onClear,
  isSearching,
  matchCount,
  totalCount,
  placeholder,
  disabled = false,
}: SearchBarProps): React.ReactElement {
  const { t } = useTranslation();
  const searchPlaceholder = placeholder ?? t('vocabulary.search.placeholder');
  // 是否显示匹配计数（有搜索内容且不在搜索中）
  const showMatchCount = value.length > 0 && !isSearching;

  // 是否显示清除按钮（有搜索内容）
  const showClearButton = value.length > 0;

  /**
   * 处理输入变化
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  /**
   * 处理清除按钮点击
   */
  const handleClearClick = () => {
    onClear();
  };

  /**
   * 处理键盘事件
   * Escape 键清除搜索
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape' && value.length > 0) {
      onClear();
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        {/* 搜索图标 */}
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          aria-hidden="true"
        />

        {/* 搜索输入框 */}
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={searchPlaceholder}
          disabled={disabled}
          className={`
            w-full pl-10 pr-24 py-2.5 text-sm
            bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl
            text-gray-900 dark:text-gray-100
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            placeholder:text-gray-400 dark:placeholder:text-gray-500
            disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:cursor-not-allowed
            transition-all duration-200
          `}
          aria-label={t('vocabulary.search.placeholder')}
          autoComplete="off"
          spellCheck="false"
        />

        {/* 右侧操作区域 */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {/* 加载指示器 */}
          {isSearching && (
            <Loader2
              size={16}
              className="text-blue-500 animate-spin"
              aria-label={t('vocabulary.search.searching')}
            />
          )}

          {/* 匹配计数徽章 */}
          {showMatchCount && (
            <span
              className={`
                text-xs font-medium px-2 py-0.5 rounded-full
                ${matchCount > 0 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}
              `}
              aria-label={t('vocabulary.search.resultsCount', { count: matchCount })}
            >
              {matchCount}/{totalCount}
            </span>
          )}

          {/* 清除按钮 */}
          {showClearButton && !isSearching && (
            <button
              onClick={handleClearClick}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label={t('vocabulary.search.clearSearch')}
              type="button"
            >
              <X size={14} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default SearchBar;
