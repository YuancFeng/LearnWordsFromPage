/**
 * LingoRecall AI - Mobile Navigation Component
 * 移动端底部导航组件
 *
 * @module options/components/MobileNav
 */

import React from 'react';
import { BookOpen, GraduationCap, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDueCount } from '../../hooks/useDueCount';
import type { PageType } from './Sidebar';

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
 * MobileNav Props
 */
interface MobileNavProps {
  /** 当前页面 */
  currentPage: PageType;
  /** 导航回调 */
  onNavigate: (page: PageType) => void;
}

/**
 * 移动端底部导航组件
 */
export function MobileNav({ currentPage, onNavigate }: MobileNavProps) {
  const { t } = useTranslation();
  const { dueCount } = useDueCount();

  const navItems: NavItem[] = [
    { id: 'vocabulary', labelKey: 'options.nav.vocabulary', icon: BookOpen },
    { id: 'review', labelKey: 'options.nav.review', icon: GraduationCap, badge: dueCount },
    { id: 'settings', labelKey: 'options.nav.settings', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2 safe-area-pb">
      <ul className="flex justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <li key={item.id}>
              <button
                onClick={() => onNavigate(item.id)}
                className={`
                  flex flex-col items-center gap-1 px-4 py-2 rounded-xl
                  text-xs font-medium transition-all duration-200
                  ${
                    isActive
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }
                `}
                type="button"
              >
                <div className="relative">
                  <Icon
                    size={24}
                    className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}
                  />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
                <span>{t(item.labelKey)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default MobileNav;
