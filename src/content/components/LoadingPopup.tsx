/**
 * LingoRecall AI - Loading Popup Component
 * 分析加载中弹窗，提供友好的等待体验
 *
 * 功能：
 * - 动态加载动画
 * - 显示选中的文本预览
 * - 取消按钮
 * - 随机提示语
 *
 * @module content/components/LoadingPopup
 */

import React, { useEffect, useState, useMemo, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { DraggablePopup } from './DraggablePopup';

interface LoadingPopupProps {
  /** 弹窗位置 */
  position: { x: number; y: number };
  /** 选中的文本 */
  selectedText: string;
  /** 取消回调 */
  onCancel: () => void;
  /** 是否为翻译模式 */
  isTranslateMode?: boolean;
}

/** 弹窗宽度 */
const POPUP_WIDTH = 280;
/** 弹窗高度（估计值，用于位置计算） */
const POPUP_HEIGHT = 160;
/** 浮动按钮尺寸 */
const BUTTON_SIZE = 32;
/** 弹窗与按钮之间的间距 */
const POPUP_BUTTON_GAP = 8;

/** 设计令牌 */
const tokens = {
  colors: {
    primary: '#3B82F6',
    primaryLight: '#DBEAFE',
    background: '#FFFFFF',
    backgroundSecondary: '#F9FAFB',
    text: '#111827',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
  },
  borderRadius: {
    md: '6px',
    lg: '8px',
  },
  fontSize: {
    xs: '12px',
    sm: '14px',
  },
  shadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
};

/** 加载提示语翻译键 */
const LOADING_TIP_KEYS = [
  'analysis.loading.word.tip1',
  'analysis.loading.word.tip2',
  'analysis.loading.word.tip3',
  'analysis.loading.word.tip4',
];

/** 翻译提示语翻译键 */
const TRANSLATE_TIP_KEYS = [
  'analysis.loading.translate.tip1',
  'analysis.loading.translate.tip2',
  'analysis.loading.translate.tip3',
  'analysis.loading.translate.tip4',
];

/**
 * 计算弹窗位置，使其出现在按钮附近
 *
 * 位置策略：
 * 1. 优先在按钮下方显示（按钮底部 + 间距）
 * 2. 如果下方空间不足，则在按钮上方显示
 * 3. 水平方向：弹窗左边缘与按钮左边缘对齐，但确保不超出视口
 *
 * @param buttonPosition - 浮动按钮的位置（左上角坐标）
 */
function calculatePosition(buttonPosition: { x: number; y: number }): { x: number; y: number } {
  const padding = 16;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // 计算按钮的位置信息
  const buttonBottom = buttonPosition.y + BUTTON_SIZE;
  const buttonTop = buttonPosition.y;

  // 水平位置：弹窗左边缘与按钮左边缘对齐
  let x = buttonPosition.x;

  // 水平边界检查 - 确保弹窗不超出右边界
  if (x + POPUP_WIDTH + padding > viewportWidth) {
    x = viewportWidth - POPUP_WIDTH - padding;
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

  if (spaceBelow < POPUP_HEIGHT && spaceAbove > spaceBelow) {
    // 下方空间不足且上方空间更多，在按钮上方显示
    y = buttonTop - POPUP_HEIGHT - POPUP_BUTTON_GAP;
    // 确保不超出顶部
    if (y < padding) {
      y = padding;
    }
  }

  return { x, y };
}

/** 样式定义 */
const styles: Record<string, CSSProperties> = {
  /** 内容容器样式（不包含定位，由 DraggablePopup 处理） */
  innerContainer: {
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.borderRadius.lg,
    boxShadow: tokens.shadow,
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    height: '100%',
  },
  content: {
    padding: tokens.spacing.lg,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacing.md,
    height: '100%',
    boxSizing: 'border-box',
  },
  spinnerContainer: {
    position: 'relative',
    width: '48px',
    height: '48px',
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: `3px solid ${tokens.colors.primaryLight}`,
    borderTopColor: tokens.colors.primary,
    borderRadius: '50%',
    animation: 'lingorecall-spin 0.8s linear infinite',
  },
  pulseRing: {
    position: 'absolute',
    top: '-4px',
    left: '-4px',
    width: '56px',
    height: '56px',
    border: `2px solid ${tokens.colors.primary}`,
    borderRadius: '50%',
    opacity: 0.3,
    animation: 'lingorecall-pulse 1.5s ease-out infinite',
  },
  textPreview: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.text,
    fontWeight: 500,
    textAlign: 'center' as const,
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  tip: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.textSecondary,
    textAlign: 'center' as const,
    minHeight: '16px',
  },
  cancelButton: {
    padding: `${tokens.spacing.xs} ${tokens.spacing.md}`,
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.textSecondary,
    backgroundColor: 'transparent',
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: tokens.borderRadius.md,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
};

/**
 * LoadingPopup 组件
 * 显示加载中状态
 * 支持拖动移动（LoadingPopup 不支持缩放，因为内容固定）
 */
export function LoadingPopup({
  position,
  selectedText,
  onCancel,
  isTranslateMode = false,
}: LoadingPopupProps): React.ReactElement {
  const { t } = useTranslation();
  const [opacity, setOpacity] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [dots, setDots] = useState('');
  const [isHoveringCancel, setIsHoveringCancel] = useState(false);

  const tipKeys = isTranslateMode ? TRANSLATE_TIP_KEYS : LOADING_TIP_KEYS;
  const tips = useMemo(() => tipKeys.map(key => t(key)), [t, tipKeys]);

  // 淡入动画
  useEffect(() => {
    requestAnimationFrame(() => {
      setOpacity(1);
    });
  }, []);

  // 动态省略号动画
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  // 提示语轮播
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [tips.length]);

  // 截断显示的文本
  const displayText = selectedText.length > 30
    ? selectedText.substring(0, 30) + '...'
    : selectedText;

  return (
    <DraggablePopup
      initialPosition={position}
      defaultWidth={POPUP_WIDTH}
      defaultMaxHeight={POPUP_HEIGHT}
      resizable={false}
      opacity={opacity}
      onClickCapture={(e) => e.stopPropagation()}
    >
      <div style={styles.innerContainer}>
        <div style={styles.content}>
          {/* 加载动画 */}
          <div style={styles.spinnerContainer}>
            <div style={styles.pulseRing} />
            <div style={styles.spinner} />
          </div>

          {/* 选中文本预览 */}
          <div style={styles.textPreview}>
            "{displayText}"
          </div>

          {/* 动态提示语 */}
          <div style={styles.tip}>
            {tips[tipIndex]}{dots}
          </div>

          {/* 取消按钮 */}
          <button
            style={{
              ...styles.cancelButton,
              backgroundColor: isHoveringCancel ? tokens.colors.backgroundSecondary : 'transparent',
              borderColor: isHoveringCancel ? tokens.colors.textSecondary : tokens.colors.border,
            }}
            onClick={onCancel}
            onMouseEnter={() => setIsHoveringCancel(true)}
            onMouseLeave={() => setIsHoveringCancel(false)}
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </DraggablePopup>
  );
}

export default LoadingPopup;
