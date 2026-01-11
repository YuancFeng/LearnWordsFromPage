/**
 * LingoRecall AI - Component Style Constants
 *
 * Provides consistent inline styles for all UI components.
 * All styles are defined as React.CSSProperties objects for type safety.
 *
 * @module content/styles/components
 */

import type { CSSProperties } from 'react';

// ============================================
// Design Tokens
// ============================================

export const COLORS = {
  // Primary colors
  primary: '#3B82F6',
  primaryHover: '#2563EB',
  primaryLight: '#DBEAFE',
  primaryDark: '#1D4ED8',

  // Secondary colors
  secondary: '#6B7280',
  secondaryHover: '#4B5563',
  secondaryLight: '#F3F4F6',

  // Success colors
  success: '#10B981',
  successLight: '#D1FAE5',

  // Warning colors
  warning: '#F59E0B',
  warningLight: '#FEF3C7',

  // Error colors
  error: '#EF4444',
  errorLight: '#FEE2E2',

  // Neutral colors
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',

  // Background
  backdrop: 'rgba(0, 0, 0, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.1)',
  shadowDark: 'rgba(0, 0, 0, 0.15)',
} as const;

export const SPACING = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  xxl: '24px',
} as const;

export const BORDER_RADIUS = {
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  full: '9999px',
} as const;

export const FONT_SIZE = {
  xs: '11px',
  sm: '12px',
  md: '14px',
  lg: '16px',
  xl: '18px',
} as const;

export const FONT_WEIGHT = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const BOX_SHADOW = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 2px 8px rgba(0, 0, 0, 0.1)',
  lg: '0 4px 12px rgba(0, 0, 0, 0.15)',
  xl: '0 8px 24px rgba(0, 0, 0, 0.2)',
} as const;

export const TRANSITION = {
  fast: 'all 0.15s ease',
  normal: 'all 0.2s ease',
  slow: 'all 0.3s ease',
} as const;

export const Z_INDEX = {
  base: 1,
  dropdown: 1000,
  modal: 2000,
  tooltip: 3000,
  max: 2147483647, // Maximum z-index for overlay components
} as const;

// ============================================
// Floating Button Styles
// ============================================

export const floatingButtonStyles = {
  container: {
    position: 'fixed',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    zIndex: Z_INDEX.max,
    animation: 'lingorecall-fadeIn 0.3s ease-out',
  } as CSSProperties,

  button: {
    width: '32px',
    height: '32px',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primary,
    color: COLORS.white,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: BOX_SHADOW.lg,
    transition: TRANSITION.fast,
    border: 'none',
  } as CSSProperties,

  buttonHover: {
    backgroundColor: COLORS.primaryHover,
    transform: 'scale(1.05)',
    boxShadow: BOX_SHADOW.xl,
  } as CSSProperties,

  buttonSecondary: {
    width: '28px',
    height: '28px',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.white,
    color: COLORS.gray600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: BOX_SHADOW.md,
    transition: TRANSITION.fast,
    border: `1px solid ${COLORS.gray200}`,
  } as CSSProperties,

  buttonSecondaryHover: {
    backgroundColor: COLORS.gray50,
    borderColor: COLORS.gray300,
  } as CSSProperties,

  icon: {
    width: '18px',
    height: '18px',
    fill: 'currentColor',
  } as CSSProperties,

  iconSmall: {
    width: '14px',
    height: '14px',
    fill: 'currentColor',
  } as CSSProperties,
} as const;

// ============================================
// Loading Indicator Styles
// ============================================

export const loadingIndicatorStyles = {
  container: {
    position: 'fixed',
    width: '32px',
    height: '32px',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: BOX_SHADOW.lg,
    zIndex: Z_INDEX.max,
    animation: 'lingorecall-fadeIn 0.2s ease-out',
  } as CSSProperties,

  spinner: {
    width: '16px',
    height: '16px',
    border: `2px solid ${COLORS.white}`,
    borderTopColor: 'transparent',
    borderRadius: BORDER_RADIUS.full,
    animation: 'lingorecall-spin 0.8s linear infinite',
  } as CSSProperties,

  spinnerSmall: {
    width: '12px',
    height: '12px',
    border: `2px solid ${COLORS.primary}`,
    borderTopColor: 'transparent',
    borderRadius: BORDER_RADIUS.full,
    animation: 'lingorecall-spin 0.8s linear infinite',
  } as CSSProperties,
} as const;

// ============================================
// Analysis Popup Styles (for future Story 1.6)
// ============================================

export const analysisPopupStyles = {
  container: {
    position: 'fixed',
    width: '320px',
    maxHeight: '400px',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    boxShadow: BOX_SHADOW.xl,
    overflow: 'hidden',
    zIndex: Z_INDEX.max,
    animation: 'lingorecall-slideIn 0.2s ease-out',
  } as CSSProperties,

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${SPACING.md} ${SPACING.lg}`,
    borderBottom: `1px solid ${COLORS.gray200}`,
    backgroundColor: COLORS.gray50,
  } as CSSProperties,

  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.gray800,
    margin: 0,
  } as CSSProperties,

  closeButton: {
    width: '24px',
    height: '24px',
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: 'transparent',
    color: COLORS.gray500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: TRANSITION.fast,
  } as CSSProperties,

  content: {
    padding: SPACING.lg,
    overflowY: 'auto',
    maxHeight: '280px',
  } as CSSProperties,

  section: {
    marginBottom: SPACING.md,
  } as CSSProperties,

  sectionTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.gray500,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  } as CSSProperties,

  sectionContent: {
    fontSize: FONT_SIZE.md,
    color: COLORS.gray800,
    lineHeight: '1.6',
  } as CSSProperties,

  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    padding: `${SPACING.md} ${SPACING.lg}`,
    borderTop: `1px solid ${COLORS.gray200}`,
    backgroundColor: COLORS.gray50,
  } as CSSProperties,

  actionButton: {
    padding: `${SPACING.sm} ${SPACING.lg}`,
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    cursor: 'pointer',
    transition: TRANSITION.fast,
  } as CSSProperties,

  primaryButton: {
    backgroundColor: COLORS.primary,
    color: COLORS.white,
    border: 'none',
  } as CSSProperties,

  secondaryButton: {
    backgroundColor: COLORS.white,
    color: COLORS.gray700,
    border: `1px solid ${COLORS.gray300}`,
  } as CSSProperties,
} as const;

// ============================================
// Tooltip Styles
// ============================================

export const tooltipStyles = {
  container: {
    position: 'absolute',
    padding: `${SPACING.xs} ${SPACING.sm}`,
    backgroundColor: COLORS.gray800,
    color: COLORS.white,
    fontSize: FONT_SIZE.xs,
    borderRadius: BORDER_RADIUS.sm,
    whiteSpace: 'nowrap',
    zIndex: Z_INDEX.tooltip,
    animation: 'lingorecall-fadeIn 0.15s ease-out',
  } as CSSProperties,

  arrow: {
    position: 'absolute',
    width: '6px',
    height: '6px',
    backgroundColor: COLORS.gray800,
    transform: 'rotate(45deg)',
  } as CSSProperties,
} as const;
