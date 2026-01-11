/**
 * LingoRecall AI - PreferencesSection Component
 * Story 4.2 - Task 4: 偏好设置区域组件
 *
 * @module popup/components/PreferencesSection
 */

import React from 'react';
import { Loader2 } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';
import { ToggleSwitch } from './ToggleSwitch';
import { ThemeSelect } from './ThemeSelect';

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
      onError?.(result.error?.message ?? '保存失败');
    }
  };

  // Loading 状态
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin mb-3" />
        <p className="text-sm">加载设置中...</p>
      </div>
    );
  }

  // Error 状态
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-red-500">
        <p className="text-sm mb-2">加载失败</p>
        <p className="text-xs text-gray-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 交互设置 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
          交互方式
        </h3>

        {/* AC1: 双击查词开关 */}
        <ToggleSwitch
          label="双击查词"
          description="双击网页上的单词时触发翻译"
          checked={settings.enableDoubleClick}
          onChange={(checked) => handleSettingChange('enableDoubleClick', checked)}
          testId="toggle-double-click"
        />

        {/* AC2: 悬浮图标开关 */}
        <ToggleSwitch
          label="显示悬浮图标"
          description="选中文字时显示翻译图标按钮"
          checked={settings.enableHoverIcon}
          onChange={(checked) => handleSettingChange('enableHoverIcon', checked)}
          testId="toggle-hover-icon"
        />

        {/* 复习提醒开关 */}
        <ToggleSwitch
          label="复习提醒"
          description="在扩展图标上显示待复习词汇数量"
          checked={settings.reviewReminder}
          onChange={(checked) => handleSettingChange('reviewReminder', checked)}
          testId="toggle-review-reminder"
        />
      </div>

      {/* AC3: 主题设置 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
          外观
        </h3>

        <ThemeSelect
          value={settings.theme}
          onChange={(theme) => handleSettingChange('theme', theme)}
        />
      </div>
    </div>
  );
}

export default PreferencesSection;
