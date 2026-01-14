/**
 * LingoRecall AI - BlacklistSection Component
 * Story 4.3 - Task 4: 网站黑名单管理区域组件
 *
 * 允许用户管理禁用扩展的网站列表
 * 支持通配符模式: *.domain.com, *keyword*
 *
 * @module popup/components/BlacklistSection
 */

import React, { useState } from 'react';
import { Loader2, Plus, Trash2, RotateCcw, AlertCircle, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../hooks/useSettings';
import { isValidPattern, normalizePattern } from '../../shared/utils/urlMatcher';
import { DEFAULT_SETTINGS } from '../../shared/types/settings';

/**
 * BlacklistSection 属性
 */
export interface BlacklistSectionProps {
  /** 保存成功回调 */
  onSaveSuccess?: () => void;
  /** 保存错误回调 */
  onError?: (error: string) => void;
}

/**
 * 黑名单管理区域组件
 * Story 4.3 - AC1, AC2, AC3, AC4
 *
 * @example
 * ```tsx
 * <BlacklistSection
 *   onSaveSuccess={() => toast.success('黑名单已更新')}
 *   onError={(error) => toast.error(error)}
 * />
 * ```
 */
export function BlacklistSection({
  onSaveSuccess,
  onError,
}: BlacklistSectionProps): React.ReactElement {
  const { t } = useTranslation();
  const { settings, isLoading, error, updateSetting } = useSettings();
  const [newPattern, setNewPattern] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  /**
   * 处理添加新模式 (AC1)
   */
  const handleAddPattern = async () => {
    // 清除之前的错误
    setValidationError(null);

    // 验证输入
    const trimmed = newPattern.trim();
    if (!trimmed) {
      setValidationError(t('settings.blacklist.validation.required'));
      return;
    }

    // 验证模式格式
    if (!isValidPattern(trimmed)) {
      setValidationError(t('settings.blacklist.validation.invalid'));
      return;
    }

    // 规范化模式
    const normalized = normalizePattern(trimmed);

    // 检查重复
    if (settings.blacklistUrls.includes(normalized)) {
      setValidationError(t('settings.blacklist.validation.duplicate'));
      return;
    }

    // 添加到列表
    const updated = [...settings.blacklistUrls, normalized];
    const result = await updateSetting('blacklistUrls', updated);

    if (result.success) {
      setNewPattern('');
      onSaveSuccess?.();
    } else {
      onError?.(result.error?.message ?? t('analysis.toast.saveFailed'));
    }
  };

  /**
   * 处理删除模式 (AC2)
   */
  const handleRemovePattern = async (pattern: string) => {
    const updated = settings.blacklistUrls.filter((p) => p !== pattern);
    const result = await updateSetting('blacklistUrls', updated);

    if (result.success) {
      onSaveSuccess?.();
    } else {
      onError?.(result.error?.message ?? t('analysis.toast.saveFailed'));
    }
  };

  /**
   * 处理重置为默认值
   */
  const handleResetDefaults = async () => {
    const defaultPatterns = [...DEFAULT_SETTINGS.blacklistUrls];
    const result = await updateSetting('blacklistUrls', defaultPatterns);

    if (result.success) {
      onSaveSuccess?.();
    } else {
      onError?.(result.error?.message ?? t('analysis.toast.saveFailed'));
    }
  };

  /**
   * 处理输入框按键
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddPattern();
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
        <AlertCircle className="w-8 h-8 mb-3" />
        <p className="text-sm mb-2">{t('common.error')}</p>
        <p className="text-xs text-gray-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 说明信息 */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <p>{t('settings.blacklist.description')}</p>
            <p>{t('settings.blacklist.wildcardHelp')}</p>
          </div>
        </div>
      </div>

      {/* 添加新模式 (AC1) */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
          {t('settings.blacklist.addSite')}
        </h3>

        <div className="flex gap-2">
          <input
            type="text"
            value={newPattern}
            onChange={(e) => {
              setNewPattern(e.target.value);
              setValidationError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder={t('settings.blacklist.placeholder')}
            className={`
              flex-1 px-3 py-2 text-sm
              bg-gray-50 dark:bg-gray-900
              border rounded-md
              placeholder-gray-400 dark:placeholder-gray-500
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              ${validationError
                ? 'border-red-300 dark:border-red-600'
                : 'border-gray-200 dark:border-gray-600'
              }
            `}
            data-testid="pattern-input"
          />
          <button
            onClick={handleAddPattern}
            className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors flex items-center gap-1"
            aria-label={t('common.add')}
            data-testid="add-pattern-button"
          >
            <Plus className="w-4 h-4" />
            <span className="sr-only sm:not-sr-only text-sm">{t('common.add')}</span>
          </button>
        </div>

        {/* 验证错误提示 */}
        {validationError && (
          <p className="mt-2 text-xs text-red-500 flex items-center gap-1" data-testid="validation-error">
            <AlertCircle className="w-3 h-3" />
            {validationError}
          </p>
        )}
      </div>

      {/* 黑名单列表 (AC4 显示预设 + 用户添加) */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t('settings.blacklist.list', { count: settings.blacklistUrls.length })}
          </h3>
          <button
            onClick={handleResetDefaults}
            className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1 transition-colors"
            title={t('settings.blacklist.resetDefault')}
            data-testid="reset-defaults-button"
          >
            <RotateCcw className="w-3 h-3" />
            {t('settings.blacklist.resetDefault')}
          </button>
        </div>

        {/* 空状态 */}
        {settings.blacklistUrls.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">
            <p>{t('settings.blacklist.empty')}</p>
            <p className="text-xs mt-1">{t('settings.blacklist.emptyHint')}</p>
          </div>
        ) : (
          <ul className="space-y-2" data-testid="blacklist-list">
            {settings.blacklistUrls.map((pattern) => (
              <li
                key={pattern}
                className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-900 rounded-md group"
                data-testid={`blacklist-item-${pattern}`}
              >
                <code className="text-sm text-gray-700 dark:text-gray-300 font-mono">
                  {pattern}
                </code>
                <button
                  onClick={() => handleRemovePattern(pattern)}
                  className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={`${t('common.delete')} ${pattern}`}
                  data-testid={`remove-pattern-${pattern}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default BlacklistSection;
