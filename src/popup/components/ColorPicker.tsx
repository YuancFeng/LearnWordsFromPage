/**
 * LingoRecall AI - ColorPicker Component
 * Story 4.4 - Task 6: 颜色选择器组件
 *
 * 提供预设颜色选择和自定义 HEX 颜色输入
 *
 * @module popup/components/ColorPicker
 */

import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { PRESET_COLORS, isValidHexColor } from '../../shared/types/tag';

/**
 * ColorPicker 属性
 */
export interface ColorPickerProps {
  /** 当前选中的颜色 */
  value: string;
  /** 颜色变更回调 */
  onChange: (color: string) => void;
  /** 是否禁用 */
  disabled?: boolean;
}

/**
 * 颜色选择器组件
 * Story 4.4 - AC4: 预设颜色和自定义 HEX 输入
 *
 * @example
 * ```tsx
 * <ColorPicker
 *   value={tagColor}
 *   onChange={(color) => setTagColor(color)}
 * />
 * ```
 */
export function ColorPicker({
  value,
  onChange,
  disabled = false,
}: ColorPickerProps): React.ReactElement {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customColor, setCustomColor] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);

  /**
   * 处理预设颜色选择
   */
  const handlePresetClick = (color: string) => {
    if (disabled) return;
    onChange(color);
    setShowCustomInput(false);
    setCustomError(null);
  };

  /**
   * 处理自定义颜色输入变化
   */
  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setCustomColor(input);
    setCustomError(null);

    // 自动添加 # 前缀
    const colorValue = input.startsWith('#') ? input : `#${input}`;

    // 实时验证并应用
    if (isValidHexColor(colorValue)) {
      onChange(colorValue);
    }
  };

  /**
   * 处理自定义颜色提交
   */
  const handleCustomSubmit = () => {
    const colorValue = customColor.startsWith('#')
      ? customColor
      : `#${customColor}`;

    if (isValidHexColor(colorValue)) {
      onChange(colorValue);
      setShowCustomInput(false);
      setCustomColor('');
      setCustomError(null);
    } else {
      setCustomError('请输入有效的 HEX 颜色（如 #FF5733）');
    }
  };

  /**
   * 处理回车键提交
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCustomSubmit();
    } else if (e.key === 'Escape') {
      setShowCustomInput(false);
      setCustomColor('');
      setCustomError(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* 标签 */}
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        颜色
      </label>

      {/* 预设颜色网格 */}
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => handlePresetClick(color)}
            disabled={disabled}
            className={`
              relative w-8 h-8 rounded-full transition-all duration-150
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 cursor-pointer'}
              ${value === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''}
            `}
            style={{ backgroundColor: color }}
            title={color}
            data-testid={`color-preset-${color}`}
          >
            {value === color && (
              <Check
                className="absolute inset-0 m-auto text-white drop-shadow-md"
                size={16}
              />
            )}
          </button>
        ))}

        {/* 自定义颜色按钮 */}
        <button
          type="button"
          onClick={() => setShowCustomInput(!showCustomInput)}
          disabled={disabled}
          className={`
            w-8 h-8 rounded-full border-2 border-dashed transition-all duration-150
            ${disabled ? 'opacity-50 cursor-not-allowed border-gray-300' : 'border-gray-400 hover:border-gray-600 cursor-pointer'}
            ${showCustomInput ? 'bg-gray-100 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'}
            flex items-center justify-center
          `}
          title="自定义颜色"
          data-testid="color-custom-button"
        >
          <span className="text-gray-500 text-xs font-bold">+</span>
        </button>
      </div>

      {/* 自定义 HEX 输入 */}
      {showCustomInput && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={customColor}
              onChange={handleCustomChange}
              onKeyDown={handleKeyDown}
              placeholder="#FF5733"
              maxLength={7}
              className={`
                flex-1 px-3 py-1.5 text-sm rounded-md
                bg-gray-50 dark:bg-gray-900
                border focus:outline-none focus:ring-2 focus:ring-blue-500
                ${customError
                  ? 'border-red-300 dark:border-red-600'
                  : 'border-gray-200 dark:border-gray-600'
                }
              `}
              data-testid="color-custom-input"
            />
            <button
              type="button"
              onClick={handleCustomSubmit}
              disabled={!customColor}
              className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="color-custom-apply"
            >
              应用
            </button>
          </div>

          {customError && (
            <p className="text-xs text-red-500" data-testid="color-custom-error">
              {customError}
            </p>
          )}
        </div>
      )}

      {/* 当前选中颜色预览 */}
      <div className="flex items-center gap-2 pt-1">
        <div
          className="w-6 h-6 rounded border border-gray-200 dark:border-gray-600"
          style={{ backgroundColor: value }}
          data-testid="color-preview"
        />
        <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">
          {value}
        </span>
      </div>
    </div>
  );
}

export default ColorPicker;
