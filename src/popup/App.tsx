/**
 * LingoRecall AI - Popup App
 * Story 3.3 实现 - AC1: 集成复习页面入口
 * Story 4.1 实现 - 添加设置页面入口
 *
 * 管理 Popup 内的页面导航
 *
 * @module popup/App
 */

import React, { useState, useCallback } from 'react';
import { VocabularyList } from './components/VocabularyList';
import { ReviewPage } from './components/ReviewPage';
import { SettingsPanel } from './components/SettingsPanel';

/**
 * 页面类型
 * Story 4.1: 添加 'settings' 页面类型
 */
type PageType = 'vocabulary' | 'review' | 'settings';

/**
 * Popup 主应用组件
 * Story 3.3 - AC1: 管理词库和复习页面切换
 * Story 4.1: 添加设置页面导航
 */
export function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('vocabulary');

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
    <div className="min-h-screen bg-gray-50">
      {currentPage === 'vocabulary' && (
        <div className="p-4">
          <VocabularyList
            onStartReview={handleStartReview}
            onOpenSettings={handleOpenSettings}
          />
        </div>
      )}

      {currentPage === 'review' && (
        <ReviewPage onBack={handleBackToVocabulary} />
      )}

      {currentPage === 'settings' && (
        <SettingsPanel onBack={handleBackToVocabulary} />
      )}
    </div>
  );
}

export default App;
