/**
 * LingoRecall AI - Shadow App Root Component
 *
 * Root wrapper component for all UI elements rendered inside Shadow DOM.
 * Manages the display of floating button, loading indicator, and analysis popup.
 *
 * @module content/components/ShadowApp
 */

import React from 'react';
import { FloatingButton } from './FloatingButton';
import { AnalysisPopup, AnalysisError } from './AnalysisPopup';
import { LoadingPopup } from './LoadingPopup';
import { Toast, type ToastType } from './Toast';

/**
 * 分析模式类型
 */
export type AnalysisMode = 'word' | 'translate';

/**
 * Analysis result from AI
 * Will be populated by Story 1.6
 */
export interface AnalysisResult {
  /** Word meaning/definition or translation */
  meaning: string;
  /** Pronunciation guide (empty in translate mode) */
  pronunciation: string;
  /** Part of speech (empty in translate mode) */
  partOfSpeech: string;
  /** Usage example (empty in translate mode) */
  usage: string;
  /** Additional context */
  context?: string;
  /** Analysis mode */
  mode?: AnalysisMode;
}

/**
 * Toast 通知状态
 */
export interface ToastState {
  /** 消息内容 */
  message: string;
  /** Toast 类型 */
  type: ToastType;
  /** 唯一标识符 */
  id: number;
}

/**
 * UI state managed by the shadow module
 */
export interface UIState {
  /** Position of the floating button */
  buttonPosition: { x: number; y: number } | null;
  /** Whether analysis is in progress */
  isAnalyzing: boolean;
  /** Analysis result from AI */
  analysisResult: AnalysisResult | null;
  /** Analysis error message */
  analysisError: string | null;
  /** Currently selected text */
  selectedText: string;
  /** Whether UI is fading out */
  isClosing: boolean;
  /** Toast 通知状态 */
  toast: ToastState | null;
}

/**
 * Callbacks for UI interactions
 */
export interface UICallbacks {
  /** Called when user clicks analyze button */
  onAnalyze?: () => void;
  /** Called when user clicks save button */
  onSave?: () => void;
  /** Called when user closes the popup */
  onClose?: () => void;
  /** Called when user cancels analysis */
  onCancel?: () => void;
  /** Called when toast should be dismissed */
  onToastClose?: () => void;
}

interface ShadowAppProps {
  /** Current UI state */
  state: UIState;
  /** UI interaction callbacks */
  callbacks?: UICallbacks;
}

/**
 * Shadow DOM root application component
 * Renders appropriate UI based on current state
 */
export function ShadowApp({ state, callbacks = {} }: ShadowAppProps): React.ReactElement | null {
  const {
    buttonPosition,
    isAnalyzing,
    analysisResult,
    analysisError,
    selectedText,
    isClosing,
    toast,
  } = state;
  const { onAnalyze, onSave, onClose, onCancel, onToastClose } = callbacks;

  // Default handlers for development/debugging
  const handleAnalyze = () => {
    if (onAnalyze) {
      onAnalyze();
    } else {
      console.log('[LingoRecall] Analyze clicked for:', selectedText);
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave();
    } else {
      console.log('[LingoRecall] Save clicked for:', selectedText);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      console.log('[LingoRecall] Close popup');
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else if (onClose) {
      // 默认使用 onClose 作为取消行为
      onClose();
    } else {
      console.log('[LingoRecall] Cancel analysis');
    }
  };

  const handleToastClose = () => {
    if (onToastClose) {
      onToastClose();
    } else {
      console.log('[LingoRecall] Toast dismissed');
    }
  };

  // Render Toast independently (always visible when present)
  const toastElement = toast ? (
    <Toast
      message={toast.message}
      type={toast.type}
      onClose={handleToastClose}
    />
  ) : null;

  // No position means only show toast if present
  if (!buttonPosition) {
    return toastElement;
  }

  // Error state - show friendly message (Story 1.6)
  if (analysisError) {
    return (
      <>
        <AnalysisError
          position={buttonPosition}
          message={analysisError}
          onRetry={handleAnalyze}
          onClose={handleClose}
        />
        {toastElement}
      </>
    );
  }

  // Loading state - show loading popup with animation (Story 1.6)
  if (isAnalyzing && !analysisResult) {
    // 判断是否为翻译模式（文本长度 >= 100）
    const isTranslateMode = selectedText.length >= 100;

    return (
      <>
        <LoadingPopup
          position={buttonPosition}
          selectedText={selectedText}
          onCancel={handleCancel}
          isTranslateMode={isTranslateMode}
        />
        {toastElement}
      </>
    );
  }

  // Analysis result available - show popup (Story 1.6)
  if (analysisResult) {
    return (
      <>
        <AnalysisPopup
          position={buttonPosition}
          result={analysisResult}
          selectedText={selectedText}
          onSave={handleSave}
          onClose={handleClose}
        />
        {toastElement}
      </>
    );
  }

  // Default state - show floating button (and toast if present)
  return (
    <>
      <FloatingButton
        position={buttonPosition}
        onAnalyze={handleAnalyze}
        onSave={handleSave}
        isLoading={isAnalyzing}
        showSaveButton={false}
        isClosing={isClosing}
      />
      {toastElement}
    </>
  );
}

export default ShadowApp;
