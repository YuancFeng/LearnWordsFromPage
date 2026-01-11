/**
 * LingoRecall AI - useSettings Hook Tests
 * Story 4.2 - Task 3: useSettings Hook 测试
 *
 * @module hooks/useSettings.test
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSettings } from './useSettings';
import { DEFAULT_SETTINGS, type Settings } from '../shared/types/settings';
import { STORAGE_KEYS } from '../shared/storage/config';

// Mock chrome.storage
const mockStorage: Record<string, unknown> = {};
const storageChangeListeners: Array<(changes: Record<string, { newValue?: unknown; oldValue?: unknown }>) => void> = [];

const mockChrome = {
  storage: {
    local: {
      set: vi.fn(async (items: Record<string, unknown>) => {
        Object.assign(mockStorage, items);
        // 触发 storage change 事件
        const changes: Record<string, { newValue?: unknown; oldValue?: unknown }> = {};
        Object.keys(items).forEach((key) => {
          changes[key] = { newValue: items[key] };
        });
        storageChangeListeners.forEach((listener) => listener(changes));
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
    },
    onChanged: {
      addListener: vi.fn((callback: (changes: Record<string, { newValue?: unknown; oldValue?: unknown }>) => void) => {
        storageChangeListeners.push(callback);
      }),
      removeListener: vi.fn((callback: (changes: Record<string, { newValue?: unknown; oldValue?: unknown }>) => void) => {
        const index = storageChangeListeners.indexOf(callback);
        if (index > -1) {
          storageChangeListeners.splice(index, 1);
        }
      }),
    },
  },
};

vi.stubGlobal('chrome', mockChrome);

describe('useSettings Hook - Story 4.2 Task 3', () => {
  beforeEach(() => {
    // 清理 mock 存储和 listeners
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    storageChangeListeners.length = 0;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('初始化', () => {
    it('应该初始加载默认设置', async () => {
      const { result } = renderHook(() => useSettings());

      // 等待加载完成
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.settings).toEqual(expect.objectContaining({
        enableDoubleClick: DEFAULT_SETTINGS.enableDoubleClick,
        enableHoverIcon: DEFAULT_SETTINGS.enableHoverIcon,
        reviewReminder: DEFAULT_SETTINGS.reviewReminder,
        theme: DEFAULT_SETTINGS.theme,
      }));
    });

    it('应该加载已保存的设置', async () => {
      const savedSettings: Settings = {
        enableDoubleClick: false,
        enableHoverIcon: true,
        reviewReminder: false,
        theme: 'dark',
        blacklistUrls: [],
      };
      mockStorage[STORAGE_KEYS.SETTINGS] = savedSettings;

      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.settings.enableDoubleClick).toBe(false);
      expect(result.current.settings.theme).toBe('dark');
    });

    it('应该设置 isLoading 为 true 初始化时', () => {
      const { result } = renderHook(() => useSettings());
      // 初始状态应该是 loading
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('updateSetting', () => {
    it('应该更新单个设置 - enableDoubleClick', async () => {
      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateSetting('enableDoubleClick', false);
      });

      expect(result.current.settings.enableDoubleClick).toBe(false);
    });

    it('应该更新单个设置 - theme', async () => {
      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateSetting('theme', 'dark');
      });

      expect(result.current.settings.theme).toBe('dark');
    });

    it('应该更新单个设置 - enableHoverIcon', async () => {
      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateSetting('enableHoverIcon', false);
      });

      expect(result.current.settings.enableHoverIcon).toBe(false);
    });

    it('应该更新单个设置 - reviewReminder', async () => {
      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateSetting('reviewReminder', false);
      });

      expect(result.current.settings.reviewReminder).toBe(false);
    });

    it('应该返回成功结果', async () => {
      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let updateResult;
      await act(async () => {
        updateResult = await result.current.updateSetting('enableDoubleClick', false);
      });

      expect(updateResult).toEqual({ success: true });
    });

    it('应该保持其他设置不变', async () => {
      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const originalTheme = result.current.settings.theme;

      await act(async () => {
        await result.current.updateSetting('enableDoubleClick', false);
      });

      expect(result.current.settings.theme).toBe(originalTheme);
    });
  });

  describe('reloadSettings', () => {
    it('应该重新加载设置', async () => {
      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 直接修改 storage
      mockStorage[STORAGE_KEYS.SETTINGS] = {
        ...DEFAULT_SETTINGS,
        theme: 'dark',
      };

      await act(async () => {
        await result.current.reloadSettings();
      });

      expect(result.current.settings.theme).toBe('dark');
    });
  });

  describe('storage change listener', () => {
    it('应该注册 storage change listener', async () => {
      renderHook(() => useSettings());

      await waitFor(() => {
        expect(mockChrome.storage.onChanged.addListener).toHaveBeenCalled();
      });
    });

    it('应该在 unmount 时移除 listener', async () => {
      const { unmount } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(mockChrome.storage.onChanged.addListener).toHaveBeenCalled();
      });

      unmount();

      expect(mockChrome.storage.onChanged.removeListener).toHaveBeenCalled();
    });

    it('应该响应 storage 变化', async () => {
      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 模拟其他 context 修改设置
      const newSettings = {
        ...DEFAULT_SETTINGS,
        theme: 'light' as const,
      };

      act(() => {
        storageChangeListeners.forEach((listener) => {
          listener({
            [STORAGE_KEYS.SETTINGS]: {
              newValue: newSettings,
            },
          });
        });
      });

      expect(result.current.settings.theme).toBe('light');
    });
  });

  describe('error handling', () => {
    it('应该处理 storage 读取错误', async () => {
      mockChrome.storage.local.get.mockRejectedValueOnce(new Error('Read failed'));

      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
    });

    it('应该处理 storage 保存错误', async () => {
      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockChrome.storage.local.set.mockRejectedValueOnce(new Error('Save failed'));

      await act(async () => {
        const updateResult = await result.current.updateSetting('theme', 'dark');
        expect(updateResult.success).toBe(false);
      });
    });
  });
});
