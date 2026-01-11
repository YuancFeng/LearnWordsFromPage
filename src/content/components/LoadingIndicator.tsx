/**
 * LingoRecall AI - Loading Indicator Component
 *
 * Displays a loading spinner when analysis is in progress.
 * Renders at the position of the floating button.
 *
 * @module content/components/LoadingIndicator
 */

import React from 'react';
import { loadingIndicatorStyles, COLORS } from '../styles/components';

export interface LoadingIndicatorProps {
  /** Position coordinates for the loading indicator */
  position: { x: number; y: number };
  /** Optional size variant */
  size?: 'small' | 'medium' | 'large';
  /** Optional custom color */
  color?: string;
}

/**
 * Loading indicator component for analysis progress
 */
export function LoadingIndicator({
  position,
  size = 'medium',
  color,
}: LoadingIndicatorProps): React.ReactElement {
  // Calculate dimensions based on size
  const dimensions = {
    small: { container: 24, spinner: 12, border: 2 },
    medium: { container: 32, spinner: 16, border: 2 },
    large: { container: 40, spinner: 20, border: 3 },
  };

  const { container: containerSize, spinner: spinnerSize, border: borderWidth } = dimensions[size];

  const containerStyle: React.CSSProperties = {
    ...loadingIndicatorStyles.container,
    left: `${position.x}px`,
    top: `${position.y}px`,
    width: `${containerSize}px`,
    height: `${containerSize}px`,
    backgroundColor: color || COLORS.primary,
  };

  const spinnerStyle: React.CSSProperties = {
    ...loadingIndicatorStyles.spinner,
    width: `${spinnerSize}px`,
    height: `${spinnerSize}px`,
    borderWidth: `${borderWidth}px`,
  };

  return (
    <div
      style={containerStyle}
      role="status"
      aria-label="Loading analysis..."
    >
      <div style={spinnerStyle} />
    </div>
  );
}

/**
 * Inline loading spinner for use within other components
 */
export function InlineSpinner({
  size = 16,
  color = COLORS.primary,
}: {
  size?: number;
  color?: string;
}): React.ReactElement {
  const spinnerStyle: React.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    border: `2px solid ${color}`,
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'lingorecall-spin 0.8s linear infinite',
    display: 'inline-block',
  };

  return (
    <span
      style={spinnerStyle}
      role="status"
      aria-label="Loading..."
    />
  );
}
