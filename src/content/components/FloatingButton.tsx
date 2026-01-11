/**
 * LingoRecall AI - Floating Button Component
 *
 * Displays a floating action button near selected text.
 * Provides quick access to analyze and save actions.
 *
 * @module content/components/FloatingButton
 */

import React, { useState, useCallback } from 'react';
import { floatingButtonStyles, COLORS, BOX_SHADOW } from '../styles/components';

export interface FloatingButtonProps {
  /** Position coordinates for the button */
  position: { x: number; y: number };
  /** Callback when analyze button is clicked */
  onAnalyze: () => void;
  /** Callback when save button is clicked */
  onSave?: () => void;
  /** Whether the analyze action is in progress */
  isLoading?: boolean;
  /** Whether to show the save button */
  showSaveButton?: boolean;
  /** Whether the button is closing (fade-out) */
  isClosing?: boolean;
}

/**
 * Analyze icon SVG component
 */
function AnalyzeIcon(): React.ReactElement {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={floatingButtonStyles.icon}
    >
      {/* Magnifying glass with sparkle - represents AI analysis */}
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
      <path d="M11 8v6" />
      <path d="M8 11h6" />
    </svg>
  );
}

/**
 * Save/bookmark icon SVG component
 */
function SaveIcon(): React.ReactElement {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={floatingButtonStyles.iconSmall}
    >
      {/* Bookmark icon */}
      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
    </svg>
  );
}

/**
 * Floating action button component
 * Shows near selected text for quick word analysis
 */
export function FloatingButton({
  position,
  onAnalyze,
  onSave,
  isLoading = false,
  showSaveButton = true,
  isClosing = false,
}: FloatingButtonProps): React.ReactElement {
  const [isHoveredPrimary, setIsHoveredPrimary] = useState(false);
  const [isHoveredSecondary, setIsHoveredSecondary] = useState(false);

  const handleAnalyzeClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isLoading) {
        onAnalyze();
      }
    },
    [onAnalyze, isLoading]
  );

  const handleSaveClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onSave?.();
    },
    [onSave]
  );

  // Calculate container position from selection anchor
  const containerStyle: React.CSSProperties = {
    ...floatingButtonStyles.container,
    left: `${position.x}px`,
    top: `${position.y}px`,
    animation: isClosing
      ? 'lingorecall-fadeOut 0.3s ease-in forwards'
      : 'lingorecall-fadeIn 0.3s ease-out',
    pointerEvents: isClosing ? 'none' : 'auto',
  };

  // Primary button style with hover state
  const primaryButtonStyle: React.CSSProperties = {
    ...floatingButtonStyles.button,
    ...(isHoveredPrimary ? floatingButtonStyles.buttonHover : {}),
    opacity: isLoading ? 0.7 : 1,
    cursor: isLoading ? 'wait' : 'pointer',
  };

  // Secondary button style with hover state
  const secondaryButtonStyle: React.CSSProperties = {
    ...floatingButtonStyles.buttonSecondary,
    ...(isHoveredSecondary ? floatingButtonStyles.buttonSecondaryHover : {}),
  };

  return (
    <div style={containerStyle}>
      {/* Primary Analyze Button */}
      <button
        type="button"
        onClick={handleAnalyzeClick}
        onMouseEnter={() => setIsHoveredPrimary(true)}
        onMouseLeave={() => setIsHoveredPrimary(false)}
        style={primaryButtonStyle}
        disabled={isLoading}
        title="Analyze with AI"
        aria-label="Analyze selected text with AI"
      >
        {isLoading ? (
          <div
            style={{
              width: '16px',
              height: '16px',
              border: `2px solid ${COLORS.white}`,
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'lingorecall-spin 0.8s linear infinite',
            }}
          />
        ) : (
          <AnalyzeIcon />
        )}
      </button>

      {/* Secondary Save Button */}
      {showSaveButton && onSave && (
        <button
          type="button"
          onClick={handleSaveClick}
          onMouseEnter={() => setIsHoveredSecondary(true)}
          onMouseLeave={() => setIsHoveredSecondary(false)}
          style={secondaryButtonStyle}
          title="Quick save word"
          aria-label="Quick save word to vocabulary"
        >
          <SaveIcon />
        </button>
      )}
    </div>
  );
}

/**
 * Compact floating button variant (single button)
 */
export function FloatingButtonCompact({
  position,
  onClick,
  isLoading = false,
}: {
  position: { x: number; y: number };
  onClick: () => void;
  isLoading?: boolean;
}): React.ReactElement {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isLoading) {
        onClick();
      }
    },
    [onClick, isLoading]
  );

  const buttonStyle: React.CSSProperties = {
    position: 'fixed',
    left: `${position.x}px`,
    top: `${position.y}px`,
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: isHovered ? COLORS.primaryHover : COLORS.primary,
    color: COLORS.white,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: isLoading ? 'wait' : 'pointer',
    boxShadow: isHovered ? BOX_SHADOW.xl : BOX_SHADOW.lg,
    transform: isHovered ? 'scale(1.05)' : 'scale(1)',
    transition: 'all 0.15s ease',
    border: 'none',
    opacity: isLoading ? 0.7 : 1,
    zIndex: 2147483647,
    animation: 'lingorecall-scaleIn 0.2s ease-out',
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={buttonStyle}
      disabled={isLoading}
      title="Analyze with AI"
      aria-label="Analyze selected text with AI"
    >
      {isLoading ? (
        <div
          style={{
            width: '16px',
            height: '16px',
            border: `2px solid ${COLORS.white}`,
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'lingorecall-spin 0.8s linear infinite',
          }}
        />
      ) : (
        <AnalyzeIcon />
      )}
    </button>
  );
}
