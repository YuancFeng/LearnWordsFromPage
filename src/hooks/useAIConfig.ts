/**
 * LingoRecall AI - useAIConfig Hook
 * Story 4.1 实现 - AC1, AC2, AC3: API Key 配置管理
 *
 * 管理 AI API Key 的状态和操作
 *
 * @module hooks/useAIConfig
 */

import { useState, useEffect, useCallback } from 'react';
import {
  saveApiKey as saveApiKeyToStorage,
  getApiKey as getApiKeyFromStorage,
  clearApiKey as clearApiKeyFromStorage,
  maskApiKey,
} from '../shared/storage/config';
import type { Response } from '../shared/messaging/types';

// ============================================================
// Hook State Types
// ============================================================

/**
 * useAIConfig Hook 返回类型
 */
export interface UseAIConfigReturn {
  /** 完整 API Key (仅内部使用) */
  apiKey: string | null;
  /** 遮蔽格式的 API Key */
  maskedKey: string;
  /** 根据 showKey 返回的显示值 */
  displayValue: string;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 是否正在保存 */
  isSaving: boolean;
  /** 错误消息 */
  error: string | null;
  /** 是否显示完整 Key */
  showKey: boolean;
  /** 是否已配置 Key */
  hasKey: boolean;
  /** 切换显示/隐藏 Key */
  toggleShowKey: () => void;
  /** 保存 API Key */
  saveKey: (key: string) => Promise<Response<void>>;
  /** 清除 API Key */
  clearKey: () => Promise<Response<void>>;
  /** 清除错误状态 */
  clearError: () => void;
}

// ============================================================
// Hook Implementation
// ============================================================

/**
 * AI 配置管理 Hook
 * Story 4.1 实现
 *
 * @returns {UseAIConfigReturn} Hook 状态和方法
 *
 * @example
 * ```tsx
 * function APIKeySection() {
 *   const { displayValue, hasKey, saveKey, clearKey, toggleShowKey } = useAIConfig();
 *
 *   return (
 *     <div>
 *       <input value={displayValue} disabled={hasKey} />
 *       <button onClick={toggleShowKey}>Toggle</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAIConfig(): UseAIConfigReturn {
  // ============================================================
  // State - Task 4.2
  // ============================================================

  /** 完整 API Key */
  const [apiKey, setApiKey] = useState<string | null>(null);
  /** 遮蔽格式的 Key */
  const [maskedKey, setMaskedKey] = useState<string>('');
  /** 初始加载状态 */
  const [isLoading, setIsLoading] = useState(true);
  /** 保存操作状态 */
  const [isSaving, setIsSaving] = useState(false);
  /** 错误信息 */
  const [error, setError] = useState<string | null>(null);
  /** 是否显示完整 Key */
  const [showKey, setShowKey] = useState(false);

  // ============================================================
  // Computed Values
  // ============================================================

  /** 是否已配置 Key */
  const hasKey = apiKey !== null && apiKey.length > 0;

  /** 根据 showKey 返回显示值 */
  const displayValue = showKey ? (apiKey ?? '') : maskedKey;

  // ============================================================
  // Methods - Task 4.3
  // ============================================================

  /**
   * 加载保存的 API Key
   */
  const loadApiKey = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await getApiKeyFromStorage();

    if (result.success) {
      const key = result.data;
      setApiKey(key);
      setMaskedKey(key ? maskApiKey(key) : '');
    } else {
      setError(result.error?.message ?? 'Failed to load API Key');
    }

    setIsLoading(false);
  }, []);

  /**
   * 保存 API Key
   * Story 4.1 - AC1
   */
  const saveKey = useCallback(async (key: string): Promise<Response<void>> => {
    setIsSaving(true);
    setError(null); // 清除之前的错误

    const result = await saveApiKeyToStorage(key);

    if (result.success) {
      setApiKey(key);
      setMaskedKey(maskApiKey(key));
    } else {
      setError(result.error?.message ?? 'Failed to save API Key');
    }

    setIsSaving(false);
    return result;
  }, []);

  /**
   * 清除 API Key
   * Story 4.1 - AC3
   */
  const clearKey = useCallback(async (): Promise<Response<void>> => {
    setIsSaving(true);
    setError(null); // 清除之前的错误

    const result = await clearApiKeyFromStorage();

    if (result.success) {
      setApiKey(null);
      setMaskedKey('');
      setShowKey(false); // 重置显示状态
    } else {
      setError(result.error?.message ?? 'Failed to clear API Key');
    }

    setIsSaving(false);
    return result;
  }, []);

  /**
   * 切换显示/隐藏 Key
   * Story 4.1 - AC2
   */
  const toggleShowKey = useCallback(() => {
    setShowKey((prev) => !prev);
  }, []);

  /**
   * 清除错误状态
   * Task 4.4
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ============================================================
  // Effects
  // ============================================================

  /**
   * 组件挂载时加载 API Key
   */
  useEffect(() => {
    loadApiKey();
  }, [loadApiKey]);

  // ============================================================
  // Return
  // ============================================================

  return {
    apiKey,
    maskedKey,
    displayValue,
    isLoading,
    isSaving,
    error,
    showKey,
    hasKey,
    toggleShowKey,
    saveKey,
    clearKey,
    clearError,
  };
}

export default useAIConfig;
