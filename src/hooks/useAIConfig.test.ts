/**
 * LingoRecall AI - useAIConfig Hook Tests
 * Story 4.1 实现 - Hook 单元测试
 *
 * 测试 AI 配置 Hook 的状态管理和方法
 *
 * @module hooks/useAIConfig.test
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAIConfig } from './useAIConfig';
import * as configStorage from '../shared/storage/config';

// Mock config storage module
vi.mock('../shared/storage/config', () => ({
  saveApiKey: vi.fn(),
  getApiKey: vi.fn(),
  clearApiKey: vi.fn(),
  maskApiKey: vi.fn((key: string) => {
    if (!key || key.length < 8) return '****';
    return `${key.slice(0, 3)}****${key.slice(-4)}`;
  }),
}));

describe('useAIConfig Hook - Story 4.1', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 默认返回空 key
    vi.mocked(configStorage.getApiKey).mockResolvedValue({
      success: true,
      data: null,
    });
    vi.mocked(configStorage.saveApiKey).mockResolvedValue({
      success: true,
    });
    vi.mocked(configStorage.clearApiKey).mockResolvedValue({
      success: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('初始化状态', () => {
    it('应该初始化为 loading 状态', async () => {
      const { result } = renderHook(() => useAIConfig());

      // 初始状态应该是 loading
      expect(result.current.isLoading).toBe(true);

      // 等待加载完成
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('没有保存的 Key 时 hasKey 应该为 false', async () => {
      const { result } = renderHook(() => useAIConfig());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasKey).toBe(false);
      expect(result.current.apiKey).toBeNull();
    });

    it('有保存的 Key 时应该加载并显示遮蔽格式', async () => {
      const savedKey = 'AIzaSyTestKey12345678';
      vi.mocked(configStorage.getApiKey).mockResolvedValue({
        success: true,
        data: savedKey,
      });

      const { result } = renderHook(() => useAIConfig());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasKey).toBe(true);
      expect(result.current.apiKey).toBe(savedKey);
      expect(result.current.maskedKey).toBe('AIz****5678');
    });

    it('加载失败时应该设置错误状态', async () => {
      vi.mocked(configStorage.getApiKey).mockResolvedValue({
        success: false,
        error: { code: 'STORAGE_ERROR', message: 'Failed to load' },
      });

      const { result } = renderHook(() => useAIConfig());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load');
    });
  });

  describe('saveKey 方法 - AC1', () => {
    it('应该成功保存 API Key', async () => {
      const { result } = renderHook(() => useAIConfig());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 保存新 key
      let saveResult: { success: boolean } | undefined;
      await act(async () => {
        saveResult = await result.current.saveKey('NewTestKey12345678');
      });

      expect(saveResult?.success).toBe(true);
      expect(configStorage.saveApiKey).toHaveBeenCalledWith('NewTestKey12345678');
    });

    it('保存后应该更新状态', async () => {
      const newKey = 'NewTestKey12345678';

      const { result } = renderHook(() => useAIConfig());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.saveKey(newKey);
      });

      expect(result.current.hasKey).toBe(true);
      expect(result.current.apiKey).toBe(newKey);
      expect(result.current.maskedKey).toBe('New****5678');
    });

    it('保存失败时应该设置错误状态', async () => {
      vi.mocked(configStorage.saveApiKey).mockResolvedValue({
        success: false,
        error: { code: 'STORAGE_ERROR', message: 'Storage full' },
      });

      const { result } = renderHook(() => useAIConfig());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.saveKey('test-key');
      });

      expect(result.current.error).toBe('Storage full');
    });

    it('保存时应该显示 isSaving 状态', async () => {
      let resolveSave: () => void;
      vi.mocked(configStorage.saveApiKey).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveSave = () => resolve({ success: true });
          })
      );

      const { result } = renderHook(() => useAIConfig());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 开始保存（不等待完成）
      act(() => {
        result.current.saveKey('test-key');
      });

      // 应该显示 saving 状态
      expect(result.current.isSaving).toBe(true);

      // 完成保存
      await act(async () => {
        resolveSave!();
      });

      expect(result.current.isSaving).toBe(false);
    });
  });

  describe('clearKey 方法 - AC3', () => {
    it('应该成功清除 API Key', async () => {
      vi.mocked(configStorage.getApiKey).mockResolvedValue({
        success: true,
        data: 'ExistingKey12345678',
      });

      const { result } = renderHook(() => useAIConfig());

      await waitFor(() => {
        expect(result.current.hasKey).toBe(true);
      });

      // 清除 key
      let clearResult: { success: boolean } | undefined;
      await act(async () => {
        clearResult = await result.current.clearKey();
      });

      expect(clearResult?.success).toBe(true);
      expect(configStorage.clearApiKey).toHaveBeenCalled();
    });

    it('清除后应该重置状态', async () => {
      vi.mocked(configStorage.getApiKey).mockResolvedValue({
        success: true,
        data: 'ExistingKey12345678',
      });

      const { result } = renderHook(() => useAIConfig());

      await waitFor(() => {
        expect(result.current.hasKey).toBe(true);
      });

      await act(async () => {
        await result.current.clearKey();
      });

      expect(result.current.hasKey).toBe(false);
      expect(result.current.apiKey).toBeNull();
      expect(result.current.maskedKey).toBe('');
    });

    it('清除失败时应该设置错误状态', async () => {
      vi.mocked(configStorage.getApiKey).mockResolvedValue({
        success: true,
        data: 'ExistingKey12345678',
      });
      vi.mocked(configStorage.clearApiKey).mockResolvedValue({
        success: false,
        error: { code: 'STORAGE_ERROR', message: 'Delete failed' },
      });

      const { result } = renderHook(() => useAIConfig());

      await waitFor(() => {
        expect(result.current.hasKey).toBe(true);
      });

      await act(async () => {
        await result.current.clearKey();
      });

      expect(result.current.error).toBe('Delete failed');
      // 清除失败时状态不应该改变
      expect(result.current.hasKey).toBe(true);
    });
  });

  describe('showKey 切换 - AC2', () => {
    it('默认应该隐藏 key (showKey = false)', async () => {
      vi.mocked(configStorage.getApiKey).mockResolvedValue({
        success: true,
        data: 'TestKey12345678',
      });

      const { result } = renderHook(() => useAIConfig());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.showKey).toBe(false);
    });

    it('toggleShowKey 应该切换显示状态', async () => {
      vi.mocked(configStorage.getApiKey).mockResolvedValue({
        success: true,
        data: 'TestKey12345678',
      });

      const { result } = renderHook(() => useAIConfig());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.showKey).toBe(false);

      act(() => {
        result.current.toggleShowKey();
      });

      expect(result.current.showKey).toBe(true);

      act(() => {
        result.current.toggleShowKey();
      });

      expect(result.current.showKey).toBe(false);
    });

    it('displayValue 应该根据 showKey 返回正确的值', async () => {
      const fullKey = 'TestKey12345678';
      vi.mocked(configStorage.getApiKey).mockResolvedValue({
        success: true,
        data: fullKey,
      });

      const { result } = renderHook(() => useAIConfig());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 默认隐藏，显示遮蔽格式
      expect(result.current.displayValue).toBe('Tes****5678');

      // 显示完整 key
      act(() => {
        result.current.toggleShowKey();
      });

      expect(result.current.displayValue).toBe(fullKey);
    });
  });

  describe('错误处理 - Task 4.4', () => {
    it('clearError 应该清除错误状态', async () => {
      vi.mocked(configStorage.getApiKey).mockResolvedValue({
        success: false,
        error: { code: 'STORAGE_ERROR', message: 'Load failed' },
      });

      const { result } = renderHook(() => useAIConfig());

      await waitFor(() => {
        expect(result.current.error).toBe('Load failed');
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('新操作应该自动清除之前的错误', async () => {
      vi.mocked(configStorage.getApiKey).mockResolvedValue({
        success: false,
        error: { code: 'STORAGE_ERROR', message: 'Load failed' },
      });

      const { result } = renderHook(() => useAIConfig());

      await waitFor(() => {
        expect(result.current.error).toBe('Load failed');
      });

      // 重新尝试保存
      vi.mocked(configStorage.saveApiKey).mockResolvedValue({ success: true });

      await act(async () => {
        await result.current.saveKey('NewKey12345678');
      });

      // 错误应该被清除
      expect(result.current.error).toBeNull();
    });
  });
});
