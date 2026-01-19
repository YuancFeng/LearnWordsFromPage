/**
 * LingoRecall AI - Draggable Popup Container
 *
 * 可拖动、可缩放的弹窗容器组件
 * - 边缘拖动移动位置
 * - 角落拖动调整大小
 * - 记住用户偏好设置
 *
 * @module content/components/DraggablePopup
 */

import React, { useState, useRef, useCallback, useEffect, type CSSProperties, type ReactNode } from 'react';
import {
  getPopupPreferencesSync,
  savePopupPreferences,
  type PopupPreferences,
} from '../popupPreferences';

/** 拖动手柄的宽度（边缘拖动区域） */
const DRAG_HANDLE_WIDTH = 8;

/** 缩放手柄的大小（角落区域） */
const RESIZE_HANDLE_SIZE = 12;

/** 最小弹窗尺寸 */
const MIN_WIDTH = 280;
const MIN_HEIGHT = 150;

/** 最大弹窗尺寸 */
const MAX_WIDTH = 600;
const MAX_HEIGHT = 800;

/** 边缘安全距离 */
const EDGE_PADDING = 16;

interface DraggablePopupProps {
  /** 初始位置（按钮位置） */
  initialPosition: { x: number; y: number };
  /** 默认宽度 */
  defaultWidth?: number;
  /** 默认最大高度 */
  defaultMaxHeight?: number;
  /** 是否允许调整大小 */
  resizable?: boolean;
  /** 子内容 */
  children: ReactNode;
  /** 额外的容器样式 */
  style?: CSSProperties;
  /** 点击阻止冒泡 */
  onClickCapture?: (e: React.MouseEvent) => void;
  /** 淡入动画透明度 */
  opacity?: number;
}

/** 拖动状态类型 */
type DragType = 'move' | 'resize-se' | 'resize-sw' | 'resize-ne' | 'resize-nw' | null;

/**
 * 计算初始弹窗位置
 * 如果用户有自定义偏好，使用偏好位置
 * 否则使用基于按钮位置的智能定位
 *
 * 定位策略优先级：
 * 1. 优先在按钮下方显示（最自然的交互体验）
 * 2. 如果下方空间不足，在按钮上方显示
 * 3. 如果上下都不够，在空间较大的一侧显示，并限制弹窗高度以适应可用空间
 */
function calculateInitialPosition(
  buttonPosition: { x: number; y: number },
  width: number,
  maxHeight: number,
  preferences: PopupPreferences
): { x: number; y: number } {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // 如果用户自定义过位置，使用相对位置计算
  if (preferences.customized && preferences.relativeX !== undefined && preferences.relativeY !== undefined) {
    let x = preferences.relativeX * viewportWidth;
    let y = preferences.relativeY * viewportHeight;

    // 确保不超出视口
    x = Math.max(EDGE_PADDING, Math.min(viewportWidth - width - EDGE_PADDING, x));
    y = Math.max(EDGE_PADDING, Math.min(viewportHeight - maxHeight - EDGE_PADDING, y));

    return { x, y };
  }

  // 默认智能定位：基于按钮位置
  const buttonSize = 32;
  const gap = 8;

  // buttonPosition 是按钮的左上角坐标
  const buttonTop = buttonPosition.y;
  const buttonBottom = buttonPosition.y + buttonSize;

  // 水平位置：弹窗左边缘与按钮左边缘对齐
  let x = buttonPosition.x;

  // 水平边界检查 - 确保弹窗不超出右边界
  if (x + width + EDGE_PADDING > viewportWidth) {
    x = viewportWidth - width - EDGE_PADDING;
  }
  // 确保弹窗不超出左边界
  if (x < EDGE_PADDING) {
    x = EDGE_PADDING;
  }

  // 计算可用空间
  const spaceBelow = viewportHeight - buttonBottom - EDGE_PADDING;
  const spaceAbove = buttonTop - EDGE_PADDING;

  // 使用较小的预估高度来决定位置（实际内容可能不需要 maxHeight 那么高）
  // 翻译模式的弹窗通常内容较短，使用更合理的估计
  const estimatedHeight = Math.min(maxHeight, 300);

  let y: number;

  // 策略1：优先在按钮下方显示
  if (spaceBelow >= estimatedHeight) {
    // 下方空间足够，在按钮下方显示
    y = buttonBottom + gap;
  }
  // 策略2：下方不够，检查上方
  else if (spaceAbove >= estimatedHeight) {
    // 上方空间足够，在按钮上方显示
    // 计算位置：从按钮顶部往上偏移 gap + 预估高度
    // 但实际弹窗高度由内容决定，这里使用预估高度定位
    y = buttonTop - estimatedHeight - gap;
    // 确保不超出顶部
    if (y < EDGE_PADDING) {
      y = EDGE_PADDING;
    }
  }
  // 策略3：上下都不够理想，选择空间更大的一侧
  else {
    if (spaceBelow >= spaceAbove) {
      // 下方空间更大或相等，在按钮下方显示
      y = buttonBottom + gap;
    } else {
      // 上方空间更大，在按钮上方显示
      // 使用实际可用空间作为定位参考
      const availableHeight = Math.min(spaceAbove, maxHeight);
      y = buttonTop - availableHeight - gap;
      if (y < EDGE_PADDING) {
        y = EDGE_PADDING;
      }
    }
  }

  return { x, y };
}

/**
 * DraggablePopup 组件
 * 可拖动、可缩放的弹窗容器
 */
export function DraggablePopup({
  initialPosition,
  defaultWidth = 320,
  defaultMaxHeight = 400,
  resizable = true,
  children,
  style,
  onClickCapture,
  opacity = 1,
}: DraggablePopupProps): React.ReactElement {
  // 获取用户偏好
  const preferences = getPopupPreferencesSync();

  // 弹窗尺寸
  const [width, setWidth] = useState(
    preferences.customized && preferences.width ? preferences.width : defaultWidth
  );
  const [height, setHeight] = useState<number | undefined>(
    preferences.customized && preferences.height ? preferences.height : undefined
  );

  // 弹窗位置
  const [position, setPosition] = useState(() =>
    calculateInitialPosition(initialPosition, width, defaultMaxHeight, preferences)
  );

  // 拖动状态
  const [dragType, setDragType] = useState<DragType>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [dragStartSize, setDragStartSize] = useState({ width: 0, height: 0 });

  // 悬停状态
  const [hoverEdge, setHoverEdge] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // 保存偏好（防抖）
  const savePreferencesTimeout = useRef<number | null>(null);
  const savePreferencesDebounced = useCallback((newPosition: { x: number; y: number }, newWidth: number, newHeight?: number) => {
    if (savePreferencesTimeout.current) {
      window.clearTimeout(savePreferencesTimeout.current);
    }
    savePreferencesTimeout.current = window.setTimeout(() => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      savePopupPreferences({
        width: newWidth,
        height: newHeight,
        relativeX: newPosition.x / viewportWidth,
        relativeY: newPosition.y / viewportHeight,
      });
    }, 500);
  }, []);

  // 鼠标按下处理
  const handleMouseDown = useCallback((e: React.MouseEvent, type: DragType) => {
    if (type) {
      e.preventDefault();
      e.stopPropagation();
      setDragType(type);
      setDragStart({ x: e.clientX, y: e.clientY });
      setDragStartPos({ ...position });
      setDragStartSize({ width, height: height || defaultMaxHeight });
    }
  }, [position, width, height, defaultMaxHeight]);

  // 鼠标移动处理
  useEffect(() => {
    if (!dragType) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (dragType === 'move') {
        // 移动弹窗
        let newX = dragStartPos.x + deltaX;
        let newY = dragStartPos.y + deltaY;

        // 边界限制
        newX = Math.max(EDGE_PADDING, Math.min(viewportWidth - width - EDGE_PADDING, newX));
        newY = Math.max(EDGE_PADDING, Math.min(viewportHeight - (height || defaultMaxHeight) - EDGE_PADDING, newY));

        setPosition({ x: newX, y: newY });
      } else if (dragType.startsWith('resize-')) {
        // 缩放弹窗
        let newWidth = dragStartSize.width;
        let newHeight = dragStartSize.height;
        let newX = dragStartPos.x;
        let newY = dragStartPos.y;

        if (dragType.includes('e')) {
          // 右边
          newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, dragStartSize.width + deltaX));
        }
        if (dragType.includes('w')) {
          // 左边
          const widthDelta = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, dragStartSize.width - deltaX)) - dragStartSize.width;
          newWidth = dragStartSize.width + widthDelta;
          newX = dragStartPos.x - widthDelta;
        }
        if (dragType.includes('s')) {
          // 下边
          newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, dragStartSize.height + deltaY));
        }
        if (dragType.includes('n')) {
          // 上边
          const heightDelta = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, dragStartSize.height - deltaY)) - dragStartSize.height;
          newHeight = dragStartSize.height + heightDelta;
          newY = dragStartPos.y - heightDelta;
        }

        // 边界限制
        newX = Math.max(EDGE_PADDING, newX);
        newY = Math.max(EDGE_PADDING, newY);
        if (newX + newWidth > viewportWidth - EDGE_PADDING) {
          newWidth = viewportWidth - EDGE_PADDING - newX;
        }
        if (newY + newHeight > viewportHeight - EDGE_PADDING) {
          newHeight = viewportHeight - EDGE_PADDING - newY;
        }

        setWidth(newWidth);
        setHeight(newHeight);
        setPosition({ x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      if (dragType) {
        // 保存偏好
        savePreferencesDebounced(position, width, height);
      }
      setDragType(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragType, dragStart, dragStartPos, dragStartSize, width, height, defaultMaxHeight, position, savePreferencesDebounced]);

  // 检测鼠标位置以显示适当的光标
  const getEdgeFromPosition = useCallback((e: React.MouseEvent): string | null => {
    if (!containerRef.current) return null;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const isLeft = x < DRAG_HANDLE_WIDTH;
    const isRight = x > rect.width - DRAG_HANDLE_WIDTH;
    const isTop = y < DRAG_HANDLE_WIDTH;
    const isBottom = y > rect.height - DRAG_HANDLE_WIDTH;

    // 角落（缩放）
    if (resizable) {
      if (isTop && isLeft) return 'nw';
      if (isTop && isRight) return 'ne';
      if (isBottom && isLeft) return 'sw';
      if (isBottom && isRight) return 'se';
    }

    // 边缘（移动）
    if (isLeft || isRight || isTop || isBottom) return 'move';

    return null;
  }, [resizable]);

  // 鼠标移动时更新光标
  const handleContainerMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragType) return;
    const edge = getEdgeFromPosition(e);
    setHoverEdge(edge);
  }, [dragType, getEdgeFromPosition]);

  // 鼠标离开时重置光标
  const handleContainerMouseLeave = useCallback(() => {
    if (!dragType) {
      setHoverEdge(null);
    }
  }, [dragType]);

  // 点击边缘/角落开始拖动
  const handleContainerMouseDown = useCallback((e: React.MouseEvent) => {
    const edge = getEdgeFromPosition(e);
    if (!edge) return;

    if (edge === 'move') {
      handleMouseDown(e, 'move');
    } else if (resizable) {
      handleMouseDown(e, `resize-${edge}` as DragType);
    }
  }, [getEdgeFromPosition, handleMouseDown, resizable]);

  // 获取光标样式
  const getCursorStyle = (): string => {
    if (dragType) {
      if (dragType === 'move') return 'grabbing';
      if (dragType === 'resize-se' || dragType === 'resize-nw') return 'nwse-resize';
      if (dragType === 'resize-sw' || dragType === 'resize-ne') return 'nesw-resize';
    }
    if (hoverEdge) {
      if (hoverEdge === 'move') return 'grab';
      if (hoverEdge === 'se' || hoverEdge === 'nw') return 'nwse-resize';
      if (hoverEdge === 'sw' || hoverEdge === 'ne') return 'nesw-resize';
    }
    return 'default';
  };

  // 容器样式
  const containerStyle: CSSProperties = {
    position: 'fixed',
    left: `${position.x}px`,
    top: `${position.y}px`,
    width: `${width}px`,
    maxHeight: height ? `${height}px` : `${defaultMaxHeight}px`,
    zIndex: 2147483647,
    cursor: getCursorStyle(),
    opacity,
    transition: dragType ? 'none' : 'opacity 0.2s ease-out',
    ...style,
  };

  // 缩放手柄样式
  const resizeHandleBaseStyle: CSSProperties = {
    position: 'absolute',
    width: `${RESIZE_HANDLE_SIZE}px`,
    height: `${RESIZE_HANDLE_SIZE}px`,
    zIndex: 1,
  };

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      onClick={onClickCapture}
      onMouseMove={handleContainerMouseMove}
      onMouseLeave={handleContainerMouseLeave}
      onMouseDown={handleContainerMouseDown}
    >
      {children}

      {/* 可视化的拖动提示（边缘高亮） */}
      {hoverEdge === 'move' && !dragType && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            border: '2px solid rgba(59, 130, 246, 0.3)',
            borderRadius: 'inherit',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* 角落缩放手柄视觉指示 */}
      {resizable && (hoverEdge === 'se' || dragType === 'resize-se') && (
        <div
          style={{
            ...resizeHandleBaseStyle,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, transparent 50%, rgba(59, 130, 246, 0.5) 50%)',
            borderRadius: '0 0 8px 0',
          }}
        />
      )}
      {resizable && (hoverEdge === 'sw' || dragType === 'resize-sw') && (
        <div
          style={{
            ...resizeHandleBaseStyle,
            left: 0,
            bottom: 0,
            background: 'linear-gradient(225deg, transparent 50%, rgba(59, 130, 246, 0.5) 50%)',
            borderRadius: '0 0 0 8px',
          }}
        />
      )}
      {resizable && (hoverEdge === 'ne' || dragType === 'resize-ne') && (
        <div
          style={{
            ...resizeHandleBaseStyle,
            right: 0,
            top: 0,
            background: 'linear-gradient(45deg, transparent 50%, rgba(59, 130, 246, 0.5) 50%)',
            borderRadius: '0 8px 0 0',
          }}
        />
      )}
      {resizable && (hoverEdge === 'nw' || dragType === 'resize-nw') && (
        <div
          style={{
            ...resizeHandleBaseStyle,
            left: 0,
            top: 0,
            background: 'linear-gradient(315deg, transparent 50%, rgba(59, 130, 246, 0.5) 50%)',
            borderRadius: '8px 0 0 0',
          }}
        />
      )}
    </div>
  );
}

export default DraggablePopup;
