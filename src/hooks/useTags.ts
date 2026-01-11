/**
 * LingoRecall AI - useTags Hook
 * Story 4.4 - Task 3: 标签状态管理 Hook
 *
 * 提供标签的 CRUD 操作和状态管理
 *
 * @module hooks/useTags
 */

import { useState, useEffect, useCallback } from 'react';
import type { Tag, UpdateTagInput } from '../shared/types/tag';
import type { Response } from '../shared/messaging/types';
import {
  createTag as createTagService,
  getAllTags,
  updateTag as updateTagService,
  deleteTag as deleteTagService,
} from '../shared/storage';

// ============================================================
// Hook Return Type
// ============================================================

export interface UseTagsReturn {
  /** 标签列表 */
  tags: Tag[];
  /** 加载中状态 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 创建标签 */
  addTag: (name: string, color: string) => Promise<Response<Tag>>;
  /** 更新标签 */
  editTag: (id: string, updates: UpdateTagInput) => Promise<Response<Tag>>;
  /** 删除标签（带级联更新） */
  removeTag: (id: string) => Promise<Response<void>>;
  /** 重新加载标签列表 */
  reloadTags: () => Promise<void>;
  /** 清除错误 */
  clearError: () => void;
}

// ============================================================
// useTags Hook
// ============================================================

/**
 * 标签管理 Hook
 * Story 4.4 - AC1, AC2, AC3: 标签的创建、编辑、删除
 *
 * @returns UseTagsReturn
 *
 * @example
 * ```tsx
 * const { tags, isLoading, addTag, removeTag } = useTags();
 *
 * // 创建标签
 * const result = await addTag('学术', '#3B82F6');
 *
 * // 删除标签（会自动更新关联词汇）
 * await removeTag(tagId);
 * ```
 */
export function useTags(): UseTagsReturn {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 加载所有标签
   */
  const loadTags = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getAllTags();

      if (result.success && result.data) {
        // 按创建时间降序（最新的在前）
        setTags(result.data);
      } else {
        setError(result.error?.message || '加载标签失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载标签失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 初始化时加载标签
   */
  useEffect(() => {
    loadTags();
  }, [loadTags]);

  /**
   * 创建新标签
   * Story 4.4 - AC1
   */
  const addTag = useCallback(
    async (name: string, color: string): Promise<Response<Tag>> => {
      setError(null);

      const result = await createTagService({ name, color });

      if (result.success && result.data) {
        // 添加到列表开头（最新的在前）
        setTags((prev) => [result.data!, ...prev]);
      } else if (result.error) {
        setError(result.error.message);
      }

      return result;
    },
    []
  );

  /**
   * 更新标签
   * Story 4.4 - AC2
   */
  const editTag = useCallback(
    async (id: string, updates: UpdateTagInput): Promise<Response<Tag>> => {
      setError(null);

      const result = await updateTagService(id, updates);

      if (result.success && result.data) {
        // 更新列表中的标签
        setTags((prev) =>
          prev.map((tag) => (tag.id === id ? result.data! : tag))
        );
      } else if (result.error) {
        setError(result.error.message);
      }

      return result;
    },
    []
  );

  /**
   * 删除标签（带级联更新）
   * Story 4.4 - AC3
   */
  const removeTag = useCallback(
    async (id: string): Promise<Response<void>> => {
      setError(null);

      const result = await deleteTagService(id);

      if (result.success) {
        // 从列表中移除
        setTags((prev) => prev.filter((tag) => tag.id !== id));
      } else if (result.error) {
        setError(result.error.message);
      }

      return result;
    },
    []
  );

  /**
   * 清除错误状态
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    tags,
    isLoading,
    error,
    addTag,
    editTag,
    removeTag,
    reloadTags: loadTags,
    clearError,
  };
}

export default useTags;
