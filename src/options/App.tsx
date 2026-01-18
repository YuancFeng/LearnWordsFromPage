/**
 * LingoRecall AI - Options Page App
 * 独立的全屏复习和设置页面主应用
 *
 * 支持 Hash 路由：
 * - #vocabulary (默认)
 * - #review
 * - #settings
 *
 * @module options/App
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../hooks/useTheme';
import { Layout } from './components/Layout';
import type { PageType } from './components/Sidebar';

// 复用 popup 组件
import { FullPageVocabulary } from './components/FullPageVocabulary';
import { ReviewPage } from '../popup/components/ReviewPage';
import { SettingsPanel } from '../popup/components/SettingsPanel';

/**
 * 从 URL hash 获取页面类型
 */
function getPageFromHash(): PageType {
  const hash = window.location.hash.slice(1); // 移除 # 前缀
  if (hash === 'review') return 'review';
  if (hash.startsWith('settings')) return 'settings';
  return 'vocabulary';
}

/**
 * Options Page 主应用组件
 */
export function App() {
  const [currentPage, setCurrentPage] = useState<PageType>(getPageFromHash);

  // 应用主题
  useTheme();

  // 监听 hash 变化
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPage(getPageFromHash());
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  /**
   * 导航到指定页面
   */
  const navigate = useCallback((page: PageType) => {
    window.location.hash = page === 'vocabulary' ? '' : page;
  }, []);

  /**
   * 打开设置页面（从子组件调用）
   */
  const handleOpenSettings = useCallback(() => {
    navigate('settings');
  }, [navigate]);

  /**
   * 开始复习（从子组件调用）
   */
  const handleStartReview = useCallback(() => {
    navigate('review');
  }, [navigate]);

  /**
   * 返回词库页面
   */
  const handleBackToVocabulary = useCallback(() => {
    navigate('vocabulary');
  }, [navigate]);

  return (
    <Layout currentPage={currentPage} onNavigate={navigate}>
      {currentPage === 'vocabulary' && (
        <FullPageVocabulary
          onStartReview={handleStartReview}
          onOpenSettings={handleOpenSettings}
        />
      )}

      {currentPage === 'review' && (
        <ReviewPage onBack={handleBackToVocabulary} />
      )}

      {currentPage === 'settings' && (
        <SettingsPanel onBack={handleBackToVocabulary} />
      )}
    </Layout>
  );
}

export default App;
