/**
 * LingoRecall AI - Review Page Component
 * Story 3.3 实现 - 复习页面容器
 *
 * 管理复习状态、卡片切换、进度显示
 *
 * @module popup/components/ReviewPage
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ReviewCard } from './ReviewCard';
import { ReviewComplete, type ReviewStats } from './ReviewComplete';
import { useReview } from '../../hooks/useReview';
import type { ReviewResult } from '../../shared/utils/ebbinghaus';
import type { useToast } from './Toast';

/**
 * Toast 类型定义
 */
type ToastInstance = ReturnType<typeof useToast>;

/**
 * ReviewPage Props
 */
interface ReviewPageProps {
  /** 返回词库回调 */
  onBack: () => void;
  /** Toast 通知实例 */
  toast?: ToastInstance;
}

/**
 * 复习页面容器
 * Story 3.3 - AC1, AC3, AC5: 复习卡片界面逻辑
 */
export function ReviewPage({ onBack, toast }: ReviewPageProps) {
  const { t } = useTranslation();
  const { dueWords, isLoading, error, submitReview } = useReview();

  // 当前卡片索引
  const [currentIndex, setCurrentIndex] = useState(0);
  // 卡片是否翻转
  const [isFlipped, setIsFlipped] = useState(false);
  // 复习统计
  const [stats, setStats] = useState<ReviewStats>({
    total: 0,
    remembered: 0,
    forgotten: 0,
  });
  // 是否正在提交
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 初始化统计数据
  useEffect(() => {
    if (dueWords.length > 0) {
      setStats((prev) => ({ ...prev, total: dueWords.length }));
    }
  }, [dueWords.length]);

  /**
   * 处理卡片翻转
   */
  const handleFlip = useCallback(() => {
    setIsFlipped(true);
  }, []);

  /**
   * 处理复习结果
   * Story 3.3 - AC3: 点击按钮后切换到下一张卡片
   */
  const handleResult = useCallback(
    async (result: ReviewResult) => {
      if (isSubmitting) return;

      const currentWord = dueWords[currentIndex];
      if (!currentWord) return;

      setIsSubmitting(true);

      try {
        // 提交复习结果
        const success = await submitReview(currentWord.id, result);

        if (success) {
          // 更新统计
          setStats((prev) => ({
            ...prev,
            [result]: prev[result] + 1,
          }));

          // 重置翻转状态并切换到下一张
          setIsFlipped(false);

          // 短暂延迟后切换卡片，让动画更自然
          setTimeout(() => {
            setCurrentIndex((prev) => prev + 1);
          }, 100);
        } else {
          // 提交失败时显示 Toast 通知
          toast?.error(t('review.toast.submitFailed'));
        }
      } catch (err) {
        console.error('[LingoRecall] Review submit error:', err);
        toast?.error(t('review.toast.submitFailed'));
      } finally {
        setIsSubmitting(false);
      }
    },
    [currentIndex, dueWords, isSubmitting, submitReview, toast, t]
  );

  // 加载状态
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 min-h-[300px]">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-6 min-h-[300px]">
        <span className="text-4xl mb-4" role="img" aria-label={t('common.error')}>
          😕
        </span>
        <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
        <button
          onClick={onBack}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          type="button"
        >
          {t('review.empty.back')}
        </button>
      </div>
    );
  }

  // 空状态 - Story 3.3 AC5
  if (dueWords.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 min-h-[300px]">
        <span className="text-6xl mb-4" role="img" aria-label={t('review.empty.title')}>
          🎉
        </span>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">{t('review.empty.title')}</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">{t('review.empty.message')}</p>
        <button
          onClick={onBack}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          type="button"
        >
          {t('review.empty.back')}
        </button>
      </div>
    );
  }

  // 复习完成 - Story 3.3 AC4
  if (currentIndex >= dueWords.length) {
    return <ReviewComplete stats={stats} onBack={onBack} />;
  }

  const currentWord = dueWords[currentIndex];

  return (
    <div className="flex flex-col h-full p-4">
      {/* 顶部导航栏 */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors p-1"
          type="button"
          aria-label={t('common.back')}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        {/* 进度显示 - Story 3.3 AC3 */}
        <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">
          {currentIndex + 1} / {dueWords.length}
        </span>

        {/* 占位符保持布局平衡 */}
        <div className="w-6" />
      </div>

      {/* 进度条 */}
      <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / dueWords.length) * 100}%` }}
        />
      </div>

      {/* 复习卡片 */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-sm">
          <ReviewCard
            word={currentWord}
            isFlipped={isFlipped}
            onFlip={handleFlip}
            onRemembered={() => handleResult('remembered')}
            onForgotten={() => handleResult('forgotten')}
          />
        </div>
      </div>

      {/* 底部提示 */}
      {!isFlipped && (
        <p className="text-center text-gray-400 dark:text-gray-500 text-xs mt-4">
          {t('review.clickToReveal')}
        </p>
      )}
    </div>
  );
}

export default ReviewPage;
