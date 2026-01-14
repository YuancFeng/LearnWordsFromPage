/**
 * LingoRecall AI - Review Complete Component
 * Story 3.3 实现 - AC4: 复习完成页面
 *
 * 显示本次复习统计：总数、记住数、忘记数
 *
 * @module popup/components/ReviewComplete
 */

import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * 复习统计数据
 */
export interface ReviewStats {
  /** 本次复习总数 */
  total: number;
  /** 记住的数量 */
  remembered: number;
  /** 忘记的数量 */
  forgotten: number;
}

/**
 * ReviewComplete Props
 */
interface ReviewCompleteProps {
  /** 复习统计 */
  stats: ReviewStats;
  /** 返回词库回调 */
  onBack: () => void;
}

/**
 * 复习完成页面
 * Story 3.3 - AC4: 显示复习完成统计
 */
export function ReviewComplete({ stats, onBack }: ReviewCompleteProps) {
  const { t } = useTranslation();
  const { total, remembered, forgotten } = stats;
  const rememberedPercent = total > 0 ? Math.round((remembered / total) * 100) : 0;

  // 根据记忆率显示不同的鼓励文案
  const getEncouragement = () => {
    if (rememberedPercent >= 90) {
      return { emoji: '🏆', text: t('review.complete.excellent') };
    } else if (rememberedPercent >= 70) {
      return { emoji: '🎉', text: t('review.complete.great') };
    } else if (rememberedPercent >= 50) {
      return { emoji: '💪', text: t('review.complete.good') };
    } else {
      return { emoji: '📚', text: t('review.complete.keepGoing') };
    }
  };

  const encouragement = getEncouragement();

  return (
    <div className="flex flex-col items-center justify-center p-6 min-h-[300px]">
      {/* 完成图标 */}
      <span className="text-6xl mb-4" role="img" aria-label={t('review.complete.title')}>
        {encouragement.emoji}
      </span>

      {/* 标题 */}
      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">{t('review.complete.title')}</h2>

      {/* 鼓励文案 */}
      <p className="text-gray-500 dark:text-gray-400 mb-6">{encouragement.text}</p>

      {/* 统计数据 */}
      <div className="w-full max-w-xs bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          {/* 总数 */}
          <div>
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{total}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('review.complete.total')}</p>
          </div>

          {/* 记住了 */}
          <div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{remembered}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('review.complete.remembered')}</p>
          </div>

          {/* 忘记了 */}
          <div>
            <p className="text-2xl font-bold text-red-500 dark:text-red-400">{forgotten}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('review.complete.forgotten')}</p>
          </div>
        </div>

        {/* 记忆率进度条 */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>{t('review.complete.retentionRate')}</span>
            <span>{rememberedPercent}%</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-300"
              style={{ width: `${rememberedPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 返回按钮 */}
      <button
        onClick={onBack}
        className="w-full max-w-xs py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-colors font-medium"
        type="button"
      >
        {t('review.complete.backToVocabulary')}
      </button>
    </div>
  );
}

export default ReviewComplete;
