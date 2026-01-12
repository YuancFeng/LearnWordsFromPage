/**
 * LingoRecall AI - Vocabulary List Component
 * Story 2.2 实现 - AC1: 词库列表显示
 * Story 2.3 实现 - AC1, AC2, AC3: 跳回原文页面
 * Story 2.5 实现 - AC1: 搜索功能, AC2: 排序功能, AC3: 空结果状态
 * Story 4.5 实现 - AC1: 搜索高亮, AC2: 标签筛选, AC3: 清除筛选
 *
 * 显示保存的词汇列表，支持搜索、排序、标签筛选、删除操作和跳转到原文
 *
 * @module popup/components/VocabularyList
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { BookOpen, Trash2, ExternalLink, Clock, AlertCircle, Loader2, ChevronDown, ChevronUp, GraduationCap, Settings, CheckSquare } from 'lucide-react';
import { useSearch } from '../../hooks/useSearch';
import { useDueCount } from '../../hooks/useDueCount';
import { useTags } from '../../hooks/useTags';
import { useVocabularyFilter, matchesTags } from '../../hooks/useVocabularyFilter';
import { SearchBar } from './SearchBar';
import { SortDropdown, type SortOption, SORT_CONFIG } from './SortDropdown';
import { NoResults } from './NoResults';
import { TagFilter } from './TagFilter';
import { HighlightedText } from './HighlightedText';
import { TagBadgeList } from './TagBadge';
import { TagSelector, TagSelectorButton } from './TagSelector';
import { BatchActionBar } from './BatchActionBar';
import { BatchTagSelector } from './BatchTagSelector';
import { MessageTypes } from '../../shared/messaging/types';
import type { WordRecord, JumpToSourcePayload } from '../../shared/messaging/types';
import type { Tag } from '../../shared/types/tag';
import { ErrorCode } from '../../shared/types/errors';

/**
 * VocabularyList 属性
 */
interface VocabularyListProps {
  /** 跳转到原文的回调（可选，如果不提供则使用内置逻辑） */
  onJumpToSource?: (word: WordRecord) => void;
  /** 开始复习的回调 - Story 3.3 AC1 */
  onStartReview?: () => void;
  /** 打开设置页面的回调 - Story 4.1 */
  onOpenSettings?: () => void;
}

/**
 * 上下文预览组件 - 用于页面无法访问时显示原始上下文
 * Story 2.3 - AC3: 显示原始上下文
 */
function ContextPreview({
  contextBefore,
  word,
  contextAfter,
}: {
  contextBefore: string;
  word: string;
  contextAfter: string;
}) {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-3">
      <p className="text-xs text-yellow-600 mb-2">
        Source page is inaccessible, but you can still view the full context here.
      </p>
      <p className="text-sm text-gray-700">
        <span className="text-gray-500">...{contextBefore}</span>
        <mark className="bg-yellow-200 px-1 font-semibold">{word}</mark>
        <span className="text-gray-500">{contextAfter}...</span>
      </p>
    </div>
  );
}

/**
 * 词卡组件
 * Story 2.3: 添加跳转到原文功能
 * Story 4.5: 添加搜索高亮
 * Story 4.6: 添加标签管理
 */
function WordCard({
  word,
  onJumpToSource,
  onDelete,
  searchKeyword = '',
  allTags = [],
  onUpdateTags,
  onManageTags,
  isSelectionMode = false,
  isSelected = false,
  onSelectionToggle,
}: {
  word: WordRecord;
  onJumpToSource?: (word: WordRecord) => void;
  onDelete: (id: string) => void;
  searchKeyword?: string;
  allTags?: Tag[];
  onUpdateTags?: (wordId: string, tagId: string, isSelected: boolean) => void;
  onManageTags?: () => void;
  /** Story 4.6 - AC4: 是否处于批量选择模式 */
  isSelectionMode?: boolean;
  /** Story 4.6 - AC4: 是否被选中 */
  isSelected?: boolean;
  /** Story 4.6 - AC4: 选中状态切换回调 */
  onSelectionToggle?: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isJumping, setIsJumping] = useState(false);
  const [jumpError, setJumpError] = useState<string | null>(null);
  const [showContextPreview, setShowContextPreview] = useState(false);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [isUpdatingTags, setIsUpdatingTags] = useState(false);

  const inaccessibleMessage = 'Source page is inaccessible, but you can still view the full context here';
  const formattedDate = new Date(word.createdAt).toLocaleDateString();

  // Story 4.6 - 获取词汇关联的标签对象
  const wordTags = useMemo(() => {
    if (!word.tagIds || word.tagIds.length === 0 || allTags.length === 0) return [];
    return allTags.filter((tag) => word.tagIds.includes(tag.id));
  }, [word.tagIds, allTags]);

  // Story 4.6 - 处理标签切换
  const handleTagToggle = useCallback(async (tagId: string, isSelected: boolean) => {
    if (!onUpdateTags || isUpdatingTags) return;
    setIsUpdatingTags(true);
    try {
      await onUpdateTags(word.id, tagId, isSelected);
    } finally {
      setIsUpdatingTags(false);
    }
  }, [word.id, onUpdateTags, isUpdatingTags]);

  const collapsedMeaning = word.meaning
    ? word.meaning.length > 80
      ? `${word.meaning.slice(0, 80)}...`
      : word.meaning
    : '';

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(word.id);
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  const handleToggle = () => {
    const nextExpanded = !isExpanded;
    setIsExpanded(nextExpanded);
    if (!nextExpanded) {
      setShowConfirm(false);
      setJumpError(null);
      setShowContextPreview(false);
    }
  };

  /**
   * 处理跳转到原文
   * Story 2.3 - AC1, AC2, AC3 实现
   */
  const handleJumpToSource = async () => {
    if (!word.sourceUrl) return;

    setIsJumping(true);
    setJumpError(null);
    setShowContextPreview(false);

    try {
      const payload: JumpToSourcePayload = {
        sourceUrl: word.sourceUrl,
        sourceTitle: word.sourceTitle,
        xpath: word.xpath,
        textOffset: word.textOffset,
        textLength: word.text.length,
        text: word.text,
        contextBefore: word.contextBefore,
        contextAfter: word.contextAfter,
      };

      const response = await chrome.runtime.sendMessage({
        type: MessageTypes.JUMP_TO_SOURCE,
        payload,
      });

      if (!response.success) {
        // AC3: 处理页面无法访问的情况
        if (response.error?.code === ErrorCode.PAGE_INACCESSIBLE) {
          setJumpError(inaccessibleMessage);
          setShowContextPreview(true);
        } else {
          setJumpError(response.error?.message || 'Failed to navigate');
        }
      }
      // 成功时不需要做什么，因为已经切换到目标标签页
    } catch (error) {
      console.error('[LingoRecall] Jump to source error:', error);
      setJumpError('Failed to navigate to source');
    } finally {
      setIsJumping(false);
    }
  };

  return (
    <div
      className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all ${
        isSelectionMode && isSelected
          ? 'border-blue-400 bg-blue-50/50'
          : 'border-gray-200'
      }`}
      data-testid={`word-card-${word.id}`}
    >
      {/* Story 4.6 - AC4: 选择模式下的 checkbox 和内容 */}
      <div className="flex gap-3">
        {isSelectionMode && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectionToggle?.();
            }}
            className={`flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors mt-0.5 ${
              isSelected
                ? 'bg-blue-500 border-blue-500 text-white'
                : 'border-gray-300 hover:border-blue-400'
            }`}
            aria-label={isSelected ? '取消选中' : '选中'}
            data-testid={`word-checkbox-${word.id}`}
          >
            {isSelected && (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        )}

        <div className="flex-1 min-w-0">
          <button
            type="button"
            onClick={isSelectionMode ? () => onSelectionToggle?.() : handleToggle}
            className="w-full text-left"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse word details' : 'Expand word details'}
          >
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl font-bold text-gray-900">
                    <HighlightedText text={word.text} keyword={searchKeyword} />
                  </h3>
              {word.partOfSpeech && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                  {word.partOfSpeech}
                </span>
              )}
            </div>
            {/* Story 4.6 - AC2: 显示标签徽章 */}
            {wordTags.length > 0 && (
              <div className="mt-1">
                <TagBadgeList tags={wordTags} size="sm" maxDisplay={3} />
              </div>
            )}
            {collapsedMeaning && (
              <p className="text-sm text-gray-600 mt-1">
                <HighlightedText text={collapsedMeaning} keyword={searchKeyword} />
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>{formattedDate}</span>
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="mt-4 border-t border-gray-100 pt-4 space-y-3">
          {word.pronunciation && (
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-gray-500">Pronunciation:</span> [{word.pronunciation}]
            </div>
          )}

          {word.meaning && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-gray-800 text-sm leading-relaxed">
                <HighlightedText text={word.meaning} keyword={searchKeyword} />
              </p>
            </div>
          )}

          {word.exampleSentence && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1 flex items-center gap-1">
                <Clock size={12} /> Example
              </p>
              <p className="text-sm italic text-gray-600 border-l-2 border-gray-200 pl-3">
                "...{word.exampleSentence}..."
              </p>
            </div>
          )}

          {word.sourceTitle && (
            <div className="text-xs text-gray-400">Source: {word.sourceTitle}</div>
          )}

          {jumpError && (
            <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle size={12} />
                {jumpError}
              </p>
            </div>
          )}

          {showContextPreview && (
            <ContextPreview
              contextBefore={word.contextBefore}
              word={word.text}
              contextAfter={word.contextAfter}
            />
          )}

          <div className="pt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {word.sourceUrl && (
                <button
                  onClick={handleJumpToSource}
                  disabled={isJumping}
                  className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors px-2 py-1 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Jump to Source"
                  type="button"
                >
                  {isJumping ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <ExternalLink size={14} />
                  )}
                  <span>{isJumping ? 'Jumping...' : 'Jump to Source'}</span>
                </button>
              )}

              {/* Story 4.6 - AC1: 标签管理按钮 */}
              {onUpdateTags && allTags.length > 0 && (
                <div className="relative">
                  <TagSelectorButton
                    selectedCount={word.tagIds?.length || 0}
                    onClick={() => setShowTagSelector(!showTagSelector)}
                    disabled={isUpdatingTags}
                  />

                  {/* Story 4.6 - AC1, AC2, AC3: 标签选择器弹窗 */}
                  {showTagSelector && (
                    <TagSelector
                      allTags={allTags}
                      selectedTagIds={word.tagIds || []}
                      onToggle={handleTagToggle}
                      onClose={() => setShowTagSelector(false)}
                      onManageTags={onManageTags}
                      isLoading={isUpdatingTags}
                    />
                  )}
                </div>
              )}
            </div>

            {showConfirm ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                  type="button"
                >
                  {isDeleting ? 'Deleting...' : 'Confirm'}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-2 py-1 bg-gray-200 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-300 transition-colors"
                  type="button"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowConfirm(true)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
                title="Delete word"
                type="button"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}

/**
 * 空状态组件
 */
function EmptyState(): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
        <BookOpen size={40} className="text-gray-300" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">No words saved yet</h3>
      <p className="text-gray-400 max-w-xs">
        Start reading and save new words!
      </p>
    </div>
  );
}

/**
 * 词库列表组件
 * Story 2.2 - AC1, AC2, AC3, AC4 实现
 * Story 2.5 - AC1: 搜索, AC2: 排序, AC3: 空结果状态
 * Story 3.3 - AC1: 添加复习入口
 * Story 4.5 - AC1: 搜索高亮, AC2: 标签筛选
 * Story 4.6 - AC4: 批量添加标签
 */
export function VocabularyList({
  onJumpToSource,
  onStartReview,
  onOpenSettings,
}: VocabularyListProps): React.ReactElement {
  // 使用搜索 Hook - Story 2.5
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

  // 标签数据 - Story 4.5
  const { tags } = useTags();

  // 标签筛选状态 - Story 4.5 AC2
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  // 待复习词汇数量 - Story 3.3
  const { dueCount } = useDueCount();

  // Story 4.6 - AC4: 批量选择状态
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(new Set());
  const [showBatchTagSelector, setShowBatchTagSelector] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  // 排序状态 - Story 2.5 AC2
  const [sortOption, setSortOption] = useState<SortOption>('recent');

  /**
   * 切换标签筛选
   * Story 4.5 - AC2
   */
  const handleToggleTag = useCallback((tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  }, []);

  /**
   * 清除标签筛选
   * Story 4.5 - AC3
   */
  const handleClearTagFilter = useCallback(() => {
    setSelectedTagIds([]);
  }, []);

  /**
   * 清除所有筛选（搜索 + 标签）
   * Story 4.5 - AC3
   */
  const handleClearAllFilters = useCallback(() => {
    clearSearch();
    setSelectedTagIds([]);
  }, [clearSearch]);

  // 从 storage 加载排序偏好
  useEffect(() => {
    chrome.storage.local.get(['sortOption'], (result) => {
      const savedOption = result.sortOption as string | undefined;
      if (savedOption && ['recent', 'oldest', 'alphabetical'].includes(savedOption)) {
        setSortOption(savedOption as SortOption);
      }
    });
  }, []);

  /**
   * 处理排序变化
   * Story 2.5 - AC2: 保存排序偏好
   */
  const handleSortChange = useCallback((option: SortOption) => {
    setSortOption(option);
    chrome.storage.local.set({ sortOption: option });
  }, []);

  /**
   * 处理删除词汇
   */
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'DELETE_WORD',
          payload: { id },
        });

        if (response.success) {
          // 刷新搜索结果
          setSearchQuery(searchQuery);
        } else {
          console.error('[LingoRecall] Delete failed:', response.error);
        }
      } catch (err) {
        console.error('[LingoRecall] Delete error:', err);
      }
    },
    [searchQuery, setSearchQuery]
  );

  /**
   * 处理更新词汇标签
   * Story 4.6 - AC2, AC3: 添加或移除标签
   */
  const handleUpdateWordTags = useCallback(
    async (wordId: string, tagId: string, isSelected: boolean) => {
      // 获取当前词汇
      const word = searchResults?.find((w) => w.id === wordId);
      if (!word) return;

      // 计算新的 tagIds
      const currentTagIds = word.tagIds || [];
      let newTagIds: string[];

      if (isSelected) {
        // 添加标签
        if (currentTagIds.includes(tagId)) return; // 已存在
        newTagIds = [...currentTagIds, tagId];
      } else {
        // 移除标签
        if (!currentTagIds.includes(tagId)) return; // 不存在
        newTagIds = currentTagIds.filter((id) => id !== tagId);
      }

      try {
        const response = await chrome.runtime.sendMessage({
          type: MessageTypes.UPDATE_WORD,
          payload: {
            id: wordId,
            updates: { tagIds: newTagIds },
          },
        });

        if (response.success) {
          // 刷新搜索结果以反映更新
          setSearchQuery(searchQuery);
        } else {
          console.error('[LingoRecall] Update word tags failed:', response.error);
        }
      } catch (err) {
        console.error('[LingoRecall] Update word tags error:', err);
      }
    },
    [searchResults, searchQuery, setSearchQuery]
  );

  /**
   * Story 4.6 - AC4: 切换词汇选中状态
   */
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

  /**
   * Story 4.6 - AC4: 切换批量选择模式
   */
  const handleToggleSelectionMode = useCallback(() => {
    setIsSelectionMode((prev) => {
      if (prev) {
        // 退出选择模式时清空选中
        setSelectedWordIds(new Set());
      }
      return !prev;
    });
  }, []);

  /**
   * Story 4.6 - AC4: 清除选中
   */
  const handleClearSelection = useCallback(() => {
    setSelectedWordIds(new Set());
    setIsSelectionMode(false);
  }, []);

  /**
   * Story 4.6 - AC4: 批量添加标签
   */
  const handleBatchAddTags = useCallback(
    async (tagIds: string[]) => {
      if (selectedWordIds.size === 0 || tagIds.length === 0) return;

      setIsBatchProcessing(true);
      try {
        // 为每个选中的词汇添加标签
        const updatePromises = Array.from(selectedWordIds).map(async (wordId) => {
          const word = searchResults?.find((w) => w.id === wordId);
          if (!word) return;

          // 合并现有标签和新标签（去重）
          const currentTagIds = word.tagIds || [];
          const mergedTagIds = [...new Set([...currentTagIds, ...tagIds])];

          // 如果没有变化则跳过
          if (mergedTagIds.length === currentTagIds.length) return;

          return chrome.runtime.sendMessage({
            type: MessageTypes.UPDATE_WORD,
            payload: {
              id: wordId,
              updates: { tagIds: mergedTagIds },
            },
          });
        });

        await Promise.all(updatePromises);

        // 刷新数据
        setSearchQuery(searchQuery);

        // 清除选中状态
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

  /**
   * 对词汇列表进行排序和标签筛选
   * Story 2.5 - AC2: 排序逻辑
   * Story 4.5 - AC2: 标签筛选
   */
  const sortedWords = useMemo(() => {
    if (!searchResults) return [];

    // 先应用标签筛选
    let words = selectedTagIds.length > 0
      ? searchResults.filter((word) => matchesTags(word, selectedTagIds))
      : [...searchResults];

    const config = SORT_CONFIG[sortOption];

    words.sort((a, b) => {
      if (config.field === 'text') {
        // 字母排序
        const comparison = a.text.localeCompare(b.text, 'en', { sensitivity: 'base' });
        return config.order === 'asc' ? comparison : -comparison;
      } else {
        // 时间排序
        const aVal = a[config.field] as number;
        const bVal = b[config.field] as number;
        return config.order === 'asc' ? aVal - bVal : bVal - aVal;
      }
    });

    return words;
  }, [searchResults, sortOption, selectedTagIds]);

  // 是否有活跃的筛选（搜索或标签）
  const hasTagFilter = selectedTagIds.length > 0;
  const hasAnyFilter = hasActiveSearch || hasTagFilter;

  /**
   * 渲染内容
   */
  const renderContent = () => {
    // 加载状态
    if (isSearching && !searchResults) {
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
          <p className="text-gray-500 text-sm">加载中...</p>
        </div>
      );
    }

    // 错误状态
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <AlertCircle size={32} className="text-red-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">加载失败</h3>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <button
            onClick={clearSearch}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors"
          >
            重试
          </button>
        </div>
      );
    }

    // 完全空的词库
    if (totalCount === 0) {
      return <EmptyState />;
    }

    // 搜索/筛选无结果 - Story 2.5 AC3, Story 4.5 AC4
    if (hasAnyFilter && sortedWords.length === 0) {
      return (
        <NoResults
          query={searchQuery}
          onClear={hasAnyFilter ? handleClearAllFilters : clearSearch}
        />
      );
    }

    // 词汇列表
    return (
      <div className={`grid gap-4 ${isSelectionMode ? 'pb-20' : ''}`}>
        {sortedWords.map((word) => (
          <WordCard
            key={word.id}
            word={word}
            onJumpToSource={onJumpToSource}
            onDelete={handleDelete}
            searchKeyword={searchQuery}
            allTags={tags}
            onUpdateTags={handleUpdateWordTags}
            onManageTags={onOpenSettings}
            isSelectionMode={isSelectionMode}
            isSelected={selectedWordIds.has(word.id)}
            onSelectionToggle={() => handleToggleWordSelection(word.id)}
          />
        ))}
      </div>
    );
  };

  return (
    <div>
      {/* Header with title and stats */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-gray-900">我的词库</h2>
          <p className="text-gray-500 text-sm">
            {hasAnyFilter ? (
              <>找到 {sortedWords.length} 个匹配，共 {totalCount} 个词汇</>
            ) : (
              <>共 {totalCount} 个词汇</>
            )}
          </p>
        </div>

        {/* 按钮组 */}
        <div className="flex items-center gap-2">
          {/* Story 4.6 - AC4: 批量选择按钮 */}
          {totalCount > 0 && tags.length > 0 && (
            <button
              onClick={handleToggleSelectionMode}
              className={`p-2 rounded-xl transition-colors ${
                isSelectionMode
                  ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
              type="button"
              aria-label={isSelectionMode ? '取消批量选择' : '批量选择'}
              data-testid="batch-select-toggle"
            >
              <CheckSquare size={20} />
            </button>
          )}

          {/* 设置按钮 - Story 4.1 */}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
              type="button"
              aria-label="设置"
            >
              <Settings size={20} />
            </button>
          )}

          {/* 开始复习按钮 - Story 3.3 AC1 */}
          {onStartReview && (
            <button
              onClick={onStartReview}
              className="relative flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm"
              type="button"
            >
              <GraduationCap size={18} />
              <span>开始复习</span>
              {/* 待复习数量 Badge */}
              {dueCount > 0 && (
                <span className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {dueCount > 99 ? '99+' : dueCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Search and Sort Controls - Story 2.5 AC1, AC2 */}
      {totalCount > 0 && (
        <div className="space-y-3 mb-6">
          <div className="flex gap-3">
            <div className="flex-1">
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

          {/* Tag Filter - Story 4.5 AC2 */}
          {tags.length > 0 && (
            <TagFilter
              tags={tags}
              selectedIds={selectedTagIds}
              onToggle={handleToggleTag}
              onClearAll={handleClearTagFilter}
            />
          )}

          {/* Clear all filters button - Story 4.5 AC3 */}
          {hasAnyFilter && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                {hasActiveSearch && `搜索: "${searchQuery}"`}
                {hasActiveSearch && hasTagFilter && ' + '}
                {hasTagFilter && `${selectedTagIds.length} 个标签筛选`}
              </span>
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="text-blue-500 hover:text-blue-700"
              >
                清除全部筛选
              </button>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {renderContent()}

      {/* Story 4.6 - AC4: 批量操作工具栏 */}
      <BatchActionBar
        selectedCount={selectedWordIds.size}
        onAddTags={() => setShowBatchTagSelector(true)}
        onClearSelection={handleClearSelection}
        isProcessing={isBatchProcessing}
      />

      {/* Story 4.6 - AC4: 批量标签选择弹窗 */}
      <BatchTagSelector
        isOpen={showBatchTagSelector}
        allTags={tags}
        wordCount={selectedWordIds.size}
        onClose={() => setShowBatchTagSelector(false)}
        onConfirm={handleBatchAddTags}
      />
    </div>
  );
}

export default VocabularyList;
