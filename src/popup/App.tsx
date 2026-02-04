/**
 * LingoRecall AI - Popup App
 * Story 3.3 实现 - AC1: 集成复习页面入口
 * Story 4.1 实现 - 添加设置页面入口
 * Story 4.2 实现 - 集成主题切换功能
 *
 * 管理 Popup 内的页面导航
 *
 * @module popup/App
 */

import React, { useState, useCallback } from 'react';
import { VocabularyList } from './components/VocabularyList';
import { ReviewPage } from './components/ReviewPage';
import { SettingsPanel } from './components/SettingsPanel';
import { useToast } from './components/Toast';
import { useTheme } from '../hooks/useTheme';

/**
 * 页面类型
 * Story 4.1: 添加 'settings' 页面类型
 */
type PageType = 'vocabulary' | 'review' | 'settings';

/**
 * Popup 主应用组件
 * Story 3.3 - AC1: 管理词库和复习页面切换
 * Story 4.1: 添加设置页面导航
 * Story 4.2: 集成主题切换功能
 */
export function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('vocabulary');

  // Story 4.2: 调用 useTheme hook 以应用主题 class 到 document.documentElement
  useTheme();

  // Toast 通知
  const toast = useToast();

  /**
   * 进入复习页面
   */
  const handleStartReview = useCallback(() => {
    setCurrentPage('review');
  }, []);

  /**
   * 进入设置页面
   * Story 4.1: 新增设置页面导航
   */
  const handleOpenSettings = useCallback(() => {
    setCurrentPage('settings');
  }, []);

  /**
   * 返回词库页面
   */
  const handleBackToVocabulary = useCallback(() => {
    setCurrentPage('vocabulary');
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {currentPage === 'vocabulary' && (
        <div className="p-4">
          <VocabularyList
            onStartReview={handleStartReview}
            onOpenSettings={handleOpenSettings}
            toast={toast}
          />
        </div>
      )}

      {currentPage === 'review' && (
        <ReviewPage onBack={handleBackToVocabulary} toast={toast} />
      )}

      {currentPage === 'settings' && (
        <SettingsPanel onBack={handleBackToVocabulary} />
      )}

      {/* Toast 容器 */}
      <toast.ToastContainer />
    </div>
  );
}

export default App;
