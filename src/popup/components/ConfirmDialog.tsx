/**
 * LingoRecall AI - Confirm Dialog Component
 * Story 4.1 实现 - AC3: 清除 API Key 确认对话框
 *
 * @module popup/components/ConfirmDialog
 */

import React, { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * ConfirmDialog 属性
 */
export interface ConfirmDialogProps {
  /** 对话框标题 */
  title?: string;
  /** 确认消息内容 */
  message: string;
  /** 确认按钮文本 */
  confirmText?: string;
  /** 取消按钮文本 */
  cancelText?: string;
  /** 确认类型 (影响按钮颜色) */
  confirmType?: 'danger' | 'primary';
  /** 确认回调 */
  onConfirm: () => void;
  /** 取消回调 */
  onCancel: () => void;
  /** 是否正在处理 */
  isLoading?: boolean;
}

/**
 * 确认对话框组件
 * Story 4.1 - Task 5.1
 */
export function ConfirmDialog({
  title = '确认操作',
  message,
  confirmText = '确认',
  cancelText = '取消',
  confirmType = 'danger',
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmDialogProps): React.ReactElement {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // 自动聚焦到对话框
  useEffect(() => {
    dialogRef.current?.focus();

    // 按 Escape 关闭
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, isLoading]);

  // 确认按钮样式
  const confirmButtonClass =
    confirmType === 'danger'
      ? 'bg-red-500 hover:bg-red-600 focus:ring-red-500'
      : 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        // 点击遮罩关闭
        if (e.target === e.currentTarget && !isLoading) {
          onCancel();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-lg shadow-xl w-[280px] max-w-[90%] overflow-hidden"
        tabIndex={-1}
      >
        {/* 标题栏 */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200">
          <AlertTriangle
            className={`w-5 h-5 ${confirmType === 'danger' ? 'text-red-500' : 'text-blue-500'}`}
          />
          <h2 id="confirm-dialog-title" className="text-base font-medium text-gray-900">
            {title}
          </h2>
        </div>

        {/* 消息内容 */}
        <div className="px-4 py-4">
          <p id="confirm-dialog-message" className="text-sm text-gray-600 leading-relaxed">
            {message}
          </p>
        </div>

        {/* 按钮区域 */}
        <div className="flex gap-2 px-4 py-3 bg-gray-50 border-t border-gray-200">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {cancelText}
          </button>
          <button
            ref={confirmButtonRef}
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-3 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${confirmButtonClass}`}
          >
            {isLoading ? '处理中...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
