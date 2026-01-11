/**
 * LingoRecall AI - Review Complete Component
 * Story 3.3 实现 - AC4: 复习完成页面
 *
 * 显示本次复习统计：总数、记住数、忘记数
 *
 * @module popup/components/ReviewComplete
 */

import React from 'react';

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
  const { total, remembered, forgotten } = stats;
  const rememberedPercent = total > 0 ? Math.round((remembered / total) * 100) : 0;

  // 根据记忆率显示不同的鼓励文案
  const getEncouragement = () => {
    if (rememberedPercent >= 90) {
      return { emoji: '🏆', text: '太棒了！记忆力超群！' };
    } else if (rememberedPercent >= 70) {
      return { emoji: '🎉', text: '做得很好！继续保持！' };
    } else if (rememberedPercent >= 50) {
      return { emoji: '💪', text: '不错的开始！多复习几次会更好！' };
    } else {
      return { emoji: '📚', text: '别灰心！复习是记忆的关键！' };
    }
  };

  const encouragement = getEncouragement();

  return (
    <div className="flex flex-col items-center justify-center p-6 min-h-[300px]">
      {/* 完成图标 */}
      <span className="text-6xl mb-4" role="img" aria-label="完成">
        {encouragement.emoji}
      </span>

      {/* 标题 */}
      <h2 className="text-xl font-bold text-gray-800 mb-2">复习完成！</h2>

      {/* 鼓励文案 */}
      <p className="text-gray-500 mb-6">{encouragement.text}</p>

      {/* 统计数据 */}
      <div className="w-full max-w-xs bg-gray-50 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          {/* 总数 */}
          <div>
            <p className="text-2xl font-bold text-gray-800">{total}</p>
            <p className="text-xs text-gray-500">总复习</p>
          </div>

          {/* 记住了 */}
          <div>
            <p className="text-2xl font-bold text-green-600">{remembered}</p>
            <p className="text-xs text-gray-500">记住了</p>
          </div>

          {/* 忘记了 */}
          <div>
            <p className="text-2xl font-bold text-red-500">{forgotten}</p>
            <p className="text-xs text-gray-500">忘记了</p>
          </div>
        </div>

        {/* 记忆率进度条 */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>记忆率</span>
            <span>{rememberedPercent}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
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
        返回词库
      </button>
    </div>
  );
}

export default ReviewComplete;
