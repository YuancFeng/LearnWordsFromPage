/**
 * LingoRecall AI - PreferencesSection Component
 * Story 4.2 - Task 4: 偏好设置区域组件
 *
 * @module popup/components/PreferencesSection
 */

import React from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../hooks/useSettings';
import { ToggleSwitch } from './ToggleSwitch';
import { ThemeSelect } from './ThemeSelect';
import { LanguageSelect } from './LanguageSelect';

/**
 * PreferencesSection 属性
 */
export interface PreferencesSectionProps {
  /** 保存成功回调 */
  onSaveSuccess?: () => void;
  /** 保存错误回调 */
  onError?: (error: string) => void;
}

/**
 * 偏好设置区域组件
 * Story 4.2 - AC1, AC2, AC3, AC4
 *
 * @example
 * ```tsx
 * <PreferencesSection
 *   onSaveSuccess={() => toast.success('设置已保存')}
 *   onError={(error) => toast.error(error)}
 * />
 * ```
 */
export function PreferencesSection({
  onSaveSuccess,
  onError,
}: PreferencesSectionProps): React.ReactElement {
  const { t } = useTranslation();
  const { settings, isLoading, error, updateSetting } = useSettings();

  /**
   * 处理设置变更
   */
  const handleSettingChange = async <K extends keyof typeof settings>(
    key: K,
    value: (typeof settings)[K]
  ) => {
    const result = await updateSetting(key, value);
    if (result.success) {
      onSaveSuccess?.();
    } else {
      onError?.(result.error?.message ?? t('analysis.toast.saveFailed'));
    }
  };

  // Loading 状态
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin mb-3" />
        <p className="text-sm">{t('common.loading')}</p>
      </div>
    );
  }

  // Error 状态
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-red-500">
        <p className="text-sm mb-2">{t('common.error')}</p>
        <p className="text-xs text-gray-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 交互设置 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
          {t('settings.preferences.interaction')}
        </h3>

        {/* AC1: 双击查词开关 */}
        <ToggleSwitch
          label={t('settings.preferences.doubleClick')}
          description={t('settings.preferences.doubleClickDesc')}
          checked={settings.enableDoubleClick}
          onChange={(checked) => handleSettingChange('enableDoubleClick', checked)}
          testId="toggle-double-click"
        />

        {/* AC2: 悬浮图标开关 */}
        <ToggleSwitch
          label={t('settings.preferences.hoverIcon')}
          description={t('settings.preferences.hoverIconDesc')}
          checked={settings.enableHoverIcon}
          onChange={(checked) => handleSettingChange('enableHoverIcon', checked)}
          testId="toggle-hover-icon"
        />

        {/* 复习提醒开关 */}
        <ToggleSwitch
          label={t('settings.preferences.reviewReminder')}
          description={t('settings.preferences.reviewReminderDesc')}
          checked={settings.reviewReminder}
          onChange={(checked) => handleSettingChange('reviewReminder', checked)}
          testId="toggle-review-reminder"
        />

        {/* 跳过中文文本开关 */}
        <ToggleSwitch
          label={t('settings.preferences.skipNativeText')}
          description={t('settings.preferences.skipNativeTextDesc')}
          checked={settings.skipChineseText}
          onChange={(checked) => handleSettingChange('skipChineseText', checked)}
          testId="toggle-skip-chinese"
        />
      </div>

      {/* AC3: 主题设置 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
          {t('settings.preferences.appearance')}
        </h3>

        <ThemeSelect
          value={settings.theme}
          onChange={(theme) => handleSettingChange('theme', theme)}
        />
      </div>

      {/* 语言设置 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
          {t('settings.preferences.language')}
        </h3>

        <div className="space-y-4">
          {/* UI 界面语言选择 */}
          <LanguageSelect
            value={settings.uiLanguage}
            onChange={(lang) => handleSettingChange('uiLanguage', lang)}
            showAutoOption
            syncI18n
            label={t('settings.preferences.uiLanguage')}
            testId="select-ui-language"
          />

          {/* 翻译目标语言选择 */}
          <LanguageSelect
            value={settings.targetLanguage}
            onChange={(lang) => handleSettingChange('targetLanguage', lang)}
            showAutoOption
            label={t('settings.preferences.targetLanguage')}
            description={t('settings.preferences.targetLanguageDesc')}
            testId="select-target-language"
          />
        </div>
      </div>
    </div>
  );
}

export default PreferencesSection;
