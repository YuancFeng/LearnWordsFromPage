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
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
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
          title={t('common.close')}
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
          <div style={styles.label}>{isTranslateMode ? t('analysis.translation') : t('analysis.meaning')}</div>
          <div style={styles.value}>{result.meaning}</div>
        </div>

        {/* 用法 - 仅在单词模式显示 */}
        {!isTranslateMode && result.usage && (
          <div style={styles.sectionLast}>
            <div style={styles.label}>{t('analysis.usage')}</div>
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
            title={t('analysis.saveWord')}
          >
            <SaveIcon />
            {t('analysis.saveWord')}
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

/** 错误类型配置 */
interface ErrorConfig {
  icon: 'network' | 'api' | 'timeout' | 'config' | 'generic';
  titleKey: string;
  color: string;
  suggestionKey: string;
}

/**
 * 根据错误信息获取错误类型配置
 * 返回翻译键而不是直接文本，由组件使用 t() 翻译
 */
function getErrorConfig(message: string): ErrorConfig {
  const lowerMsg = message.toLowerCase();

  if (lowerMsg.includes('网络') || lowerMsg.includes('network') || lowerMsg.includes('连接')) {
    return {
      icon: 'network',
      titleKey: 'analysis.errors.network',
      color: '#F59E0B',
      suggestionKey: 'analysis.errors.networkHint',
    };
  }

  if (lowerMsg.includes('超时') || lowerMsg.includes('timeout')) {
    return {
      icon: 'timeout',
      titleKey: 'analysis.errors.timeout',
      color: '#F59E0B',
      suggestionKey: 'analysis.errors.timeoutHint',
    };
  }

  if (lowerMsg.includes('api') || lowerMsg.includes('key') || lowerMsg.includes('密钥') || lowerMsg.includes('无效')) {
    return {
      icon: 'api',
      titleKey: 'analysis.errors.apiKey',
      color: '#EF4444',
      suggestionKey: 'analysis.errors.apiKeyHint',
    };
  }

  if (lowerMsg.includes('配置') || lowerMsg.includes('config') || lowerMsg.includes('端点')) {
    return {
      icon: 'config',
      titleKey: 'analysis.errors.config',
      color: '#EF4444',
      suggestionKey: 'analysis.errors.configHint',
    };
  }

  if (lowerMsg.includes('刷新') || lowerMsg.includes('更新')) {
    return {
      icon: 'generic',
      titleKey: 'analysis.errors.refresh',
      color: '#3B82F6',
      suggestionKey: 'analysis.errors.refreshHint',
    };
  }

  return {
    icon: 'generic',
    titleKey: 'analysis.errors.generic',
    color: '#EF4444',
    suggestionKey: 'analysis.errors.genericHint',
  };
}

/**
 * 错误样式
 */
const errorStyles: Record<string, CSSProperties> = {
  container: {
    padding: tokens.spacing.lg,
    textAlign: 'center' as const,
  },
  iconContainer: {
    width: '56px',
    height: '56px',
    margin: '0 auto 12px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: tokens.fontSize.md,
    fontWeight: 600,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.xs,
  },
  suggestion: {
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
    transition: 'all 0.15s ease',
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
 * 错误图标组件
 */
function ErrorIcon({ type, color }: { type: string; color: string }) {
  const iconStyle: CSSProperties = {
    width: '28px',
    height: '28px',
    color: color,
  };

  switch (type) {
    case 'network':
      return (
        <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.58 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
        </svg>
      );
    case 'timeout':
      return (
        <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case 'api':
      return (
        <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          <circle cx="12" cy="16" r="1" />
        </svg>
      );
    case 'config':
      return (
        <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    default:
      return (
        <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      );
  }
}

/**
 * AnalysisError 组件
 * 显示友好的错误信息
 */
export function AnalysisError({
  position,
  message,
  onRetry,
  onClose,
}: AnalysisErrorProps) {
  const { t } = useTranslation();
  const [opacity, setOpacity] = useState(0);
  const [isHoveringRetry, setIsHoveringRetry] = useState(false);
  const [isHoveringClose, setIsHoveringClose] = useState(false);

  const errorConfig = getErrorConfig(message);

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
        width: `${POPUP_WIDTH_WORD}px`,
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
        opacity,
        transition: 'opacity 0.2s ease-out',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={errorStyles.container}>
        {/* 图标容器 */}
        <div
          style={{
            ...errorStyles.iconContainer,
            backgroundColor: `${errorConfig.color}15`,
          }}
        >
          <ErrorIcon type={errorConfig.icon} color={errorConfig.color} />
        </div>

        {/* 错误标题 */}
        <div style={errorStyles.title}>{t(errorConfig.titleKey)}</div>

        {/* 建议信息 */}
        <div style={errorStyles.suggestion}>{t(errorConfig.suggestionKey)}</div>

        {/* 操作按钮 */}
        <div style={errorStyles.buttons}>
          <button
            style={{
              ...errorStyles.button,
              ...errorStyles.closeBtn,
              backgroundColor: isHoveringClose ? '#D1D5DB' : tokens.colors.border,
            }}
            onClick={onClose}
            onMouseEnter={() => setIsHoveringClose(true)}
            onMouseLeave={() => setIsHoveringClose(false)}
          >
            {t('common.close')}
          </button>
          <button
            style={{
              ...errorStyles.button,
              ...errorStyles.retryBtn,
              backgroundColor: isHoveringRetry ? '#2563EB' : tokens.colors.primary,
            }}
            onClick={onRetry}
            onMouseEnter={() => setIsHoveringRetry(true)}
            onMouseLeave={() => setIsHoveringRetry(false)}
          >
            {t('common.retry')}
          </button>
        </div>
      </div>
    </div>
  );
}
