/**
 * LingoRecall AI - useTags Hook Tests
 * Story 4.4 - Task 8: 标签 Hook 测试
 *
 * 测试 useTags hook 的 CRUD 操作和状态管理
 *
 * @module hooks/useTags.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import 'fake-indexeddb/auto';
import { useTags } from './useTags';
import { deleteDatabase } from '../shared/storage/db';
import { createTag as createTagService } from '../shared/storage';

// ============================================================
// Test Setup
// ============================================================

describe('useTags', () => {
  beforeEach(async () => {
    // 确保每个测试都有干净的数据库
    await deleteDatabase();
  });

  afterEach(async () => {
    // 清理测试后的数据库
    await deleteDatabase();
  });

  // ============================================================
  // Initial State Tests
  // ============================================================

  describe('初始状态', () => {
    it('应该初始化为 loading 状态', () => {
      const { result } = renderHook(() => useTags());

      // 初始状态应该是 loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.tags).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('应该在加载完成后返回空标签列表', async () => {
      const { result } = renderHook(() => useTags());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tags).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  // ============================================================
  // addTag Tests - AC1
  // ============================================================

  describe('addTag - AC1', () => {
    it('应该成功添加标签', async () => {
      const { result } = renderHook(() => useTags());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let addResult: Awaited<ReturnType<typeof result.current.addTag>>;
      await act(async () => {
        addResult = await result.current.addTag('学术', '#3B82F6');
      });

      expect(addResult!.success).toBe(true);
      expect(result.current.tags).toHaveLength(1);
      expect(result.current.tags[0].name).toBe('学术');
      expect(result.current.tags[0].color).toBe('#3B82F6');
    });

    it('应该将新标签添加到列表开头', async () => {
      const { result } = renderHook(() => useTags());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.addTag('First', '#3B82F6');
      });

      await act(async () => {
        await result.current.addTag('Second', '#EF4444');
      });

      expect(result.current.tags[0].name).toBe('Second');
      expect(result.current.tags[1].name).toBe('First');
    });

    it('应该在添加失败时设置错误状态', async () => {
      const { result } = renderHook(() => useTags());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 先添加一个标签
      await act(async () => {
        await result.current.addTag('Test', '#3B82F6');
      });

      // 尝试添加重复名称的标签
      await act(async () => {
        await result.current.addTag('Test', '#EF4444');
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  // ============================================================
  // editTag Tests - AC2
  // ============================================================

  describe('editTag - AC2', () => {
    it('应该成功更新标签名称', async () => {
      const { result } = renderHook(() => useTags());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 添加标签
      await act(async () => {
        await result.current.addTag('Old Name', '#3B82F6');
      });

      const tagId = result.current.tags[0].id;

      // 更新标签
      await act(async () => {
        await result.current.editTag(tagId, { name: 'New Name' });
      });

      expect(result.current.tags[0].name).toBe('New Name');
      expect(result.current.tags[0].color).toBe('#3B82F6'); // 颜色不变
    });

    it('应该成功更新标签颜色', async () => {
      const { result } = renderHook(() => useTags());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.addTag('Test', '#3B82F6');
      });

      const tagId = result.current.tags[0].id;

      await act(async () => {
        await result.current.editTag(tagId, { color: '#EF4444' });
      });

      expect(result.current.tags[0].color).toBe('#EF4444');
      expect(result.current.tags[0].name).toBe('Test'); // 名称不变
    });

    it('应该在更新失败时设置错误状态', async () => {
      const { result } = renderHook(() => useTags());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 尝试更新不存在的标签
      await act(async () => {
        await result.current.editTag('non-existent-id', { name: 'New Name' });
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  // ============================================================
  // removeTag Tests - AC3
  // ============================================================

  describe('removeTag - AC3', () => {
    it('应该成功删除标签', async () => {
      const { result } = renderHook(() => useTags());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.addTag('Test', '#3B82F6');
      });

      expect(result.current.tags).toHaveLength(1);

      const tagId = result.current.tags[0].id;

      await act(async () => {
        await result.current.removeTag(tagId);
      });

      expect(result.current.tags).toHaveLength(0);
    });

    it('应该在删除失败时设置错误状态', async () => {
      const { result } = renderHook(() => useTags());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 尝试删除不存在的标签
      await act(async () => {
        await result.current.removeTag('non-existent-id');
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  // ============================================================
  // reloadTags Tests
  // ============================================================

  describe('reloadTags', () => {
    it('应该重新加载标签列表', async () => {
      const { result } = renderHook(() => useTags());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 直接通过 service 添加标签（绕过 hook）
      await createTagService({ name: 'External', color: '#3B82F6' });

      // hook 列表应该还是空的
      expect(result.current.tags).toHaveLength(0);

      // 重新加载
      await act(async () => {
        await result.current.reloadTags();
      });

      // 现在应该能看到新标签
      expect(result.current.tags).toHaveLength(1);
      expect(result.current.tags[0].name).toBe('External');
    });
  });

  // ============================================================
  // clearError Tests
  // ============================================================

  describe('clearError', () => {
    it('应该清除错误状态', async () => {
      const { result } = renderHook(() => useTags());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 添加标签
      await act(async () => {
        await result.current.addTag('Test', '#3B82F6');
      });

      // 触发错误（重复名称）
      await act(async () => {
        await result.current.addTag('Test', '#EF4444');
      });

      expect(result.current.error).toBeTruthy();

      // 清除错误
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  // ============================================================
  // Integration Tests
  // ============================================================

  describe('集成测试', () => {
    it('应该正确处理多个连续操作', async () => {
      const { result } = renderHook(() => useTags());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 添加多个标签
      await act(async () => {
        await result.current.addTag('Tag1', '#3B82F6');
        await result.current.addTag('Tag2', '#EF4444');
        await result.current.addTag('Tag3', '#22C55E');
      });

      expect(result.current.tags).toHaveLength(3);

      // 更新中间的标签
      const tag2Id = result.current.tags.find((t) => t.name === 'Tag2')!.id;
      await act(async () => {
        await result.current.editTag(tag2Id, { name: 'Updated Tag2' });
      });

      expect(result.current.tags.find((t) => t.id === tag2Id)?.name).toBe('Updated Tag2');

      // 删除第一个标签
      const tag1Id = result.current.tags.find((t) => t.name === 'Tag1')!.id;
      await act(async () => {
        await result.current.removeTag(tag1Id);
      });

      expect(result.current.tags).toHaveLength(2);
      expect(result.current.tags.find((t) => t.name === 'Tag1')).toBeUndefined();
    });
  });
});
