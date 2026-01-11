/**
 * LingoRecall AI - Toast Notification Component
 * Story 2.1 实现 - AC1: 保存成功/失败 Toast 通知
 *
 * 在 Shadow DOM 中显示临时通知消息
 *
 * @module content/components/Toast
 */

import React, { useEffect, useState, type CSSProperties } from 'react';

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
 * Toast 位置配置
 */
const TOAST_POSITION = {
  bottom: 24,
  right: 24,
};

/**
 * 类型对应的颜色配置
 */
const TYPE_COLORS: Record<ToastType, { bg: string; text: string; border: string }> = {
  success: {
    bg: '#ECFDF5',
    text: '#065F46',
    border: '#A7F3D0',
  },
  error: {
    bg: '#FEF2F2',
    text: '#991B1B',
    border: '#FECACA',
  },
  warning: {
    bg: '#FEF3C7',
    text: '#92400E',
    border: '#FDE68A',
  },
  info: {
    bg: '#EFF6FF',
    text: '#1E40AF',
    border: '#BFDBFE',
  },
};

/**
 * 类型对应的图标
 */
function ToastIcon({ type }: { type: ToastType }): React.ReactElement {
  const iconProps = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (type) {
    case 'success':
      return (
        <svg {...iconProps}>
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );
    case 'error':
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      );
    case 'warning':
      return (
        <svg {...iconProps}>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case 'info':
    default:
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      );
  }
}

/**
 * Toast 通知组件
 */
export function Toast({
  message,
  type = 'info',
  duration = 3000,
  onClose,
}: ToastProps): React.ReactElement | null {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const colors = TYPE_COLORS[type];

  // 进入动画
  useEffect(() => {
    // 触发进入动画
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
      }, 300); // 退出动画时长

      return () => clearTimeout(exitTimer);
    }
  }, [isExiting, onClose]);

  const containerStyle: CSSProperties = {
    position: 'fixed',
    bottom: `${TOAST_POSITION.bottom}px`,
    right: `${TOAST_POSITION.right}px`,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: colors.bg,
    border: `1px solid ${colors.border}`,
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '14px',
    color: colors.text,
    zIndex: 2147483647,
    transform: isVisible && !isExiting ? 'translateY(0)' : 'translateY(20px)',
    opacity: isVisible && !isExiting ? 1 : 0,
    transition: 'transform 0.3s ease, opacity 0.3s ease',
    maxWidth: '320px',
    pointerEvents: 'auto',
  };

  const iconStyle: CSSProperties = {
    flexShrink: 0,
    color: colors.text,
  };

  const messageStyle: CSSProperties = {
    flex: 1,
    lineHeight: 1.4,
  };

  const closeButtonStyle: CSSProperties = {
    flexShrink: 0,
    width: '20px',
    height: '20px',
    padding: 0,
    background: 'none',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.text,
    opacity: 0.6,
  };

  return (
    <div style={containerStyle} role="alert" aria-live="polite">
      <span style={iconStyle}>
        <ToastIcon type={type} />
      </span>
      <span style={messageStyle}>{message}</span>
      <button
        style={closeButtonStyle}
        onClick={() => setIsExiting(true)}
        aria-label="关闭"
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1';
          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '0.6';
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export default Toast;
