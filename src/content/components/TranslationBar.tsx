/**
 * LingoRecall AI - Translation Progress Bar Component
 *
 * 全页翻译进度条组件，显示在页面顶部
 * - 显示翻译进度
 * - 提供取消/切换/恢复按钮
 *
 * @module content/components/TranslationBar
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TranslationState } from '../pageTranslator';

// ============================================================
// Types
// ============================================================

export interface TranslationBarProps {
  /** 当前翻译状态 */
  state: TranslationState;
  /** 当前进度 */
  progress: number;
  /** 总数 */
  total: number;
  /** 是否显示翻译内容 */
  showingTranslation: boolean;
  /** 切换原文/译文回调 */
  onToggle: () => void;
  /** 恢复原文回调 */
  onRestore: () => void;
  /** 关闭进度条回调 */
  onClose: () => void;
}

// ============================================================
// Component
// ============================================================

export const TranslationBar: React.FC<TranslationBarProps> = ({
  state,
  progress,
  total,
  showingTranslation,
  onToggle,
  onRestore,
  onClose,
}) => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  // 计算进度百分比
  const percentage = total > 0 ? Math.round((progress / total) * 100) : 0;

  // 翻译完成后自动最小化
  useEffect(() => {
    if (state === 'translated') {
      const timer = setTimeout(() => {
        setIsMinimized(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  if (!isVisible) {
    return null;
  }

  // 最小化状态 - 只显示一个小图标
  if (isMinimized && state === 'translated') {
    return (
      <div style={styles.minimizedContainer}>
        <button
          style={styles.minimizedButton}
          onClick={() => setIsMinimized(false)}
          title={t('pageTranslation.showControls', 'Show translation controls')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {/* 左侧状态信息 */}
        <div style={styles.statusSection}>
          {state === 'translating' && (
            <>
              <div style={styles.spinner} />
              <span style={styles.statusText}>
                {total === 0
                  ? t('pageTranslation.analyzing', 'Analyzing page...')
                  : percentage < 100
                    ? `${t('pageTranslation.translating', 'Translating')} ${progress}/${total} (${percentage}%)`
                    : t('pageTranslation.applying', 'Applying translations...')
                }
              </span>
            </>
          )}
          {state === 'translated' && (
            <span style={styles.statusText}>
              {t('pageTranslation.completed', 'Translation complete')} ({progress}/{total})
            </span>
          )}
          {state === 'error' && (
            <span style={{ ...styles.statusText, color: '#EF4444' }}>
              {t('pageTranslation.error', 'Translation failed')}
            </span>
          )}
        </div>

        {/* 进度条 */}
        {state === 'translating' && (
          <div style={styles.progressBar}>
            <div
              style={{
                ...styles.progressFill,
                width: `${percentage}%`,
              }}
            />
          </div>
        )}

        {/* 右侧按钮 */}
        <div style={styles.buttonSection}>
          {state === 'translated' && (
            <>
              <button
                style={styles.button}
                onClick={onToggle}
                title={showingTranslation
                  ? t('pageTranslation.showOriginal', 'Show original')
                  : t('pageTranslation.showTranslation', 'Show translation')
                }
              >
                {showingTranslation
                  ? t('pageTranslation.original', 'Original')
                  : t('pageTranslation.translation', 'Translation')
                }
              </button>
              <button
                style={{ ...styles.button, ...styles.secondaryButton }}
                onClick={onRestore}
                title={t('pageTranslation.restore', 'Restore original')}
              >
                {t('pageTranslation.restore', 'Restore')}
              </button>
            </>
          )}
          <button
            style={styles.closeButton}
            onClick={() => {
              if (state === 'translated') {
                setIsMinimized(true);
              } else {
                onClose();
                setIsVisible(false);
              }
            }}
            title={t('common.close', 'Close')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Styles
// ============================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2147483646,
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    backdropFilter: 'blur(8px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '8px 16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '14px',
    color: '#F1F5F9',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
  },
  content: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: '1200px',
    margin: '0 auto',
    gap: '16px',
  },
  statusSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: '0 0 auto',
  },
  statusText: {
    color: '#F1F5F9',
    fontSize: '14px',
    fontWeight: 500,
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: '#3B82F6',
    borderRadius: '50%',
    animation: 'lingorecall-spin 0.8s linear infinite',
  },
  progressBar: {
    flex: '1 1 auto',
    height: '4px',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: '2px',
    transition: 'width 0.3s ease',
  },
  buttonSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: '0 0 auto',
  },
  button: {
    padding: '6px 12px',
    backgroundColor: '#3B82F6',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  closeButton: {
    padding: '4px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#94A3B8',
    transition: 'color 0.2s',
  },
  minimizedContainer: {
    position: 'fixed',
    top: '16px',
    right: '16px',
    zIndex: 2147483646,
  },
  minimizedButton: {
    width: '40px',
    height: '40px',
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#F1F5F9',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    transition: 'transform 0.2s',
  },
};

export default TranslationBar;
