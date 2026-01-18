/**
 * LingoRecall AI - Word Detail Drawer Component
 * 词汇详情侧边栏抽屉组件
 *
 * 提供类似 Gmail/Notion 的侧边栏抽屉体验，展示词汇详情
 *
 * @module options/components/WordDetailDrawer
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  X,
  ExternalLink,
  Loader2,
  AlertCircle,
  Clock,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Volume2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { HighlightedText } from '../../popup/components/HighlightedText';
import { TagBadgeList } from '../../popup/components/TagBadge';
import { TagSelector, TagSelectorButton } from '../../popup/components/TagSelector';
import { MessageTypes } from '../../shared/messaging/types';
import type { WordRecord, JumpToSourcePayload } from '../../shared/messaging/types';
import type { Tag } from '../../shared/types/tag';
import { ErrorCode } from '../../shared/types/errors';

interface WordDetailDrawerProps {
  /** 当前选中的词汇 */
  word: WordRecord | null;
  /** 关闭抽屉 */
  onClose: () => void;
  /** 删除词汇 */
  onDelete: (id: string) => void;
  /** 所有标签 */
  allTags?: Tag[];
  /** 更新词汇标签 */
  onUpdateTags?: (wordId: string, tagId: string, isSelected: boolean) => void;
  /** 打开标签管理 */
  onManageTags?: () => void;
  /** 搜索关键词用于高亮 */
  searchKeyword?: string;
  /** 上一个词汇 */
  onPrevious?: () => void;
  /** 下一个词汇 */
  onNext?: () => void;
  /** 是否有上一个 */
  hasPrevious?: boolean;
  /** 是否有下一个 */
  hasNext?: boolean;
  /** 当前位置信息 */
  currentIndex?: number;
  /** 总数 */
  totalCount?: number;
}

export function WordDetailDrawer({
  word,
  onClose,
  onDelete,
  allTags = [],
  onUpdateTags,
  onManageTags,
  searchKeyword = '',
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  currentIndex,
  totalCount,
}: WordDetailDrawerProps): React.ReactElement | null {
  const { t } = useTranslation();
  const [isJumping, setIsJumping] = useState(false);
  const [jumpError, setJumpError] = useState<string | null>(null);
  const [showContextPreview, setShowContextPreview] = useState(false);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [isUpdatingTags, setIsUpdatingTags] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 当词汇变化时重置状态
  useEffect(() => {
    setJumpError(null);
    setShowContextPreview(false);
    setShowTagSelector(false);
    setShowDeleteConfirm(false);
  }, [word?.id]);

  // 键盘导航
  useEffect(() => {
    if (!word) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && hasPrevious && onPrevious) {
        onPrevious();
      } else if (e.key === 'ArrowRight' && hasNext && onNext) {
        onNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [word, onClose, hasPrevious, hasNext, onPrevious, onNext]);

  const wordTags = React.useMemo(() => {
    if (!word?.tagIds || word.tagIds.length === 0 || allTags.length === 0) return [];
    return allTags.filter((tag) => word.tagIds.includes(tag.id));
  }, [word?.tagIds, allTags]);

  const handleTagToggle = useCallback(
    async (tagId: string, isSelected: boolean) => {
      if (!onUpdateTags || !word || isUpdatingTags) return;
      setIsUpdatingTags(true);
      try {
        await onUpdateTags(word.id, tagId, isSelected);
      } finally {
        setIsUpdatingTags(false);
      }
    },
    [word, onUpdateTags, isUpdatingTags]
  );

  const handleJumpToSource = async () => {
    if (!word?.sourceUrl) return;

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
        if (response.error?.code === ErrorCode.PAGE_INACCESSIBLE) {
          setJumpError(t('vocabulary.inaccessible'));
          setShowContextPreview(true);
        } else {
          setJumpError(response.error?.message || t('analysis.errors.generic'));
        }
      }
    } catch (error) {
      console.error('[LingoRecall] Jump to source error:', error);
      setJumpError(t('analysis.errors.generic'));
    } finally {
      setIsJumping(false);
    }
  };

  const handleDelete = async () => {
    if (!word) return;
    setIsDeleting(true);
    try {
      await onDelete(word.id);
      onClose();
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const formattedDate = word ? new Date(word.createdAt).toLocaleDateString() : '';

  if (!word) {
    return null;
  }

  return (
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black/30 dark:bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* 抽屉面板 */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col animate-slide-in-right">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {/* 导航按钮 */}
            <div className="flex items-center gap-1">
              <button
                onClick={onPrevious}
                disabled={!hasPrevious}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title={t('common.previous')}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={onNext}
                disabled={!hasNext}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title={t('common.next')}
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* 位置指示器 */}
            {currentIndex !== undefined && totalCount !== undefined && (
              <span className="text-sm text-gray-400 dark:text-gray-500">
                {currentIndex + 1} / {totalCount}
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={t('common.close')}
          >
            <X size={20} />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* 单词标题 */}
            <div>
              <div className="flex items-start gap-3 flex-wrap">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  <HighlightedText text={word.text} keyword={searchKeyword} />
                </h2>
                {word.partOfSpeech && (
                  <span className="mt-2 px-2.5 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                    {word.partOfSpeech}
                  </span>
                )}
              </div>

              {/* 发音 */}
              {word.pronunciation && (
                <div className="mt-2 flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <span className="text-lg">/{word.pronunciation}/</span>
                  <button
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    title={t('vocabulary.playPronunciation')}
                  >
                    <Volume2 size={16} />
                  </button>
                </div>
              )}

              {/* 标签 */}
              {wordTags.length > 0 && (
                <div className="mt-3">
                  <TagBadgeList tags={wordTags} size="md" />
                </div>
              )}

              {/* 日期 */}
              <div className="mt-3 text-sm text-gray-400 dark:text-gray-500 flex items-center gap-1">
                <Clock size={14} />
                <span>{formattedDate}</span>
              </div>
            </div>

            {/* 释义 */}
            {word.meaning && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                  {t('vocabulary.meaning')}
                </h3>
                <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                  <HighlightedText text={word.meaning} keyword={searchKeyword} />
                </p>
              </div>
            )}

            {/* 例句 */}
            {word.exampleSentence && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 flex items-center gap-1">
                  <Clock size={12} />
                  {t('vocabulary.example')}
                </h3>
                <blockquote className="text-gray-600 dark:text-gray-300 italic border-l-4 border-blue-400 dark:border-blue-500 pl-4 py-2 bg-blue-50/50 dark:bg-blue-900/20 rounded-r-lg">
                  "{word.exampleSentence}"
                </blockquote>
              </div>
            )}

            {/* 来源 */}
            {word.sourceTitle && (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                  {t('vocabulary.source')}
                </h3>
                <p className="text-gray-700 dark:text-gray-300 text-sm">{word.sourceTitle}</p>
              </div>
            )}

            {/* 跳转错误 */}
            {jumpError && (
              <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl">
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle size={16} />
                  {jumpError}
                </p>
              </div>
            )}

            {/* 上下文预览 */}
            {showContextPreview && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-4">
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mb-2">
                  {t('vocabulary.inaccessible')}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="text-gray-500 dark:text-gray-400">...{word.contextBefore}</span>
                  <mark className="bg-yellow-200 dark:bg-yellow-700 dark:text-yellow-100 px-1 font-semibold rounded">
                    {word.text}
                  </mark>
                  <span className="text-gray-500 dark:text-gray-400">{word.contextAfter}...</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 底部操作区 */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* 跳转到原文 */}
              {word.sourceUrl && (
                <button
                  onClick={handleJumpToSource}
                  disabled={isJumping}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isJumping ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <ExternalLink size={16} />
                  )}
                  <span>{isJumping ? t('vocabulary.jumping') : t('vocabulary.jumpToSource')}</span>
                </button>
              )}

              {/* 标签管理 */}
              {onUpdateTags && allTags.length > 0 && (
                <div className="relative">
                  <TagSelectorButton
                    selectedCount={word.tagIds?.length || 0}
                    onClick={() => setShowTagSelector(!showTagSelector)}
                    disabled={isUpdatingTags}
                  />
                  {showTagSelector && (
                    <div className="absolute bottom-full left-0 mb-2">
                      <TagSelector
                        allTags={allTags}
                        selectedTagIds={word.tagIds || []}
                        onToggle={handleTagToggle}
                        onClose={() => setShowTagSelector(false)}
                        onManageTags={onManageTags}
                        isLoading={isUpdatingTags}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 删除按钮 */}
            {showDeleteConfirm ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-3 py-2 bg-red-500 text-white text-sm font-medium rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? t('common.processing') : t('common.confirm')}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  {t('common.cancel')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1 px-3 py-2 text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors"
              >
                <Trash2 size={16} />
                <span className="text-sm font-medium">{t('common.delete')}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CSS 动画 */}
      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.25s ease-out;
        }
      `}</style>
    </>
  );
}

export default WordDetailDrawer;
