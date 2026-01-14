/**
 * LingoRecall AI - ThemeSelect Component
 * Story 4.2 - Task 4: 主题选择组件
 *
 * @module popup/components/ThemeSelect
 */

import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { type ThemeType, THEME_OPTIONS } from '../../shared/types/settings';

/**
 * ThemeSelect 属性
 */
export interface ThemeSelectProps {
  /** 当前主题值 */
  value: ThemeType;
  /** 变更回调 */
  onChange: (theme: ThemeType) => void;
  /** 是否禁用 */
  disabled?: boolean;
}

/**
 * 获取主题图标
 */
function getThemeIcon(theme: ThemeType): React.ReactNode {
  switch (theme) {
    case 'light':
      return <Sun className="w-4 h-4" />;
    case 'dark':
      return <Moon className="w-4 h-4" />;
    case 'system':
      return <Monitor className="w-4 h-4" />;
  }
}

/**
 * 获取主题翻译键
 */
function getThemeLabelKey(theme: ThemeType): string {
  switch (theme) {
    case 'light':
      return 'settings.preferences.themeLight';
    case 'dark':
      return 'settings.preferences.themeDark';
    case 'system':
      return 'settings.preferences.themeSystem';
  }
}

/**
 * 主题选择组件
 * Story 4.2 - AC3
 *
 * @example
 * ```tsx
 * <ThemeSelect
 *   value={settings.theme}
 *   onChange={(theme) => updateSetting('theme', theme)}
 * />
 * ```
 */
export function ThemeSelect({
  value,
  onChange,
  disabled = false,
}: ThemeSelectProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <div className="py-2">
      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
        {t('settings.preferences.theme')}
      </div>
      <div className="flex gap-2">
        {THEME_OPTIONS.map((option) => {
          const isSelected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              disabled={disabled}
              aria-pressed={isSelected}
              aria-label={t(getThemeLabelKey(option.value))}
              className={`
                flex-1 flex items-center justify-center gap-1.5
                px-3 py-2 rounded-lg
                text-sm font-medium
                border transition-all duration-200
                ${
                  isSelected
                    ? 'bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-500'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              `}
            >
              {getThemeIcon(option.value)}
              <span>{t(getThemeLabelKey(option.value))}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ThemeSelect;
