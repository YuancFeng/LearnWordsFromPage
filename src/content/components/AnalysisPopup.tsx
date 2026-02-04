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
import { DraggablePopup } from './DraggablePopup';

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
/** 浮动按钮尺寸 */
const BUTTON_SIZE = 32;
/** 弹窗与按钮之间的间距 */
const POPUP_BUTTON_GAP = 8;

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
 * 注意：width 和 maxHeight 由 DraggablePopup 控制
 */
const styles: Record<string, CSSProperties> = {
  /** 内容容器样式（不包含定位，由 DraggablePopup 处理） */
  innerContainer: {
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.borderRadius.lg,
    boxShadow: tokens.shadow,
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  /** 旧的 container 样式（为 AnalysisError 保留，它不使用 DraggablePopup） */
  container: {
    position: 'fixed',
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
    flex: 1,
    minHeight: 0, // 允许 flex 子元素收缩
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
 * 计算弹窗位置，使其出现在按钮附近
 *
 * 位置策略：
 * 1. 优先在按钮下方显示（按钮底部 + 间距）
 * 2. 如果下方空间不足，则在按钮上方显示
 * 3. 水平方向：弹窗左边缘与按钮左边缘对齐，但确保不超出视口
 *
 * @param buttonPosition - 浮动按钮的位置（左上角坐标）
 * @param isTranslateMode - 是否为翻译模式
 */
function calculatePosition(
  buttonPosition: { x: number; y: number },
  isTranslateMode: boolean = false
): { x: number; y: number } {
  const padding = 16;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const popupWidth = isTranslateMode ? POPUP_WIDTH_TRANSLATE : POPUP_WIDTH_WORD;
  const maxHeight = isTranslateMode ? MAX_HEIGHT_TRANSLATE : MAX_HEIGHT_WORD;

  // 计算按钮的位置信息
  const buttonBottom = buttonPosition.y + BUTTON_SIZE;
  const buttonTop = buttonPosition.y;

  // 水平位置：弹窗左边缘与按钮左边缘对齐
  let x = buttonPosition.x;

  // 水平边界检查 - 确保弹窗不超出右边界
  if (x + popupWidth + padding > viewportWidth) {
    x = viewportWidth - popupWidth - padding;
  }
  // 确保弹窗不超出左边界
  if (x < padding) {
    x = padding;
  }

  // 垂直位置：优先在按钮下方显示
  let y = buttonBottom + POPUP_BUTTON_GAP;

  // 检查下方空间是否足够
  const spaceBelow = viewportHeight - buttonBottom - padding;
  const spaceAbove = buttonTop - padding;

  if (spaceBelow < maxHeight && spaceAbove > spaceBelow) {
    // 下方空间不足且上方空间更多，在按钮上方显示
    y = buttonTop - maxHeight - POPUP_BUTTON_GAP;
    // 确保不超出顶部
    if (y < padding) {
      y = padding;
    }
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
 * 支持拖动移动和调整大小
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
  const [isSaving, setIsSaving] = useState(false);

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

  // 截断显示的选中文本（翻译模式下可能很长）
  const displayText = isTranslateMode && selectedText.length > 50
    ? selectedText.substring(0, 50) + '...'
    : selectedText;

  /**
   * 处理保存，防止重复点击
   */
  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onSave();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DraggablePopup
      initialPosition={position}
      defaultWidth={popupWidth}
      defaultMaxHeight={maxHeight}
      resizable={true}
      opacity={opacity}
      onClickCapture={(e) => e.stopPropagation()}
    >
      <div style={styles.innerContainer}>
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
        <div style={styles.body}>
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
                backgroundColor: isSaving
                  ? tokens.colors.textSecondary
                  : isHoveringSave
                    ? tokens.colors.successHover
                    : tokens.colors.success,
                opacity: isSaving ? 0.7 : 1,
                cursor: isSaving ? 'not-allowed' : 'pointer',
              }}
              onClick={handleSave}
              onMouseEnter={() => !isSaving && setIsHoveringSave(true)}
              onMouseLeave={() => setIsHoveringSave(false)}
              disabled={isSaving}
              title={isSaving ? t('common.saving') : t('analysis.saveWord')}
            >
              {isSaving ? (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ animation: 'spin 1s linear infinite' }}
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                <SaveIcon />
              )}
              {isSaving ? t('common.saving') : t('analysis.saveWord')}
            </button>
          </div>
        )}
      </div>
    </DraggablePopup>
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

/** 错误弹窗的估计高度 */
const ERROR_POPUP_HEIGHT = 220;

/**
 * AnalysisError 组件
 * 显示友好的错误信息
 * 支持拖动移动（错误弹窗不支持缩放，因为内容固定）
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

  return (
    <DraggablePopup
      initialPosition={position}
      defaultWidth={POPUP_WIDTH_WORD}
      defaultMaxHeight={ERROR_POPUP_HEIGHT}
      resizable={false}
      opacity={opacity}
      onClickCapture={(e) => e.stopPropagation()}
    >
      <div style={styles.innerContainer}>
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
    </DraggablePopup>
  );
}
