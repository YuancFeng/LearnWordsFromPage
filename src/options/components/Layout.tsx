/**
 * LingoRecall AI - Options Layout Component
 * 响应式布局组件
 *
 * @module options/components/Layout
 */

import React from 'react';
import { Sidebar, type PageType } from './Sidebar';
import { MobileNav } from './MobileNav';

/**
 * Layout Props
 */
interface LayoutProps {
  /** 当前页面 */
  currentPage: PageType;
  /** 导航回调 */
  onNavigate: (page: PageType) => void;
  /** 子元素 */
  children: React.ReactNode;
}

/**
 * 响应式布局组件
 * - 桌面端：左侧固定侧边栏 + 右侧内容区
 * - 移动端：底部导航栏
 */
export function Layout({ currentPage, onNavigate, children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* 桌面端布局 */}
      <div className="hidden md:flex h-screen">
        {/* 侧边栏 */}
        <Sidebar currentPage={currentPage} onNavigate={onNavigate} />

        {/* 内容区域 - 全宽显示 */}
        <main className="flex-1 overflow-auto p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* 移动端布局 */}
      <div className="md:hidden flex flex-col min-h-screen">
        {/* 内容区域 */}
        <main className="flex-1 overflow-auto pb-20 p-4">
          {children}
        </main>

        {/* 底部导航 */}
        <MobileNav currentPage={currentPage} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

export default Layout;
