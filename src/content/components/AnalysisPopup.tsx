/**
 * LingoRecall AI - Analysis Popup Component
 * 显示 AI 分析结果的弹窗组件
 *
 * Story 1.6 实现
 * - AC-2: 320px 宽弹窗，显示含义、音标、词性、用法
 * - AC-6: 点击外部关闭弹窗
 *
 * @module content/components/AnalysisPopup
 */

import React, { useEffect, useState, type CSSProperties } from 'react';

/**
 * 分析模式类型
 */
export type AnalysisMode = 'word' | 'translate';

/**
 * AI 分析结果接口
 */
export interface AIAnalysisResult {
  /** 词汇含义（中文）或翻译结果 */
  meaning: string;
  /** IPA 音标（翻译模式为空） */
  pronunciation: string;
  /** 词性（翻译模式为空） */
  partOfSpeech: string;
  /** 语境用法说明（翻译模式为空） */
  usage: string;
  /** 分析模式 */
  mode?: AnalysisMode;
}

/**
 * AnalysisPopup 组件属性
 */
interface AnalysisPopupProps {
  /** 弹窗位置 */
  position: { x: number; y: number };
  /** 分析结果 */
  result: AIAnalysisResult;
  /** 选中的文本 */
  selectedText: string;
  /** 保存回调 */
  onSave: () => void;
  /** 关闭回调 */
  onClose: () => void;
  /** 是否为翻译模式（可选，可从 result.mode 推断） */
  isTranslateMode?: boolean;
}

/** 弹窗宽度 - 单词模式 */
const POPUP_WIDTH_WORD = 320;
/** 弹窗宽度 - 翻译模式（更宽以显示长文本） */
const POPUP_WIDTH_TRANSLATE = 420;
/** 最大高度 - 单词模式 */
const MAX_HEIGHT_WORD = 400;
/** 最大高度 - 翻译模式 */
const MAX_HEIGHT_TRANSLATE = 500;

/**
 * 设计令牌
 */
const tokens = {
  colors: {
    primary: '#3B82F6',
    primaryHover: '#2563EB',
    background: '#FFFFFF',
    backgroundSecondary: '#F9FAFB',
    text: '#111827',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    partOfSpeech: {
      bg: '#DBEAFE',
      text: '#1D4ED8',
    },
    success: '#10B981',
    successHover: '#059669',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
  },
  borderRadius: {
    sm: '4px',
    md: '6px',
    lg: '8px',
  },
  fontSize: {
    xs: '12px',
    sm: '14px',
    md: '16px',
  },
  shadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
};

/**
 * 样式定义
 * 注意：width 和 maxHeight 会在组件中动态覆盖
 */
const styles: Record<string, CSSProperties> = {
  container: {
    position: 'fixed',
    // width 和 maxHeight 在组件中根据模式动态设置
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.borderRadius.lg,
    boxShadow: tokens.shadow,
    overflow: 'hidden',
    zIndex: 2147483647,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: tokens.spacing.md,
    borderBottom: `1px solid ${tokens.colors.border}`,
    backgroundColor: tokens.colors.backgroundSecondary,
  },
  headerContent: {
    flex: 1,
  },
  word: {
    fontSize: tokens.fontSize.md,
    fontWeight: 600,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.xs,
  },
  pronunciation: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textSecondary,
  },
  closeButton: {
    width: '24px',
    height: '24px',
    padding: 0,
    background: 'none',
    border: 'none',
    borderRadius: tokens.borderRadius.sm,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: tokens.colors.textSecondary,
    marginLeft: tokens.spacing.sm,
    flexShrink: 0,
  },
  body: {
    padding: tokens.spacing.lg,
    overflowY: 'auto' as const,
    // maxHeight 在组件中根据模式动态设置
  },
  section: {
    marginBottom: tokens.spacing.md,
  },
  sectionLast: {
    marginBottom: 0,
  },
  label: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.textSecondary,
    marginBottom: tokens.spacing.xs,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  value: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.text,
    lineHeight: 1.5,
  },
  partOfSpeech: {
    display: 'inline-block',
    padding: `2px ${tokens.spacing.sm}`,
    backgroundColor: tokens.colors.partOfSpeech.bg,
    color: tokens.colors.partOfSpeech.text,
    borderRadius: tokens.borderRadius.sm,
    fontSize: tokens.fontSize.xs,
    fontWeight: 500,
    marginBottom: tokens.spacing.md,
  },
  footer: {
    padding: tokens.spacing.md,
    borderTop: `1px solid ${tokens.colors.border}`,
    display: 'flex',
    justifyContent: 'flex-end',
    gap: tokens.spacing.sm,
  },
  saveButton: {
    padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`,
    backgroundColor: tokens.colors.success,
    color: 'white',
    border: 'none',
    borderRadius: tokens.borderRadius.md,
    fontSize: tokens.fontSize.sm,
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.xs,
  },
};

/**
 * 计算弹窗位置，确保在视口内
 * @param position - 初始位置
 * @param isTranslateMode - 是否为翻译模式
 */
function calculatePosition(
  position: { x: number; y: number },
  isTranslateMode: boolean = false
): { x: number; y: number } {
  const padding = 16;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const popupWidth = isTranslateMode ? POPUP_WIDTH_TRANSLATE : POPUP_WIDTH_WORD;
  const maxHeight = isTranslateMode ? MAX_HEIGHT_TRANSLATE : MAX_HEIGHT_WORD;

  let x = position.x;
  let y = position.y + 8; // 向下偏移 8px

  // 水平边界检查
  if (x + popupWidth + padding > viewportWidth) {
    x = viewportWidth - popupWidth - padding;
  }
  if (x < padding) {
    x = padding;
  }

  // 垂直边界检查
  if (y + maxHeight + padding > viewportHeight) {
    // 显示在选择区域上方
    y = position.y - maxHeight - 8;
  }
  if (y < padding) {
    y = padding;
  }

  return { x, y };
}

/**
 * 关闭按钮图标
 */
function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

/**
 * 保存图标
 */
function SaveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 5v14h14V7.586L16.414 5H5zm12 12H7v-4h10v4zm0-6H7V7h10v4z" />
    </svg>
  );
}

/**
 * AnalysisPopup 组件
 * 显示 AI 分析结果
 */
export function AnalysisPopup({
  position,
  result,
  selectedText,
  onSave,
  onClose,
  isTranslateMode: isTranslateModeProp,
}: AnalysisPopupProps) {
  const [opacity, setOpacity] = useState(0);
  const [isHoveringSave, setIsHoveringSave] = useState(false);
  const [isHoveringClose, setIsHoveringClose] = useState(false);

  // 确定是否为翻译模式：优先使用 prop，其次从 result.mode 推断
  const isTranslateMode = isTranslateModeProp ?? result.mode === 'translate';

  // 根据模式计算尺寸
  const popupWidth = isTranslateMode ? POPUP_WIDTH_TRANSLATE : POPUP_WIDTH_WORD;
  const maxHeight = isTranslateMode ? MAX_HEIGHT_TRANSLATE : MAX_HEIGHT_WORD;

  // 淡入动画
  useEffect(() => {
    requestAnimationFrame(() => {
      setOpacity(1);
    });
  }, []);

  const adjustedPosition = calculatePosition(position, isTranslateMode);

  // 截断显示的选中文本（翻译模式下可能很长）
  const displayText = isTranslateMode && selectedText.length > 50
    ? selectedText.substring(0, 50) + '...'
    : selectedText;

  return (
    <div
      style={{
        ...styles.container,
        width: `${popupWidth}px`,
        maxHeight: `${maxHeight}px`,
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
        opacity,
        transition: 'opacity 0.2s ease-out',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div style={{
            ...styles.word,
            // 翻译模式使用较小字体
            fontSize: isTranslateMode ? tokens.fontSize.sm : tokens.fontSize.md,
          }}>
            {displayText}
          </div>
          {!isTranslateMode && result.pronunciation && (
            <div style={styles.pronunciation}>{result.pronunciation}</div>
          )}
        </div>
        <button
          style={{
            ...styles.closeButton,
            backgroundColor: isHoveringClose ? tokens.colors.border : 'transparent',
          }}
          onClick={onClose}
          onMouseEnter={() => setIsHoveringClose(true)}
          onMouseLeave={() => setIsHoveringClose(false)}
          title="关闭"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Body */}
      <div style={{
        ...styles.body,
        maxHeight: `${maxHeight - 140}px`,
      }}>
        {/* 词性 - 仅在单词模式显示 */}
        {!isTranslateMode && result.partOfSpeech && (
          <span style={styles.partOfSpeech}>{result.partOfSpeech}</span>
        )}

        {/* 含义/翻译 */}
        <div style={isTranslateMode || !result.usage ? styles.sectionLast : styles.section}>
          <div style={styles.label}>{isTranslateMode ? '翻译' : '释义'}</div>
          <div style={styles.value}>{result.meaning}</div>
        </div>

        {/* 用法 - 仅在单词模式显示 */}
        {!isTranslateMode && result.usage && (
          <div style={styles.sectionLast}>
            <div style={styles.label}>用法</div>
            <div style={styles.value}>{result.usage}</div>
          </div>
        )}
      </div>

      {/* Footer - 仅在单词模式显示保存按钮 */}
      {!isTranslateMode && (
        <div style={styles.footer}>
          <button
            style={{
              ...styles.saveButton,
              backgroundColor: isHoveringSave ? tokens.colors.successHover : tokens.colors.success,
            }}
            onClick={onSave}
            onMouseEnter={() => setIsHoveringSave(true)}
            onMouseLeave={() => setIsHoveringSave(false)}
            title="保存到词汇库"
          >
            <SaveIcon />
            保存词汇
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * 错误弹窗属性
 */
interface AnalysisErrorProps {
  /** 弹窗位置 */
  position: { x: number; y: number };
  /** 错误信息 */
  message: string;
  /** 重试回调 */
  onRetry: () => void;
  /** 关闭回调 */
  onClose: () => void;
}

/**
 * 错误样式
 */
const errorStyles: Record<string, CSSProperties> = {
  container: {
    padding: tokens.spacing.lg,
    textAlign: 'center' as const,
  },
  icon: {
    width: '48px',
    height: '48px',
    margin: '0 auto 12px',
    color: '#EF4444',
  },
  message: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textSecondary,
    marginBottom: tokens.spacing.lg,
  },
  buttons: {
    display: 'flex',
    gap: tokens.spacing.sm,
    justifyContent: 'center',
  },
  button: {
    padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`,
    border: 'none',
    borderRadius: tokens.borderRadius.md,
    fontSize: tokens.fontSize.sm,
    fontWeight: 500,
    cursor: 'pointer',
  },
  closeBtn: {
    backgroundColor: tokens.colors.border,
    color: tokens.colors.text,
  },
  retryBtn: {
    backgroundColor: tokens.colors.primary,
    color: 'white',
  },
};

/**
 * 错误图标
 */
function ErrorIcon() {
  return (
    <svg style={errorStyles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  );
}

/**
 * AnalysisError 组件
 * 显示错误信息
 */
export function AnalysisError({
  position,
  message,
  onRetry,
  onClose,
}: AnalysisErrorProps) {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    requestAnimationFrame(() => {
      setOpacity(1);
    });
  }, []);

  const adjustedPosition = calculatePosition(position);

  return (
    <div
      style={{
        ...styles.container,
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
        opacity,
        transition: 'opacity 0.2s ease-out',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={errorStyles.container}>
        <ErrorIcon />
        <div style={errorStyles.message}>{message}</div>
        <div style={errorStyles.buttons}>
          <button
            style={{ ...errorStyles.button, ...errorStyles.closeBtn }}
            onClick={onClose}
          >
            关闭
          </button>
          <button
            style={{ ...errorStyles.button, ...errorStyles.retryBtn }}
            onClick={onRetry}
          >
            重试
          </button>
        </div>
      </div>
    </div>
  );
}
