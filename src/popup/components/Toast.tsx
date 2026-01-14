/**
 * LingoRecall AI - Popup Toast Component
 * Story 4.1 实现 - AC1: 显示操作成功/失败通知
 *
 * Popup 页面专用 Toast 组件（适配 Popup 布局）
 *
 * @module popup/components/Toast
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

/**
 * Toast 类型
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * Toast 属性
 */
export interface ToastProps {
  /** 消息内容 */
  message: string;
  /** Toast 类型 */
  type?: ToastType;
  /** 显示时长 (毫秒) */
  duration?: number;
  /** 关闭回调 */
  onClose?: () => void;
}

/**
 * 类型对应的样式配置（支持 dark mode）
 */
const TYPE_STYLES: Record<
  ToastType,
  {
    bg: string;
    border: string;
    text: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  success: {
    bg: 'bg-green-50 dark:bg-green-900/30',
    border: 'border-green-200 dark:border-green-700',
    text: 'text-green-800 dark:text-green-300',
    icon: CheckCircle,
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/30',
    border: 'border-red-200 dark:border-red-700',
    text: 'text-red-800 dark:text-red-300',
    icon: XCircle,
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/30',
    border: 'border-yellow-200 dark:border-yellow-700',
    text: 'text-yellow-800 dark:text-yellow-300',
    icon: AlertCircle,
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    border: 'border-blue-200 dark:border-blue-700',
    text: 'text-blue-800 dark:text-blue-300',
    icon: Info,
  },
};

/**
 * Popup Toast 通知组件
 * Story 4.1 - Task 5.2
 */
export function Toast({
  message,
  type = 'info',
  duration = 3000,
  onClose,
}: ToastProps): React.ReactElement | null {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const styles = TYPE_STYLES[type];
  const IconComponent = styles.icon;

  // 进入动画
  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    // 自动关闭
    const closeTimer = setTimeout(() => {
      setIsExiting(true);
    }, duration);

    return () => clearTimeout(closeTimer);
  }, [duration]);

  // 退出动画完成后调用 onClose
  useEffect(() => {
    if (isExiting) {
      const exitTimer = setTimeout(() => {
        onClose?.();
      }, 200);

      return () => clearTimeout(exitTimer);
    }
  }, [isExiting, onClose]);

  const handleClose = () => {
    setIsExiting(true);
  };

  return (
    <div
      className={`
        fixed bottom-4 left-4 right-4 z-50
        flex items-center gap-2 p-3
        ${styles.bg} ${styles.text} border ${styles.border}
        rounded-lg shadow-lg
        transition-all duration-200
        ${isVisible && !isExiting ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
      role="alert"
      aria-live="polite"
    >
      <IconComponent className="w-5 h-5 flex-shrink-0" />
      <span className="flex-1 text-sm">{message}</span>
      <button
        onClick={handleClose}
        className="flex-shrink-0 p-0.5 rounded hover:bg-black/5 transition-colors"
        aria-label={t('common.close')}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ============================================================
// Toast Manager Hook
// ============================================================

/**
 * Toast 状态
 */
interface ToastState {
  id: number;
  message: string;
  type: ToastType;
  duration?: number;
}

let toastId = 0;

/**
 * Toast 管理器
 * 用于在组件外部显示 Toast
 */
export function useToast() {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  const showToast = (message: string, type: ToastType = 'info', duration?: number) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  };

  const hideToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const ToastContainer = () => (
    <>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => hideToast(toast.id)}
        />
      ))}
    </>
  );

  return {
    showToast,
    hideToast,
    ToastContainer,
    // 便捷方法
    success: (message: string, duration?: number) => showToast(message, 'success', duration),
    error: (message: string, duration?: number) => showToast(message, 'error', duration),
    warning: (message: string, duration?: number) => showToast(message, 'warning', duration),
    info: (message: string, duration?: number) => showToast(message, 'info', duration),
  };
}

export default Toast;
