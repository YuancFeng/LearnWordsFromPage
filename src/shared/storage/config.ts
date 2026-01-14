/**
 * LingoRecall AI - Config Storage Layer
 * Story 4.1 实现 - AC1, AC2, AC3: API Key 存储管理
 * Story 4.2 实现 - Settings 存储管理
 *
 * 使用 chrome.storage.local 存储配置数据
 * API Key 仅存储在本地，不进行网络传输
 *
 * @module shared/storage/config
 */

import type { Response } from '../messaging/types';
import { ErrorCode } from '../types/errors';
import { type Settings, DEFAULT_SETTINGS, mergeWithDefaults } from '../types/settings';

// ============================================================
// Storage Keys
// ============================================================

/**
 * chrome.storage.local 存储键名
 */
export const STORAGE_KEYS = {
  /** API Key 存储键 */
  API_KEY: 'lingorecall_api_key',
  /** 用户设置存储键 */
  SETTINGS: 'lingorecall_settings',
} as const;

// ============================================================
// API Key Masking
// ============================================================

/**
 * 遮蔽 API Key 显示
 * Story 4.1 - AC2: 显示遮蔽格式 (e.g., `sk-****xxxx`)
 *
 * @param key - 原始 API Key
 * @returns 遮蔽后的字符串
 *
 * @example
 * maskApiKey('sk-1234567890abcdef') // 'sk-****cdef'
 * maskApiKey('AIzaSyC12345678') // 'AIz****5678'
 */
export function maskApiKey(key: string): string {
  // 处理 null/undefined/空字符串
  if (!key || key.length < 8) {
    return '****';
  }

  const prefix = key.slice(0, 3); // 前3个字符
  const suffix = key.slice(-4); // 后4个字符
  return `${prefix}****${suffix}`;
}

// ============================================================
// API Key Storage Operations
// ============================================================

/**
 * 保存 API Key 到 chrome.storage.local
 * Story 4.1 - AC1: 存储 API Key
 *
 * @param key - 要保存的 API Key
 * @returns Promise<Response<void>> 操作结果
 */
export async function saveApiKey(key: string): Promise<Response<void>> {
  // 验证输入
  if (!key || !key.trim()) {
    return {
      success: false,
      error: {
        code: ErrorCode.INVALID_INPUT,
        message: 'API Key cannot be empty',
      },
    };
  }

  try {
    await chrome.storage.local.set({
      [STORAGE_KEYS.API_KEY]: key.trim(),
    });

    console.log('[LingoRecall] API Key saved successfully');
    return { success: true };
  } catch (error) {
    console.error('[LingoRecall] Failed to save API Key:', error);
    return {
      success: false,
      error: {
        code: ErrorCode.STORAGE_ERROR,
        message: error instanceof Error ? error.message : 'Unknown storage error',
      },
    };
  }
}

/**
 * 读取保存的 API Key
 * Story 4.1 - AC2: 读取已保存的 Key
 *
 * @returns Promise<Response<string | null>> API Key 或 null
 */
export async function getApiKey(): Promise<Response<string | null>> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.API_KEY);
    const apiKey = (result[STORAGE_KEYS.API_KEY] as string | undefined) || null;

    return {
      success: true,
      data: apiKey,
    };
  } catch (error) {
    console.error('[LingoRecall] Failed to get API Key:', error);
    return {
      success: false,
      error: {
        code: ErrorCode.STORAGE_ERROR,
        message: error instanceof Error ? error.message : 'Unknown storage error',
      },
    };
  }
}

/**
 * 清除保存的 API Key
 * Story 4.1 - AC3: 删除 API Key
 *
 * @returns Promise<Response<void>> 操作结果
 */
export async function clearApiKey(): Promise<Response<void>> {
  try {
    await chrome.storage.local.remove(STORAGE_KEYS.API_KEY);

    console.log('[LingoRecall] API Key cleared successfully');
    return { success: true };
  } catch (error) {
    console.error('[LingoRecall] Failed to clear API Key:', error);
    return {
      success: false,
      error: {
        code: ErrorCode.STORAGE_ERROR,
        message: error instanceof Error ? error.message : 'Unknown storage error',
      },
    };
  }
}

// ============================================================
// AI Config Types (for future expansion)
// ============================================================

/**
 * AI 配置接口
 * 用于未来扩展多 Provider 支持
 */
export interface AIConfig {
  /** API Key */
  apiKey: string;
  /** AI Provider 类型 */
  provider: 'gemini' | 'cli-proxy' | 'ollama' | 'custom';
  /** 模型名称 (可选) */
  model?: string;
}

// ============================================================
// Settings Storage Operations - Story 4.2
// ============================================================

/**
 * 读取用户设置
 * Story 4.2 - AC4: 读取保存的设置或返回默认值
 *
 * @returns Promise<Response<Settings>> 设置对象
 */
export async function getSettings(): Promise<Response<Settings>> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    const storedSettings = result[STORAGE_KEYS.SETTINGS];

    // 使用 mergeWithDefaults 确保所有字段都有值
    const settings = mergeWithDefaults(storedSettings);

    return {
      success: true,
      data: settings,
    };
  } catch (error) {
    console.error('[LingoRecall] Failed to get settings:', error);
    return {
      success: false,
      error: {
        code: ErrorCode.STORAGE_ERROR,
        message: error instanceof Error ? error.message : 'Unknown storage error',
      },
    };
  }
}

/**
 * 广播设置变更到所有标签页的 Content Script
 * Story 4.2 - Task 6: AC1, AC2 设置变更立即生效
 *
 * @param settings - 更新后的设置
 */
async function broadcastSettingsChange(settings: Settings): Promise<void> {
  try {
    // 检查 chrome.tabs API 是否可用（仅在 Service Worker / Popup 中可用）
    if (typeof chrome?.tabs?.query !== 'function') {
      console.log('[LingoRecall] chrome.tabs.query not available, skipping broadcast');
      return;
    }

    const tabs = await chrome.tabs.query({});

    for (const tab of tabs) {
      if (tab.id && tab.url && !tab.url.startsWith('chrome://')) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            type: 'SETTINGS_CHANGED',
            payload: { settings },
          });
          console.log('[LingoRecall] Settings broadcast to tab:', tab.id);
        } catch {
          // Content script 可能未加载，忽略错误
        }
      }
    }
  } catch (error) {
    console.error('[LingoRecall] Failed to broadcast settings:', error);
  }
}

/**
 * 保存用户设置（部分更新）
 * Story 4.2 - AC1, AC2, AC3: 保存设置变更
 *
 * @param partialSettings - 要更新的部分设置
 * @returns Promise<Response<void>> 操作结果
 */
export async function saveSettings(
  partialSettings: Partial<Settings>
): Promise<Response<void>> {
  try {
    // 先获取当前设置
    const currentResult = await getSettings();
    const currentSettings = currentResult.success && currentResult.data
      ? currentResult.data
      : { ...DEFAULT_SETTINGS, blacklistUrls: [...DEFAULT_SETTINGS.blacklistUrls] };

    // 合并新设置
    const updatedSettings: Settings = {
      ...currentSettings,
      ...partialSettings,
    };

    // 保存到 storage
    await chrome.storage.local.set({
      [STORAGE_KEYS.SETTINGS]: updatedSettings,
    });

    console.log('[LingoRecall] Settings saved successfully:', Object.keys(partialSettings));

    // 广播设置变更到所有标签页
    await broadcastSettingsChange(updatedSettings);

    return { success: true };
  } catch (error) {
    console.error('[LingoRecall] Failed to save settings:', error);
    return {
      success: false,
      error: {
        code: ErrorCode.STORAGE_ERROR,
        message: error instanceof Error ? error.message : 'Unknown storage error',
      },
    };
  }
}
