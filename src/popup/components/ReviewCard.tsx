/**
 * LingoRecall AI - Review Card Component
 * Story 3.3 实现 - AC1, AC2: 复习卡片翻转界面
 *
 * 实现卡片正面显示英文单词，背面显示中文释义、原文语境、来源标题
 * 使用 CSS 3D Transform 实现 300ms 翻转动画
 *
 * @module popup/components/ReviewCard
 */

import React from 'react';
import type { WordRecord } from '../../shared/messaging';

/**
 * ReviewCard Props
 */
interface ReviewCardProps {
  /** 当前词汇记录 */
  word: WordRecord;
  /** 是否翻转到背面 */
  isFlipped: boolean;
  /** 翻转回调 */
  onFlip: () => void;
  /** 记住了回调 */
  onRemembered: () => void;
  /** 忘记了回调 */
  onForgotten: () => void;
}

/**
 * 复习卡片组件
 * Story 3.3 - AC1: 卡片正面显示英文单词，背面显示释义和语境
 * Story 3.3 - AC2: 300ms 翻转动画
 */
export function ReviewCard({
  word,
  isFlipped,
  onFlip,
  onRemembered,
  onForgotten,
}: ReviewCardProps) {
  return (
    <div className="relative w-full h-64" style={{ perspective: '1000px' }}>
      {/* 卡片容器 */}
      <div
        className="relative w-full h-full transition-transform duration-300 ease-in-out cursor-pointer"
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
        onClick={() => !isFlipped && onFlip()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            if (!isFlipped) onFlip();
          }
        }}
        aria-label={isFlipped ? '卡片背面' : '点击显示答案'}
      >
        {/* 卡片正面 */}
        <div
          className="absolute w-full h-full bg-white rounded-lg shadow-lg p-6 flex flex-col items-center justify-center"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <span className="text-3xl font-bold text-gray-800 text-center break-words max-w-full">
            {word.text}
          </span>
          <span className="text-gray-400 mt-4 text-sm">点击显示答案</span>
        </div>

        {/* 卡片背面 */}
        <div
          className="absolute w-full h-full bg-white rounded-lg shadow-lg p-4 overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <div className="flex flex-col h-full">
            {/* 词汇信息区域 */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {/* 单词和发音 */}
              <div className="mb-2">
                <h3 className="text-xl font-bold text-gray-800 break-words">
                  {word.text}
                </h3>
                {word.pronunciation && (
                  <p className="text-gray-500 text-sm">{word.pronunciation}</p>
                )}
              </div>

              {/* 释义 */}
              <p className="text-base text-gray-700 mb-3">{word.meaning}</p>

              {/* 原文语境 */}
              <div className="p-2 bg-gray-50 rounded text-sm text-gray-600">
                <p className="italic leading-relaxed">
                  &ldquo;{word.contextBefore}
                  <span className="font-bold text-blue-600">{word.text}</span>
                  {word.contextAfter}&rdquo;
                </p>
                <p className="text-xs text-gray-400 mt-1 truncate">
                  — {word.sourceTitle}
                </p>
              </div>
            </div>

            {/* 操作按钮 - Story 3.3 AC2: 翻转后显示 */}
            <div className="flex gap-3 mt-3 pt-2 border-t border-gray-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onForgotten();
                }}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 active:bg-red-700 transition-colors font-medium"
                type="button"
              >
                忘记了
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemembered();
                }}
                className="flex-1 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 active:bg-green-700 transition-colors font-medium"
                type="button"
              >
                记住了
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReviewCard;
