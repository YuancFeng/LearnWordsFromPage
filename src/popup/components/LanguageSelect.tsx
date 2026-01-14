/**
 * LingoRecall AI - Language Selector Component
 *
 * 语言选择下拉组件，支持 UI 语言和翻译目标语言选择
 *
 * @module popup/components/LanguageSelect
 */

import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Globe } from 'lucide-react';
import { UI_LANGUAGE_OPTIONS, type UILanguage, type TargetLanguage } from '../../shared/types/settings';
import { changeLanguage } from '../../i18n';

interface LanguageSelectProps {
  /** 当前选中的语言 */
  value: UILanguage | TargetLanguage | 'auto';
  /** 语言变更回调 */
  onChange: (lang: UILanguage | TargetLanguage | 'auto') => void;
  /** 是否显示"自动检测"选项（用于 UI 语言） */
  showAutoOption?: boolean;
  /** 标签文本 */
  label?: string;
  /** 描述文本 */
  description?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否同时更新 i18n 语言（用于 UI 语言选择器） */
  syncI18n?: boolean;
  /** 测试 ID */
  testId?: string;
}

/**
 * 语言选择器组件
 *
 * 提供下拉菜单选择语言，支持：
 * - UI 界面语言选择（带"自动检测"选项）
 * - 翻译目标语言选择
 *
 * @example
 * // UI 语言选择器
 * <LanguageSelect
 *   value={settings.uiLanguage}
 *   onChange={(lang) => updateSetting('uiLanguage', lang)}
 *   showAutoOption
 *   syncI18n
 *   label={t('settings.preferences.uiLanguage')}
 * />
 *
 * @example
 * // 翻译目标语言选择器
 * <LanguageSelect
 *   value={settings.targetLanguage}
 *   onChange={(lang) => updateSetting('targetLanguage', lang)}
 *   showAutoOption
 *   label={t('settings.preferences.targetLanguage')}
 *   description={t('settings.preferences.targetLanguageDesc')}
 * />
 */
export function LanguageSelect({
  value,
  onChange,
  showAutoOption = false,
  label,
  description,
  disabled = false,
  syncI18n = false,
  testId,
}: LanguageSelectProps) {
  const { t, i18n } = useTranslation();

  const handleChange = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newLang = e.target.value as UILanguage | TargetLanguage | 'auto';
      onChange(newLang);

      // 如果是 UI 语言选择器且需要同步 i18n
      if (syncI18n && newLang !== 'auto') {
        await changeLanguage(newLang);
      } else if (syncI18n && newLang === 'auto') {
        // 自动检测：使用浏览器语言
        const browserLang = navigator.language || 'en';
        // 尝试匹配精确语言或语言前缀
        const matchedLang = UI_LANGUAGE_OPTIONS.find(
          (opt) => opt.value === browserLang || browserLang.startsWith(opt.value.split('-')[0])
        );
        await changeLanguage(matchedLang?.value || 'en');
      }
    },
    [onChange, syncI18n]
  );

  // 获取当前选中语言的显示文本
  const getDisplayLabel = (langValue: string): string => {
    if (langValue === 'auto') {
      return t('settings.preferences.uiLanguageAuto');
    }
    const option = UI_LANGUAGE_OPTIONS.find((opt) => opt.value === langValue);
    return option ? `${option.label} (${option.labelEn})` : langValue;
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          <div className="flex items-center gap-1.5">
            <Globe className="w-4 h-4" />
            <span>{label}</span>
          </div>
        </label>
      )}

      <div className="relative">
        <select
          value={value}
          onChange={handleChange}
          disabled={disabled}
          data-testid={testId}
          className={`
            w-full appearance-none
            px-3 py-2 pr-10
            text-sm
            bg-white dark:bg-gray-800
            border border-gray-300 dark:border-gray-600
            rounded-lg
            text-gray-900 dark:text-gray-100
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:opacity-50 disabled:cursor-not-allowed
            cursor-pointer
            transition-colors
          `}
          aria-label={label || t('settings.preferences.language')}
        >
          {showAutoOption && (
            <option value="auto">
              {t('settings.preferences.uiLanguageAuto')} ({getDetectedLanguageDisplay(i18n.language)})
            </option>
          )}
          {UI_LANGUAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} ({option.labelEn})
            </option>
          ))}
        </select>

        {/* 自定义下拉箭头 */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </div>
      </div>

      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      )}
    </div>
  );
}

/**
 * 获取检测到的语言的显示名称
 */
function getDetectedLanguageDisplay(lang: string): string {
  const option = UI_LANGUAGE_OPTIONS.find(
    (opt) => opt.value === lang || lang.startsWith(opt.value.split('-')[0])
  );
  return option?.label || lang;
}

export default LanguageSelect;
