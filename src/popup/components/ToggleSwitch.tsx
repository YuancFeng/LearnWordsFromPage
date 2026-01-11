/**
 * LingoRecall AI - ToggleSwitch Component
 * Story 4.2 - Task 4: 可复用的开关组件
 *
 * @module popup/components/ToggleSwitch
 */

import React from 'react';

/**
 * ToggleSwitch 属性
 */
export interface ToggleSwitchProps {
  /** 标签文本 */
  label: string;
  /** 描述文本 (可选) */
  description?: string;
  /** 是否选中 */
  checked: boolean;
  /** 变更回调 */
  onChange: (checked: boolean) => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 测试 ID */
  testId?: string;
}

/**
 * 开关组件
 * Story 4.2 - Task 4
 *
 * @example
 * ```tsx
 * <ToggleSwitch
 *   label="双击查词"
 *   description="在网页上双击选中单词时触发翻译"
 *   checked={settings.enableDoubleClick}
 *   onChange={(checked) => updateSetting('enableDoubleClick', checked)}
 * />
 * ```
 */
export function ToggleSwitch({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  testId,
}: ToggleSwitchProps): React.ReactElement {
  return (
    <div className="flex items-center justify-between py-2" data-testid={testId}>
      <div className="flex-1 min-w-0 pr-4">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {label}
        </div>
        {description && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {description}
          </div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={`
          relative inline-flex h-6 w-11 flex-shrink-0
          items-center rounded-full
          transition-colors duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${checked ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <span
          aria-hidden="true"
          className={`
            inline-block h-4 w-4 transform rounded-full
            bg-white shadow-sm
            transition-transform duration-200 ease-in-out
            ${checked ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
    </div>
  );
}

export default ToggleSwitch;
