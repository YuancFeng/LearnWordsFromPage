/**
 * LingoRecall AI - Shadow DOM CSS Reset Styles
 *
 * Provides complete CSS reset and base styles for Shadow DOM isolation.
 * All inherited styles from the host page are neutralized here.
 *
 * @module content/styles/reset
 */

/**
 * Complete CSS reset and base styles for Shadow DOM
 * - Resets all inherited styles from host page
 * - Provides consistent baseline across all websites
 * - Includes animation keyframes for UI components
 */
export const SHADOW_STYLES = `
  /* ============================================
   * CSS Reset - Neutralize all inherited styles
   * ============================================ */
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    border: 0;
    font-size: 100%;
    font: inherit;
    vertical-align: baseline;
    line-height: normal;
    text-decoration: none;
    text-transform: none;
    letter-spacing: normal;
    word-spacing: normal;
    white-space: normal;
    word-break: normal;
    word-wrap: normal;
    text-shadow: none;
    box-shadow: none;
    outline: none;
    background: transparent;
    color: inherit;
  }

  /* ============================================
   * Base Styles - Mount Point
   * ============================================ */
  #lingorecall-mount {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
      'Helvetica Neue', Arial, 'Noto Sans', sans-serif,
      'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
    font-size: 14px;
    line-height: 1.5;
    color: #1f2937;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
    direction: ltr;
    text-align: left;
  }

  /* ============================================
   * Button Reset
   * ============================================ */
  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    cursor: pointer;
    font-family: inherit;
    font-size: inherit;
    color: inherit;
    line-height: 1;
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    user-select: none;
    -webkit-user-select: none;
    touch-action: manipulation;
  }

  button:focus {
    outline: none;
  }

  button:focus-visible {
    outline: 2px solid #3B82F6;
    outline-offset: 2px;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  /* ============================================
   * Animation Keyframes
   * ============================================ */

  /* Fade in animation */
  @keyframes lingorecall-fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  /* Fade out animation */
  @keyframes lingorecall-fadeOut {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }

  /* Slide in from top animation */
  @keyframes lingorecall-slideIn {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Slide out to top animation */
  @keyframes lingorecall-slideOut {
    from {
      opacity: 1;
      transform: translateY(0);
    }
    to {
      opacity: 0;
      transform: translateY(-8px);
    }
  }

  /* Scale in animation */
  @keyframes lingorecall-scaleIn {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  /* Spinner rotation */
  @keyframes lingorecall-spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  /* Pulse animation for loading states */
  @keyframes lingorecall-pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  /* Bounce animation for attention */
  @keyframes lingorecall-bounce {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-4px);
    }
  }

  /* ============================================
   * Utility Classes
   * ============================================ */

  .lingorecall-fade-in {
    animation: lingorecall-fadeIn 0.2s ease-out forwards;
  }

  .lingorecall-fade-out {
    animation: lingorecall-fadeOut 0.2s ease-in forwards;
  }

  .lingorecall-slide-in {
    animation: lingorecall-slideIn 0.2s ease-out forwards;
  }

  .lingorecall-slide-out {
    animation: lingorecall-slideOut 0.2s ease-in forwards;
  }

  .lingorecall-scale-in {
    animation: lingorecall-scaleIn 0.2s ease-out forwards;
  }

  .lingorecall-spin {
    animation: lingorecall-spin 1s linear infinite;
  }

  .lingorecall-pulse {
    animation: lingorecall-pulse 2s ease-in-out infinite;
  }

  .lingorecall-bounce {
    animation: lingorecall-bounce 0.5s ease-in-out;
  }

  /* ============================================
   * Scrollbar Styling (for popup content)
   * ============================================ */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    background: #CBD5E1;
    border-radius: 3px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #94A3B8;
  }

  /* ============================================
   * Selection Styling
   * ============================================ */
  ::selection {
    background: #BFDBFE;
    color: #1E40AF;
  }

  ::-moz-selection {
    background: #BFDBFE;
    color: #1E40AF;
  }
`;
