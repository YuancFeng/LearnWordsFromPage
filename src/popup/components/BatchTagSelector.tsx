/**
 * LingoRecall AI - BatchTagSelector Component
 * Story 4.6 - Task 6: 批量标签选择弹窗
 *
 * 用于批量给多个词汇添加标签
 *
 * @module popup/components/BatchTagSelector
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tag as TagIcon, Check, X, Loader2 } from 'lucide-react';
import type { Tag } from '../../shared/types/tag';

/**
 * BatchTagSelector 属性
 */
export interface BatchTagSelectorProps {
  /** 是否显示 */
  isOpen: boolean;
  /** 所有可用的标签 */
  allTags: Tag[];
  /** 选中的词汇数量 */
  wordCount: number;
  /** 关闭回调 */
  onClose: () => void;
  /** 确认添加回调 */
  onConfirm: (tagIds: string[]) => Promise<void>;
}

/**
 * 批量标签选择弹窗组件
 * Story 4.6 - AC4: 批量添加标签
 *
 * @example
 * ```tsx
 * <BatchTagSelector
 *   isOpen={showBatchSelector}
 *   allTags={tags}
 *   wordCount={selectedWords.length}
 *   onClose={() => setShowBatchSelector(false)}
 *   onConfirm={handleBatchAddTags}
 * />
 * ```
 */
export function BatchTagSelector({
  isOpen,
  allTags,
  wordCount,
  onClose,
  onConfirm,
}: BatchTagSelectorProps): React.ReactElement | null {
  const { t } = useTranslation();
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // 不显示时返回 null
  if (!isOpen) return null;

  const handleToggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleConfirm = async () => {
    if (selectedTagIds.length === 0) return;

    setIsProcessing(true);
    try {
      await onConfirm(selectedTagIds);
      setSelectedTagIds([]);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (isProcessing) return;
    setSelectedTagIds([]);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleClose}
      data-testid="batch-tag-selector-overlay"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-80 max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        data-testid="batch-tag-selector"
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <TagIcon size={18} className="text-blue-500" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {t('vocabulary.batch.addTagsTitle')}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('vocabulary.batch.addTagsDesc', { count: wordCount })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isProcessing}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded disabled:opacity-50"
            aria-label={t('common.close')}
          >
            <X size={18} />
          </button>
        </div>

        {/* 标签列表 */}
        <div className="p-4 max-h-60 overflow-y-auto">
          {allTags.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                {t('settings.tags.empty')}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                {t('vocabulary.batch.selectTagsHint')}
              </p>
              {allTags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);

                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleToggleTag(tag.id)}
                    disabled={isProcessing}
                    className={`
                      w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors
                      ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      ${isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700'
                        : 'bg-gray-50 dark:bg-gray-700 border border-transparent hover:bg-gray-100 dark:hover:bg-gray-600'
                      }
                    `}
                    data-testid={`batch-tag-option-${tag.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="text-gray-700 dark:text-gray-300">
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
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isProcessing}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isProcessing || selectedTagIds.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="batch-confirm-button"
          >
            {isProcessing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>{t('common.processing')}</span>
              </>
            ) : (
              <span>
                {t('common.add')} {selectedTagIds.length > 0 ? `(${selectedTagIds.length})` : ''}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BatchTagSelector;
