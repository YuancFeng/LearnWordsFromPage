/**
 * LingoRecall AI - Config Storage Tests
 * Story 4.1 实现 - 单元测试
 *
 * 测试 chrome.storage.local 存储操作
 *
 * @module shared/storage/config.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveApiKey,
  getApiKey,
  clearApiKey,
  maskApiKey,
  getSettings,
  saveSettings,
  STORAGE_KEYS,
} from './config';
import { DEFAULT_SETTINGS, type Settings } from '../types/settings';

// Mock chrome.storage.local
const mockStorage: Record<string, unknown> = {};

const mockChrome = {
  storage: {
    local: {
      set: vi.fn(async (items: Record<string, unknown>) => {
        Object.assign(mockStorage, items);
      }),
      get: vi.fn(async (keys: string | string[]) => {
        const keyArray = Array.isArray(keys) ? keys : [keys];
        const result: Record<string, unknown> = {};
        keyArray.forEach((key) => {
          if (mockStorage[key] !== undefined) {
            result[key] = mockStorage[key];
          }
        });
        return result;
      }),
      remove: vi.fn(async (keys: string | string[]) => {
        const keyArray = Array.isArray(keys) ? keys : [keys];
        keyArray.forEach((key) => {
          delete mockStorage[key];
        });
      }),
    },
  },
};

// 设置全局 chrome 对象
vi.stubGlobal('chrome', mockChrome);

describe('Config Storage - Story 4.1', () => {
  beforeEach(() => {
    // 清理 mock 存储
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    vi.clearAllMocks();
  });

  describe('STORAGE_KEYS', () => {
    it('应该定义正确的存储键名', () => {
      expect(STORAGE_KEYS.API_KEY).toBe('lingorecall_api_key');
      expect(STORAGE_KEYS.SETTINGS).toBe('lingorecall_settings');
    });
  });

  describe('maskApiKey', () => {
    it('应该正确遮蔽 API Key - 标准格式', () => {
      const key = 'sk-1234567890abcdef';
      const masked = maskApiKey(key);
      expect(masked).toBe('sk-****cdef');
    });

    it('应该正确遮蔽 API Key - Gemini 格式', () => {
      const key = 'AIzaSyC1234567890abcdefghij';
      const masked = maskApiKey(key);
      expect(masked).toBe('AIz****ghij');
    });

    it('应该处理短于8字符的 Key', () => {
      expect(maskApiKey('abc')).toBe('****');
      expect(maskApiKey('ab12345')).toBe('****');
    });

    it('应该处理空字符串', () => {
      expect(maskApiKey('')).toBe('****');
    });

    it('应该处理 null/undefined', () => {
      expect(maskApiKey(null as unknown as string)).toBe('****');
      expect(maskApiKey(undefined as unknown as string)).toBe('****');
    });

    it('应该精确显示前3个和后4个字符', () => {
      const key = '12345678';
      const masked = maskApiKey(key);
      expect(masked).toBe('123****5678');
    });
  });

  describe('saveApiKey - AC1', () => {
    it('应该成功保存 API Key', async () => {
      const key = 'AIzaSyTestApiKey12345678';
      const result = await saveApiKey(key);

      expect(result.success).toBe(true);
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        [STORAGE_KEYS.API_KEY]: key,
      });
    });

    it('应该返回错误响应当存储失败', async () => {
      mockChrome.storage.local.set.mockRejectedValueOnce(new Error('Storage full'));

      const result = await saveApiKey('test-key');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('STORAGE_ERROR');
      expect(result.error?.message).toContain('Storage full');
    });

    it('应该拒绝空 API Key', async () => {
      const result = await saveApiKey('');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_INPUT');
    });

    it('应该拒绝空白 API Key', async () => {
      const result = await saveApiKey('   ');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_INPUT');
    });
  });

  describe('getApiKey - AC2', () => {
    it('应该返回保存的 API Key', async () => {
      const key = 'AIzaSyTestApiKey12345678';
      mockStorage[STORAGE_KEYS.API_KEY] = key;

      const result = await getApiKey();

      expect(result.success).toBe(true);
      expect(result.data).toBe(key);
    });

    it('应该返回 null 当没有保存的 Key', async () => {
      const result = await getApiKey();

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('应该返回错误响应当读取失败', async () => {
      mockChrome.storage.local.get.mockRejectedValueOnce(new Error('Read failed'));

      const result = await getApiKey();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('STORAGE_ERROR');
    });
  });

  describe('clearApiKey - AC3', () => {
    it('应该成功清除 API Key', async () => {
      mockStorage[STORAGE_KEYS.API_KEY] = 'test-key';

      const result = await clearApiKey();

      expect(result.success).toBe(true);
      expect(mockChrome.storage.local.remove).toHaveBeenCalledWith(STORAGE_KEYS.API_KEY);
    });

    it('应该返回错误响应当删除失败', async () => {
      mockChrome.storage.local.remove.mockRejectedValueOnce(new Error('Delete failed'));

      const result = await clearApiKey();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('STORAGE_ERROR');
    });

    it('清除不存在的 Key 应该成功', async () => {
      // 确保没有 key
      delete mockStorage[STORAGE_KEYS.API_KEY];

      const result = await clearApiKey();

      expect(result.success).toBe(true);
    });
  });

  describe('集成测试 - 保存后读取', () => {
    it('应该能保存然后读取 API Key', async () => {
      const key = 'AIzaSyIntegrationTest12345';

      // 保存
      const saveResult = await saveApiKey(key);
      expect(saveResult.success).toBe(true);

      // 读取
      const getResult = await getApiKey();
      expect(getResult.success).toBe(true);
      expect(getResult.data).toBe(key);
    });

    it('应该能保存、清除、然后确认为空', async () => {
      const key = 'AIzaSyTestClearFlow12345';

      // 保存
      await saveApiKey(key);

      // 验证保存成功
      let getResult = await getApiKey();
      expect(getResult.data).toBe(key);

      // 清除
      await clearApiKey();

      // 验证已清除
      getResult = await getApiKey();
      expect(getResult.data).toBeNull();
    });
  });
});

// ============================================================
// Story 4.2 - Settings Storage Tests
// ============================================================

describe('Settings Storage - Story 4.2', () => {
  beforeEach(() => {
    // 清理 mock 存储
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    vi.clearAllMocks();
  });

  describe('getSettings - AC4', () => {
    it('应该在没有保存设置时返回默认值', async () => {
      const result = await getSettings();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.enableDoubleClick).toBe(DEFAULT_SETTINGS.enableDoubleClick);
      expect(result.data?.enableHoverIcon).toBe(DEFAULT_SETTINGS.enableHoverIcon);
      expect(result.data?.reviewReminder).toBe(DEFAULT_SETTINGS.reviewReminder);
      expect(result.data?.theme).toBe(DEFAULT_SETTINGS.theme);
    });

    it('应该返回保存的设置', async () => {
      const savedSettings: Settings = {
        ...DEFAULT_SETTINGS,
        enableDoubleClick: false,
        enableHoverIcon: true,
        reviewReminder: false,
        theme: 'dark',
        blacklistUrls: ['*.example.com'],
      };
      mockStorage[STORAGE_KEYS.SETTINGS] = savedSettings;

      const result = await getSettings();

      expect(result.success).toBe(true);
      expect(result.data?.enableDoubleClick).toBe(false);
      expect(result.data?.theme).toBe('dark');
      expect(result.data?.blacklistUrls).toContain('*.example.com');
    });

    it('应该合并部分设置与默认值', async () => {
      // 只保存部分设置
      const partialSettings = {
        enableDoubleClick: false,
        theme: 'light',
      };
      mockStorage[STORAGE_KEYS.SETTINGS] = partialSettings;

      const result = await getSettings();

      expect(result.success).toBe(true);
      expect(result.data?.enableDoubleClick).toBe(false);
      expect(result.data?.theme).toBe('light');
      // 未保存的字段应使用默认值
      expect(result.data?.enableHoverIcon).toBe(DEFAULT_SETTINGS.enableHoverIcon);
      expect(result.data?.reviewReminder).toBe(DEFAULT_SETTINGS.reviewReminder);
    });

    it('应该返回错误响应当读取失败', async () => {
      mockChrome.storage.local.get.mockRejectedValueOnce(new Error('Read failed'));

      const result = await getSettings();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('STORAGE_ERROR');
    });
  });

  describe('saveSettings - AC1, AC2, AC3', () => {
    it('应该成功保存部分设置', async () => {
      const result = await saveSettings({ enableDoubleClick: false });

      expect(result.success).toBe(true);
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });

    it('应该合并新设置与现有设置', async () => {
      // 先保存一些设置
      mockStorage[STORAGE_KEYS.SETTINGS] = {
        enableDoubleClick: true,
        theme: 'dark',
        enableHoverIcon: true,
        reviewReminder: true,
        blacklistUrls: [],
      };

      // 更新部分设置
      await saveSettings({ enableDoubleClick: false });

      // 验证调用了正确的合并结果
      const lastCall = mockChrome.storage.local.set.mock.calls[0][0];
      const savedSettings = lastCall[STORAGE_KEYS.SETTINGS] as Settings;

      expect(savedSettings.enableDoubleClick).toBe(false);
      expect(savedSettings.theme).toBe('dark'); // 保持原值
    });

    it('应该返回错误响应当保存失败', async () => {
      mockChrome.storage.local.set.mockRejectedValueOnce(new Error('Storage full'));

      const result = await saveSettings({ theme: 'light' });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('STORAGE_ERROR');
    });

    it('应该处理 theme 设置变更 - AC3', async () => {
      const result = await saveSettings({ theme: 'dark' });

      expect(result.success).toBe(true);

      const lastCall = mockChrome.storage.local.set.mock.calls[0][0];
      expect((lastCall[STORAGE_KEYS.SETTINGS] as Settings).theme).toBe('dark');
    });

    it('应该处理 enableDoubleClick 设置变更 - AC1', async () => {
      const result = await saveSettings({ enableDoubleClick: false });

      expect(result.success).toBe(true);

      const lastCall = mockChrome.storage.local.set.mock.calls[0][0];
      expect((lastCall[STORAGE_KEYS.SETTINGS] as Settings).enableDoubleClick).toBe(false);
    });

    it('应该处理 enableHoverIcon 设置变更 - AC2', async () => {
      const result = await saveSettings({ enableHoverIcon: false });

      expect(result.success).toBe(true);

      const lastCall = mockChrome.storage.local.set.mock.calls[0][0];
      expect((lastCall[STORAGE_KEYS.SETTINGS] as Settings).enableHoverIcon).toBe(false);
    });
  });

  describe('Settings 集成测试', () => {
    it('应该能保存然后读取设置', async () => {
      // 保存设置
      await saveSettings({ enableDoubleClick: false, theme: 'dark' });

      // 读取设置
      const result = await getSettings();

      expect(result.success).toBe(true);
      expect(result.data?.enableDoubleClick).toBe(false);
      expect(result.data?.theme).toBe('dark');
    });

    it('应该能多次更新设置', async () => {
      // 第一次更新
      await saveSettings({ enableDoubleClick: false });

      // 第二次更新
      await saveSettings({ theme: 'light' });

      // 读取
      const result = await getSettings();

      expect(result.success).toBe(true);
      expect(result.data?.enableDoubleClick).toBe(false);
      expect(result.data?.theme).toBe('light');
    });
  });
});
