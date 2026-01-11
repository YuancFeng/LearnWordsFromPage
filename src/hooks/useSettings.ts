/**
 * LingoRecall AI - useSettings Hook
 * Story 4.2 - Task 3: Settings 状态管理
 *
 * 管理用户偏好设置的状态和操作
 * 支持实时同步：监听 storage 变化，自动更新状态
 *
 * @module hooks/useSettings
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getSettings as getSettingsFromStorage,
  saveSettings as saveSettingsToStorage,
  STORAGE_KEYS,
} from '../shared/storage/config';
import { type Settings, DEFAULT_SETTINGS } from '../shared/types/settings';
import type { Response } from '../shared/messaging/types';

// ============================================================
// Hook State Types
// ============================================================

/**
 * useSettings Hook 返回类型
 */
export interface UseSettingsReturn {
  /** 当前设置 */
  settings: Settings;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 错误消息 */
  error: string | null;
  /**
   * 更新单个设置项
   * @param key - 设置项键名
   * @param value - 新值
   * @returns Promise<Response<void>>
   */
  updateSetting: <K extends keyof Settings>(
    key: K,
    value: Settings[K]
  ) => Promise<Response<void>>;
  /** 重新加载设置 */
  reloadSettings: () => Promise<void>;
  /** 清除错误状态 */
  clearError: () => void;
}

// ============================================================
// Hook Implementation
// ============================================================

/**
 * 用户设置管理 Hook
 * Story 4.2 - Task 3
 *
 * @returns {UseSettingsReturn} Hook 状态和方法
 *
 * @example
 * ```tsx
 * function PreferencesSection() {
 *   const { settings, updateSetting, isLoading } = useSettings();
 *
 *   if (isLoading) return <div>Loading...</div>;
 *
 *   return (
 *     <ToggleSwitch
 *       checked={settings.enableDoubleClick}
 *       onChange={(checked) => updateSetting('enableDoubleClick', checked)}
 *     />
 *   );
 * }
 * ```
 */
export function useSettings(): UseSettingsReturn {
  // ============================================================
  // State
  // ============================================================

  /** 当前设置 */
  const [settings, setSettings] = useState<Settings>({
    ...DEFAULT_SETTINGS,
    blacklistUrls: [...DEFAULT_SETTINGS.blacklistUrls],
  });

  /** 初始加载状态 */
  const [isLoading, setIsLoading] = useState(true);

  /** 错误信息 */
  const [error, setError] = useState<string | null>(null);

  // ============================================================
  // Methods
  // ============================================================

  /**
   * 加载设置
   */
  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await getSettingsFromStorage();

    if (result.success && result.data) {
      setSettings(result.data);
    } else {
      setError(result.error?.message ?? 'Failed to load settings');
    }

    setIsLoading(false);
  }, []);

  /**
   * 更新单个设置项
   * Story 4.2 - AC1, AC2, AC3
   */
  const updateSetting = useCallback(async <K extends keyof Settings>(
    key: K,
    value: Settings[K]
  ): Promise<Response<void>> => {
    setError(null);

    const result = await saveSettingsToStorage({ [key]: value });

    if (result.success) {
      // 乐观更新本地状态
      setSettings((prev) => ({ ...prev, [key]: value }));
    } else {
      setError(result.error?.message ?? 'Failed to save settings');
    }

    return result;
  }, []);

  /**
   * 重新加载设置
   */
  const reloadSettings = useCallback(async () => {
    await loadSettings();
  }, [loadSettings]);

  /**
   * 清除错误状态
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ============================================================
  // Effects
  // ============================================================

  /**
   * 组件挂载时加载设置
   */
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  /**
   * 监听 storage 变化
   * 当其他 context (如 Service Worker、其他 Tab) 修改设置时同步
   */
  useEffect(() => {
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange }
    ) => {
      if (changes[STORAGE_KEYS.SETTINGS]) {
        const newSettings = changes[STORAGE_KEYS.SETTINGS].newValue as Settings | undefined;
        if (newSettings) {
          setSettings(newSettings);
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  // ============================================================
  // Return
  // ============================================================

  return {
    settings,
    isLoading,
    error,
    updateSetting,
    reloadSettings,
    clearError,
  };
}

export default useSettings;
