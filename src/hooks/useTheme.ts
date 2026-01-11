/**
 * LingoRecall AI - useTheme Hook
 * Story 4.2 - Task 5: 主题管理
 *
 * 管理 UI 主题：
 * - 支持 light / dark / system 三种模式
 * - 自动检测系统偏好并响应变化
 * - 应用主题 class 到 document.documentElement
 *
 * @module hooks/useTheme
 */

import { useState, useEffect, useCallback } from 'react';
import { useSettings } from './useSettings';
import type { ThemeType } from '../shared/types/settings';

// ============================================================
// Types
// ============================================================

/**
 * 解析后的实际主题 (排除 system)
 */
export type ResolvedTheme = 'light' | 'dark';

/**
 * useTheme Hook 返回类型
 */
export interface UseThemeReturn {
  /** 当前主题设置 (可能是 system) */
  theme: ThemeType;
  /** 解析后的实际主题 (light 或 dark) */
  resolvedTheme: ResolvedTheme;
  /** 设置主题 */
  setTheme: (theme: ThemeType) => Promise<void>;
  /** 是否正在加载 */
  isLoading: boolean;
}

// ============================================================
// Hook Implementation
// ============================================================

/**
 * 主题管理 Hook
 * Story 4.2 - AC3
 *
 * @returns {UseThemeReturn} Hook 状态和方法
 *
 * @example
 * ```tsx
 * function App() {
 *   const { theme, resolvedTheme, setTheme } = useTheme();
 *
 *   return (
 *     <div className={resolvedTheme === 'dark' ? 'dark-mode' : 'light-mode'}>
 *       <ThemeSelect value={theme} onChange={setTheme} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useTheme(): UseThemeReturn {
  const { settings, isLoading, updateSetting } = useSettings();

  // 解析后的实际主题
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');

  /**
   * 获取系统偏好主题
   */
  const getSystemTheme = useCallback((): ResolvedTheme => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }, []);

  /**
   * 根据设置计算实际主题
   */
  const computeResolvedTheme = useCallback(
    (themePreference: ThemeType): ResolvedTheme => {
      if (themePreference === 'system') {
        return getSystemTheme();
      }
      return themePreference;
    },
    [getSystemTheme]
  );

  /**
   * 设置主题
   */
  const setTheme = useCallback(
    async (theme: ThemeType): Promise<void> => {
      await updateSetting('theme', theme);
    },
    [updateSetting]
  );

  /**
   * 监听设置变化并更新解析后的主题
   */
  useEffect(() => {
    const newResolvedTheme = computeResolvedTheme(settings.theme);
    setResolvedTheme(newResolvedTheme);
  }, [settings.theme, computeResolvedTheme]);

  /**
   * 监听系统主题变化 (仅在 theme === 'system' 时有效)
   */
  useEffect(() => {
    if (settings.theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setResolvedTheme(e.matches ? 'dark' : 'light');
    };

    // 初始化
    handleChange(mediaQuery);

    // 监听变化
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [settings.theme]);

  /**
   * 应用主题 class 到 document.documentElement
   */
  useEffect(() => {
    // 移除旧的主题 class
    document.documentElement.classList.remove('light', 'dark');
    // 添加新的主题 class
    document.documentElement.classList.add(resolvedTheme);
  }, [resolvedTheme]);

  return {
    theme: settings.theme,
    resolvedTheme,
    setTheme,
    isLoading,
  };
}

export default useTheme;
