/**
 * LingoRecall AI - Full Page Vocabulary Component
 * 全屏词库页面，为大屏幕优化的布局
 *
 * 使用侧边栏抽屉模式展示词汇详情，提供更好的浏览体验
 *
 * @module options/components/FullPageVocabulary
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  BookOpen,
  GraduationCap,
  Settings,
  CheckSquare,
  AlertCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearch } from '../../hooks/useSearch';
import { useDueCount } from '../../hooks/useDueCount';
import { useTags } from '../../hooks/useTags';
import { matchesTags } from '../../hooks/useVocabularyFilter';
import { SearchBar } from '../../popup/components/SearchBar';
import { SortDropdown, type SortOption, SORT_CONFIG } from '../../popup/components/SortDropdown';
import { NoResults } from '../../popup/components/NoResults';
import { TagFilter } from '../../popup/components/TagFilter';
import { HighlightedText } from '../../popup/components/HighlightedText';
import { TagBadgeList } from '../../popup/components/TagBadge';
import { BatchActionBar } from '../../popup/components/BatchActionBar';
import { BatchTagSelector } from '../../popup/components/BatchTagSelector';
import { WordDetailDrawer } from './WordDetailDrawer';
import { MessageTypes } from '../../shared/messaging/types';
import type { WordRecord } from '../../shared/messaging/types';
import type { Tag } from '../../shared/types/tag';

/**
 * FullPageVocabulary Props
 */
interface FullPageVocabularyProps {
  onStartReview?: () => void;
  onOpenSettings?: () => void;
}

/**
 * 词卡属性接口
 */
interface WordCardProps {
  word: WordRecord;
  searchKeyword?: string;
  allTags?: Tag[];
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelectionToggle?: () => void;
  onClick?: () => void;
  isActive?: boolean;
}

/**
 * 词卡组件 - 简洁版，点击后打开侧边栏抽屉
 */
function WordCard({
  word,
  searchKeyword = '',
  allTags = [],
  isSelectionMode = false,
  isSelected = false,
  onSelectionToggle,
  onClick,
  isActive = false,
}: WordCardProps) {
  const formattedDate = new Date(word.createdAt).toLocaleDateString();

  const wordTags = useMemo(() => {
    if (!word.tagIds || word.tagIds.length === 0 || allTags.length === 0) return [];
    return allTags.filter((tag) => word.tagIds.includes(tag.id));
  }, [word.tagIds, allTags]);

  const collapsedMeaning = word.meaning
    ? word.meaning.length > 80
      ? `${word.meaning.slice(0, 80)}...`
      : word.meaning
    : '';

  const handleClick = () => {
    if (isSelectionMode) {
      onSelectionToggle?.();
    } else {
      onClick?.();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-full text-left bg-white dark:bg-gray-800 rounded-xl border p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group ${
        isActive
          ? 'border-blue-500 ring-2 ring-blue-500/20 dark:ring-blue-400/20'
          : isSelectionMode && isSelected
          ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      <div className="flex gap-3">
        {isSelectionMode && (
          <div
            className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              isSelected
                ? 'bg-blue-500 border-blue-500 text-white'
                : 'border-gray-300 dark:border-gray-600 group-hover:border-blue-400'
            }`}
          >
            {isSelected && (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  <HighlightedText text={word.text} keyword={searchKeyword} />
                </h3>
                {word.partOfSpeech && (
                  <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded text-xs font-medium flex-shrink-0">
                    {word.partOfSpeech}
                  </span>
                )}
              </div>
              {wordTags.length > 0 && (
                <div className="mt-1">
                  <TagBadgeList tags={wordTags} size="sm" maxDisplay={2} />
                </div>
              )}
              {collapsedMeaning && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                  <HighlightedText text={collapsedMeaning} keyword={searchKeyword} />
                </p>
              )}
            </div>
            <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:inline">
              {formattedDate}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

/**
 * 空状态组件
 */
function EmptyState(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
        <BookOpen size={48} className="text-gray-300 dark:text-gray-600" />
      </div>
      <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('vocabulary.emptyState')}</h3>
      <p className="text-gray-500 dark:text-gray-400 max-w-md">{t('vocabulary.emptyStateHint')}</p>
    </div>
  );
}

/**
 * 全屏词库组件
 */
export function FullPageVocabulary({ onStartReview, onOpenSettings }: FullPageVocabularyProps): React.ReactElement {
  const { t } = useTranslation();

  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    matchCount,
    totalCount,
    isSearching,
    clearSearch,
    hasActiveSearch,
    error,
  } = useSearch();

  const { tags } = useTags();
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const { dueCount } = useDueCount();

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(new Set());
  const [showBatchTagSelector, setShowBatchTagSelector] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('recent');

  // 抽屉状态 - 选中的词汇 ID
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);

  const handleToggleTag = useCallback((tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }, []);

  const handleClearTagFilter = useCallback(() => {
    setSelectedTagIds([]);
  }, []);

  const handleClearAllFilters = useCallback(() => {
    clearSearch();
    setSelectedTagIds([]);
  }, [clearSearch]);

  useEffect(() => {
    chrome.storage.local.get(['sortOption'], (result) => {
      const savedOption = result.sortOption as string | undefined;
      if (savedOption && ['recent', 'oldest', 'alphabetical'].includes(savedOption)) {
        setSortOption(savedOption as SortOption);
      }
    });
  }, []);

  const handleSortChange = useCallback((option: SortOption) => {
    setSortOption(option);
    chrome.storage.local.set({ sortOption: option });
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'DELETE_WORD',
          payload: { id },
        });
        if (response.success) {
          setSearchQuery(searchQuery);
        }
      } catch (err) {
        console.error('[LingoRecall] Delete error:', err);
      }
    },
    [searchQuery, setSearchQuery]
  );

  const handleUpdateWordTags = useCallback(
    async (wordId: string, tagId: string, isSelected: boolean) => {
      const word = searchResults?.find((w) => w.id === wordId);
      if (!word) return;

      const currentTagIds = word.tagIds || [];
      let newTagIds: string[];

      if (isSelected) {
        if (currentTagIds.includes(tagId)) return;
        newTagIds = [...currentTagIds, tagId];
      } else {
        if (!currentTagIds.includes(tagId)) return;
        newTagIds = currentTagIds.filter((id) => id !== tagId);
      }

      try {
        const response = await chrome.runtime.sendMessage({
          type: MessageTypes.UPDATE_WORD,
          payload: { id: wordId, updates: { tagIds: newTagIds } },
        });
        if (response.success) {
          setSearchQuery(searchQuery);
        }
      } catch (err) {
        console.error('[LingoRecall] Update word tags error:', err);
      }
    },
    [searchResults, searchQuery, setSearchQuery]
  );

  const handleToggleWordSelection = useCallback((wordId: string) => {
    setSelectedWordIds((prev) => {
      const next = new Set(prev);
      if (next.has(wordId)) {
        next.delete(wordId);
      } else {
        next.add(wordId);
      }
      return next;
    });
  }, []);

  const handleToggleSelectionMode = useCallback(() => {
    setIsSelectionMode((prev) => {
      if (prev) {
        setSelectedWordIds(new Set());
      }
      return !prev;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedWordIds(new Set());
    setIsSelectionMode(false);
  }, []);

  const handleBatchAddTags = useCallback(
    async (tagIds: string[]) => {
      if (selectedWordIds.size === 0 || tagIds.length === 0) return;

      setIsBatchProcessing(true);
      try {
        const updatePromises = Array.from(selectedWordIds).map(async (wordId) => {
          const word = searchResults?.find((w) => w.id === wordId);
          if (!word) return;

          const currentTagIds = word.tagIds || [];
          const mergedTagIds = [...new Set([...currentTagIds, ...tagIds])];
          if (mergedTagIds.length === currentTagIds.length) return;

          return chrome.runtime.sendMessage({
            type: MessageTypes.UPDATE_WORD,
            payload: { id: wordId, updates: { tagIds: mergedTagIds } },
          });
        });

        await Promise.all(updatePromises);
        setSearchQuery(searchQuery);
        setSelectedWordIds(new Set());
        setIsSelectionMode(false);
      } catch (err) {
        console.error('[LingoRecall] Batch add tags error:', err);
      } finally {
        setIsBatchProcessing(false);
      }
    },
    [selectedWordIds, searchResults, searchQuery, setSearchQuery]
  );

  const sortedWords = useMemo(() => {
    if (!searchResults) return [];

    let words =
      selectedTagIds.length > 0
        ? searchResults.filter((word) => matchesTags(word, selectedTagIds))
        : [...searchResults];

    const config = SORT_CONFIG[sortOption];

    words.sort((a, b) => {
      if (config.field === 'text') {
        const comparison = a.text.localeCompare(b.text, 'en', { sensitivity: 'base' });
        return config.order === 'asc' ? comparison : -comparison;
      } else {
        const aVal = a[config.field] as number;
        const bVal = b[config.field] as number;
        return config.order === 'asc' ? aVal - bVal : bVal - aVal;
      }
    });

    return words;
  }, [searchResults, sortOption, selectedTagIds]);

  const hasTagFilter = selectedTagIds.length > 0;
  const hasAnyFilter = hasActiveSearch || hasTagFilter;

  // 获取当前选中的词汇对象和索引
  const selectedWord = useMemo(() => {
    if (!selectedWordId || !sortedWords.length) return null;
    return sortedWords.find((w) => w.id === selectedWordId) || null;
  }, [selectedWordId, sortedWords]);

  const currentWordIndex = useMemo(() => {
    if (!selectedWordId || !sortedWords.length) return -1;
    return sortedWords.findIndex((w) => w.id === selectedWordId);
  }, [selectedWordId, sortedWords]);

  // 导航函数
  const handlePreviousWord = useCallback(() => {
    if (currentWordIndex > 0) {
      setSelectedWordId(sortedWords[currentWordIndex - 1].id);
    }
  }, [currentWordIndex, sortedWords]);

  const handleNextWord = useCallback(() => {
    if (currentWordIndex < sortedWords.length - 1) {
      setSelectedWordId(sortedWords[currentWordIndex + 1].id);
    }
  }, [currentWordIndex, sortedWords]);

  // 关闭抽屉
  const handleCloseDrawer = useCallback(() => {
    setSelectedWordId(null);
  }, []);

  // 打开词汇详情
  const handleWordClick = useCallback((wordId: string) => {
    setSelectedWordId(wordId);
  }, []);

  const renderContent = () => {
    if (isSearching && !searchResults) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin mb-4" />
          <p className="text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
            <AlertCircle size={32} className="text-red-400 dark:text-red-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{t('common.error')}</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={clearSearch}
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('common.retry')}
          </button>
        </div>
      );
    }

    if (totalCount === 0) {
      return <EmptyState />;
    }

    if (hasAnyFilter && sortedWords.length === 0) {
      return <NoResults query={searchQuery} onClear={hasAnyFilter ? handleClearAllFilters : clearSearch} />;
    }

    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 ${isSelectionMode ? 'pb-20' : ''}`}>
        {sortedWords.map((word) => (
          <React.Fragment key={word.id}>
            <WordCard
              word={word}
              searchKeyword={searchQuery}
              allTags={tags}
              isSelectionMode={isSelectionMode}
              isSelected={selectedWordIds.has(word.id)}
              onSelectionToggle={() => handleToggleWordSelection(word.id)}
              onClick={() => handleWordClick(word.id)}
              isActive={selectedWordId === word.id}
            />
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-[1800px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('vocabulary.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {hasAnyFilter
              ? t('vocabulary.matchCount', { match: sortedWords.length, total: totalCount })
              : t('vocabulary.wordCount', { count: totalCount })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {totalCount > 0 && tags.length > 0 && (
            <button
              onClick={handleToggleSelectionMode}
              className={`p-2.5 rounded-lg transition-colors ${
                isSelectionMode
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              type="button"
              title={isSelectionMode ? t('vocabulary.batch.cancel') : t('vocabulary.batch.select')}
            >
              <CheckSquare size={20} />
            </button>
          )}

          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="p-2.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              type="button"
              title={t('vocabulary.actions.settings')}
            >
              <Settings size={20} />
            </button>
          )}

          {onStartReview && (
            <button
              onClick={onStartReview}
              className="relative flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm"
              type="button"
            >
              <GraduationCap size={20} />
              <span>{t('vocabulary.actions.startReview')}</span>
              {dueCount > 0 && (
                <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {dueCount > 99 ? '99+' : dueCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      {totalCount > 0 && (
        <div className="space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 max-w-xl">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                onClear={clearSearch}
                isSearching={isSearching}
                matchCount={matchCount}
                totalCount={totalCount}
              />
            </div>
            <SortDropdown value={sortOption} onChange={handleSortChange} />
          </div>

          {tags.length > 0 && (
            <TagFilter
              tags={tags}
              selectedIds={selectedTagIds}
              onToggle={handleToggleTag}
              onClearAll={handleClearTagFilter}
            />
          )}

          {hasAnyFilter && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                {hasActiveSearch && t('vocabulary.filter.search', { query: searchQuery })}
                {hasActiveSearch && hasTagFilter && ' + '}
                {hasTagFilter && t('vocabulary.filter.tagsCount', { count: selectedTagIds.length })}
              </span>
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                {t('vocabulary.search.clearAll')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {renderContent()}

      {/* Batch Actions */}
      <BatchActionBar
        selectedCount={selectedWordIds.size}
        onAddTags={() => setShowBatchTagSelector(true)}
        onClearSelection={handleClearSelection}
        isProcessing={isBatchProcessing}
      />

      <BatchTagSelector
        isOpen={showBatchTagSelector}
        allTags={tags}
        wordCount={selectedWordIds.size}
        onClose={() => setShowBatchTagSelector(false)}
        onConfirm={handleBatchAddTags}
      />

      {/* 词汇详情侧边栏 */}
      <WordDetailDrawer
        word={selectedWord}
        onClose={handleCloseDrawer}
        onDelete={handleDelete}
        allTags={tags}
        onUpdateTags={handleUpdateWordTags}
        onManageTags={onOpenSettings}
        searchKeyword={searchQuery}
        onPrevious={handlePreviousWord}
        onNext={handleNextWord}
        hasPrevious={currentWordIndex > 0}
        hasNext={currentWordIndex < sortedWords.length - 1}
        currentIndex={currentWordIndex}
        totalCount={sortedWords.length}
      />
    </div>
  );
}

export default FullPageVocabulary;
