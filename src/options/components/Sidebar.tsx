/**
 * LingoRecall AI - Options Sidebar Component
 * 侧边栏导航组件
 *
 * @module options/components/Sidebar
 */

import React from 'react';
import { BookOpen, GraduationCap, Settings, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDueCount } from '../../hooks/useDueCount';

/**
 * 页面类型
 */
export type PageType = 'vocabulary' | 'review' | 'settings';

/**
 * 导航项配置
 */
interface NavItem {
  id: PageType;
  labelKey: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  badge?: number;
}

/**
 * Sidebar Props
 */
interface SidebarProps {
  /** 当前页面 */
  currentPage: PageType;
  /** 导航回调 */
  onNavigate: (page: PageType) => void;
}

/**
 * 侧边栏导航组件
 */
export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { t } = useTranslation();
  const { dueCount } = useDueCount();

  const navItems: NavItem[] = [
    { id: 'vocabulary', labelKey: 'options.nav.vocabulary', icon: BookOpen },
    { id: 'review', labelKey: 'options.nav.review', icon: GraduationCap, badge: dueCount },
    { id: 'settings', labelKey: 'options.nav.settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full">
      {/* Logo 和标题 */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">LingoRecall</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">AI</p>
          </div>
        </div>
      </div>

      {/* 导航链接 */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl
                    text-sm font-medium transition-all duration-200
                    ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
                    }
                  `}
                  type="button"
                >
                  <Icon
                    size={20}
                    className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}
                  />
                  <span className="flex-1 text-left">{t(item.labelKey)}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* 底部：返回扩展链接 */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            // 关闭当前标签页，返回 popup
            window.close();
          }}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <ExternalLink size={16} />
          <span>{t('options.nav.backToPopup')}</span>
        </a>
      </div>
    </aside>
  );
}

export default Sidebar;
