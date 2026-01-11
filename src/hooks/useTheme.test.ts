/**
 * LingoRecall AI - useTheme Hook Tests
 * Story 4.2 - Task 5: useTheme Hook 测试
 *
 * @module hooks/useTheme.test
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useTheme } from './useTheme';
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

// Mock matchMedia
const mockMatchMediaState = { value: false };
const mockMatchMediaListeners: Array<(e: { matches: boolean }) => void> = [];

// 创建 mock matchMedia 函数
function createMockMatchMedia(query: string) {
  return {
    get matches() {
      return mockMatchMediaState.value;
    },
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn((event: string, callback: (e: { matches: boolean }) => void) => {
      if (event === 'change') {
        mockMatchMediaListeners.push(callback);
      }
    }),
    removeEventListener: vi.fn((event: string, callback: (e: { matches: boolean }) => void) => {
      if (event === 'change') {
        const index = mockMatchMediaListeners.indexOf(callback);
        if (index > -1) {
          mockMatchMediaListeners.splice(index, 1);
        }
      }
    }),
    dispatchEvent: vi.fn(),
  };
}

// 设置全局 mock
vi.stubGlobal('matchMedia', vi.fn(createMockMatchMedia));

describe('useTheme Hook - Story 4.2 Task 5', () => {
  beforeEach(() => {
    // 清理
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    storageChangeListeners.length = 0;
    mockMatchMediaListeners.length = 0;
    mockMatchMediaState.value = false;
    document.documentElement.classList.remove('light', 'dark');
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('初始化', () => {
    it('应该在 system 主题且系统为浅色时返回 light', async () => {
      mockMatchMediaState.value = false; // 浅色模式
      mockStorage[STORAGE_KEYS.SETTINGS] = { ...DEFAULT_SETTINGS, theme: 'system' };

      const { result } = renderHook(() => useTheme());

      await waitFor(() => {
        expect(result.current.resolvedTheme).toBe('light');
      });
    });

    it('应该在 system 主题且系统为深色时返回 dark', async () => {
      mockMatchMediaState.value = true; // 深色模式
      mockStorage[STORAGE_KEYS.SETTINGS] = { ...DEFAULT_SETTINGS, theme: 'system' };

      const { result } = renderHook(() => useTheme());

      await waitFor(() => {
        expect(result.current.resolvedTheme).toBe('dark');
      });
    });

    it('应该在 light 主题时返回 light', async () => {
      mockStorage[STORAGE_KEYS.SETTINGS] = { ...DEFAULT_SETTINGS, theme: 'light' };

      const { result } = renderHook(() => useTheme());

      await waitFor(() => {
        expect(result.current.resolvedTheme).toBe('light');
      });
    });

    it('应该在 dark 主题时返回 dark', async () => {
      mockStorage[STORAGE_KEYS.SETTINGS] = { ...DEFAULT_SETTINGS, theme: 'dark' };

      const { result } = renderHook(() => useTheme());

      await waitFor(() => {
        expect(result.current.resolvedTheme).toBe('dark');
      });
    });
  });

  describe('DOM class 应用', () => {
    it('应该给 document.documentElement 添加 light class', async () => {
      mockStorage[STORAGE_KEYS.SETTINGS] = { ...DEFAULT_SETTINGS, theme: 'light' };

      renderHook(() => useTheme());

      await waitFor(() => {
        expect(document.documentElement.classList.contains('light')).toBe(true);
      });
    });

    it('应该给 document.documentElement 添加 dark class', async () => {
      mockStorage[STORAGE_KEYS.SETTINGS] = { ...DEFAULT_SETTINGS, theme: 'dark' };

      renderHook(() => useTheme());

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });
    });

    it('应该在切换主题时移除旧 class', async () => {
      mockStorage[STORAGE_KEYS.SETTINGS] = { ...DEFAULT_SETTINGS, theme: 'light' };

      const { result } = renderHook(() => useTheme());

      await waitFor(() => {
        expect(document.documentElement.classList.contains('light')).toBe(true);
      });

      await act(async () => {
        await result.current.setTheme('dark');
      });

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        expect(document.documentElement.classList.contains('light')).toBe(false);
      });
    });
  });

  describe('setTheme', () => {
    it('应该更新主题设置', async () => {
      mockStorage[STORAGE_KEYS.SETTINGS] = { ...DEFAULT_SETTINGS, theme: 'light' };

      const { result } = renderHook(() => useTheme());

      await waitFor(() => {
        expect(result.current.theme).toBe('light');
      });

      await act(async () => {
        await result.current.setTheme('dark');
      });

      await waitFor(() => {
        expect(result.current.theme).toBe('dark');
      });
    });
  });

  describe('系统主题变化响应', () => {
    it('应该响应系统主题变化', async () => {
      mockMatchMediaState.value = false;
      mockStorage[STORAGE_KEYS.SETTINGS] = { ...DEFAULT_SETTINGS, theme: 'system' };

      const { result } = renderHook(() => useTheme());

      await waitFor(() => {
        expect(result.current.resolvedTheme).toBe('light');
      });

      // 模拟系统主题变化
      act(() => {
        mockMatchMediaState.value = true;
        mockMatchMediaListeners.forEach((listener) => {
          listener({ matches: true });
        });
      });

      await waitFor(() => {
        expect(result.current.resolvedTheme).toBe('dark');
      });
    });
  });
});
