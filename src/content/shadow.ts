/**
 * LingoRecall AI - Shadow DOM Injection Module
 *
 * Manages Shadow DOM creation and lifecycle for UI components.
 * Provides complete style isolation from host page CSS.
 *
 * @module content/shadow
 */

import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import { ShadowApp, type UIState, type UICallbacks, type AnalysisResult, type ToastState, type PageTranslationState } from './components/ShadowApp';
import { SHADOW_STYLES } from './styles/reset';
import type { ToastType } from './components/Toast';

// ============================================
// Constants
// ============================================

/** Custom element tag name - must use lowercase with hyphen */
const CUSTOM_ELEMENT_NAME = 'lingorecall-root';

/** Mount point ID inside shadow root */
const MOUNT_POINT_ID = 'lingorecall-mount';
/** Fade out duration for UI dismissal */
const FADE_OUT_DURATION_MS = 300;

// ============================================
// Private State (Singleton Pattern)
// ============================================

/** Private reference to shadow root (closed mode prevents external access) */
let shadowRoot: ShadowRoot | null = null;

/** React root for rendering */
let reactRoot: Root | null = null;

/** Host element in the document */
let hostElement: HTMLElement | null = null;

/** Current UI state */
let currentState: UIState = {
  buttonPosition: null,
  isAnalyzing: false,
  analysisResult: null,
  analysisError: null,
  selectedText: '',
  isClosing: false,
  toast: null,
  pageTranslation: null,
};

/** Toast ID 计数器 */
let toastIdCounter = 0;

/** Pending hide timeout for fade-out */
let hideTimeoutId: number | null = null;

/** UI callbacks */
let currentCallbacks: UICallbacks = {};

// ============================================
// Re-export Types
// ============================================

export type { UIState, UICallbacks, AnalysisResult, ToastState, PageTranslationState };
export type { ToastType };

// ============================================
// Private Functions
// ============================================

/**
 * Creates the host element styles
 * The host element is positioned fixed but zero-sized
 * to not interfere with page layout
 */
function getHostStyles(): string {
  return `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 0 !important;
    height: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
    border: none !important;
    overflow: visible !important;
    z-index: 2147483647 !important;
    pointer-events: none !important;
    background: transparent !important;
  `;
}

/**
 * Creates and injects the Shadow DOM host element
 * Uses closed mode to prevent external JavaScript access
 */
function createShadowHost(): void {
  // Prevent duplicate creation
  if (hostElement) {
    console.warn('[LingoRecall] Shadow host already exists');
    return;
  }

  // Check for existing element (edge case: page manipulation)
  const existingElement = document.querySelector(CUSTOM_ELEMENT_NAME);
  if (existingElement) {
    console.warn('[LingoRecall] Removing existing shadow host');
    existingElement.remove();
  }

  // Create custom element
  hostElement = document.createElement(CUSTOM_ELEMENT_NAME);
  hostElement.style.cssText = getHostStyles();

  // Attach closed shadow DOM (prevents external access)
  shadowRoot = hostElement.attachShadow({ mode: 'closed' });

  // Inject reset and base styles
  const styleElement = document.createElement('style');
  styleElement.textContent = SHADOW_STYLES;
  shadowRoot.appendChild(styleElement);

  // Create React mount point
  const mountPoint = document.createElement('div');
  mountPoint.id = MOUNT_POINT_ID;
  mountPoint.style.cssText = 'pointer-events: auto;';
  shadowRoot.appendChild(mountPoint);

  // Initialize React root
  reactRoot = createRoot(mountPoint);

  // Add to document body
  document.body.appendChild(hostElement);

  console.log('[LingoRecall] Shadow DOM injected');
}

/**
 * Internal render function
 * Updates React tree with current state
 */
function renderUI(): void {
  if (!reactRoot) {
    console.warn('[LingoRecall] Cannot render: React root not initialized');
    return;
  }

  reactRoot.render(
    React.createElement(
      I18nextProvider,
      { i18n },
      React.createElement(ShadowApp, {
        state: currentState,
        callbacks: currentCallbacks,
      })
    )
  );
}

/**
 * Handles body replacement (common in SPA navigation)
 * Re-injects the shadow host if document.body changes
 */
function handleBodyReplacement(): void {
  if (hostElement && !document.body.contains(hostElement)) {
    console.log('[LingoRecall] Re-injecting shadow host after body change');
    document.body.appendChild(hostElement);
  }
}

/**
 * Clear pending hide timeout
 */
function clearHideTimeout(): void {
  if (hideTimeoutId !== null) {
    window.clearTimeout(hideTimeoutId);
    hideTimeoutId = null;
  }
}

// ============================================
// Public API
// ============================================

/**
 * Inject UI with initial state
 * Creates shadow host if not already present
 *
 * @param state - Initial UI state
 * @param callbacks - Optional UI callbacks
 */
export function injectUI(state: UIState, callbacks?: UICallbacks): void {
  // Create shadow host if needed
  if (!shadowRoot) {
    createShadowHost();
  }

  // Update state and callbacks
  currentState = { ...state };
  if (callbacks) {
    currentCallbacks = { ...callbacks };
  }

  // Render UI
  renderUI();
}

/**
 * Update UI with new state
 * Creates shadow host if not present
 *
 * @param state - Updated UI state
 */
export function updateUI(state: Partial<UIState>): void {
  // Merge with current state
  currentState = {
    ...currentState,
    ...state,
  };

  // Create shadow host if needed
  if (!reactRoot) {
    createShadowHost();
  }

  // Render with updated state
  renderUI();
}

/**
 * Update UI callbacks
 *
 * @param callbacks - New callbacks to set
 */
export function setCallbacks(callbacks: UICallbacks): void {
  currentCallbacks = { ...currentCallbacks, ...callbacks };
  // Only render if reactRoot exists - avoids "React root not initialized" warning
  // during initial setup when callbacks are set before first UI display
  if (reactRoot) {
    renderUI();
  }
}

/**
 * Remove UI completely
 * Cleans up React root and removes shadow host from DOM
 */
export function removeUI(): void {
  clearHideTimeout();
  // Unmount React
  if (reactRoot) {
    reactRoot.unmount();
    reactRoot = null;
  }

  // Remove host element from DOM
  if (hostElement && hostElement.parentNode) {
    hostElement.parentNode.removeChild(hostElement);
    hostElement = null;
  }

  // Clear shadow root reference
  shadowRoot = null;

  // Reset state
  currentState = {
    buttonPosition: null,
    isAnalyzing: false,
    analysisResult: null,
    analysisError: null,
    selectedText: '',
    isClosing: false,
    toast: null,
    pageTranslation: null,
  };

  console.log('[LingoRecall] Shadow DOM removed');
}

/**
 * Check if UI is currently mounted
 *
 * @returns True if shadow root exists
 */
export function isUIActive(): boolean {
  return shadowRoot !== null;
}

/**
 * Get current UI state
 *
 * @returns Copy of current UI state
 */
export function getUIState(): UIState {
  return { ...currentState };
}

/**
 * Show floating button at position
 * Convenience method for common use case
 *
 * @param position - Screen coordinates
 * @param selectedText - Currently selected text
 */
export function showButton(
  position: { x: number; y: number },
  selectedText: string
): void {
  clearHideTimeout();
  updateUI({
    buttonPosition: position,
    selectedText,
    isAnalyzing: false,
    analysisResult: null,
    analysisError: null,
    isClosing: false,
  });
}

/**
 * Update button/popup position without clearing state
 * Used for scroll/zoom position updates to prevent losing analysis results
 *
 * @param position - New screen coordinates
 */
export function updatePosition(position: { x: number; y: number }): void {
  if (!currentState.buttonPosition) {
    return; // No UI to update
  }
  // Only update position, preserve all other state (analysis result, loading state, etc.)
  updateUI({
    buttonPosition: position,
  });
}

/**
 * Show loading state
 * Keeps button position, shows loading state on button
 */
export function showLoading(): void {
  clearHideTimeout();
  updateUI({
    isAnalyzing: true,
    analysisResult: null,
    analysisError: null,
    isClosing: false,
  });
}

/**
 * Show analysis result
 *
 * @param result - Analysis result from AI
 */
export function showResult(result: AnalysisResult): void {
  clearHideTimeout();
  updateUI({
    isAnalyzing: false,
    analysisResult: result,
    analysisError: null,
    isClosing: false,
  });
}

/**
 * Show analysis error
 * Keeps current selection position for retry
 * 如果没有 buttonPosition，使用 Toast 显示错误
 */
export function showError(message: string): void {
  clearHideTimeout();

  // 如果没有 buttonPosition，使用 Toast 显示错误
  if (!currentState.buttonPosition) {
    console.warn('[LingoRecall] No button position for error popup, showing toast');
    updateUI({
      isAnalyzing: false,
      analysisResult: null,
      analysisError: null,
      isClosing: false,
      toast: {
        message,
        type: 'error',
        id: Date.now(),
      },
    });
    return;
  }

  updateUI({
    isAnalyzing: false,
    analysisResult: null,
    analysisError: message,
    isClosing: false,
  });
}

/**
 * Hide UI (clear button position)
 */
export function hideUI(): void {
  if (!currentState.buttonPosition || currentState.isClosing) {
    return;
  }

  clearHideTimeout();
  currentState = {
    ...currentState,
    isClosing: true,
    isAnalyzing: false,
    analysisResult: null,
    analysisError: null,
  };
  renderUI();

  hideTimeoutId = window.setTimeout(() => {
    currentState = {
      ...currentState,
      buttonPosition: null,
      selectedText: '',
      isClosing: false,
      isAnalyzing: false,
      analysisResult: null,
      analysisError: null,
      // Keep pageTranslation state
    };
    renderUI();
    hideTimeoutId = null;
  }, FADE_OUT_DURATION_MS);
}

/**
 * Show toast notification
 * Story 2.1 - AC1: 保存成功/失败 Toast 通知
 *
 * @param message - Toast 消息内容
 * @param type - Toast 类型
 */
export function showToast(message: string, type: ToastType = 'info'): void {
  toastIdCounter++;
  updateUI({
    toast: {
      message,
      type,
      id: toastIdCounter,
    },
  });
}

/**
 * Dismiss current toast
 */
export function dismissToast(): void {
  updateUI({
    toast: null,
  });
}

/**
 * Update page translation state
 * Used by the page translator module to show progress
 *
 * @param state - Page translation state
 */
export function updatePageTranslation(state: PageTranslationState | null): void {
  updateUI({
    pageTranslation: state,
  });
}

// ============================================
// Lifecycle Hooks
// ============================================

/**
 * Setup observer for body changes (SPA support)
 */
export function setupBodyObserver(): void {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        handleBodyReplacement();
      }
    }
  });

  // Observe document for body replacement
  observer.observe(document.documentElement, {
    childList: true,
    subtree: false,
  });
}

/**
 * Initialize shadow module
 * Call this once during content script initialization
 */
export function initShadowModule(): void {
  // Setup body replacement observer
  setupBodyObserver();

  console.log('[LingoRecall] Shadow module initialized');
}

// ============================================
// Debug Utilities (Development Only)
// ============================================

const isDev = (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV;
if (isDev) {
  // Expose debug utilities to window
  (window as Window & { __lingorecallShadow?: object }).__lingorecallShadow = {
    getState: getUIState,
    isActive: isUIActive,
    inject: injectUI,
    update: updateUI,
    remove: removeUI,
    showButton,
    showLoading,
    showResult,
    hideUI,
    showToast,
    dismissToast,
  };
}
