/**
 * LingoRecall AI - TagManagement Component
 * Story 4.4 - Task 4: 标签管理组件
 *
 * 提供标签的列表展示、创建、编辑、删除功能
 *
 * @module popup/components/TagManagement
 */

import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Tag as TagIcon, Loader2 } from 'lucide-react';
import type { Tag } from '../../shared/types/tag';
import { useTags } from '../../hooks/useTags';
import { TagEditModal } from './TagEditModal';

/**
 * 标签管理组件
 * Story 4.4 - AC1, AC2, AC3: 标签的创建、编辑、删除
 *
 * @example
 * ```tsx
 * <TagManagement />
 * ```
 */
export function TagManagement(): React.ReactElement {
  const { tags, isLoading, error, addTag, editTag, removeTag, clearError } = useTags();

  // 弹窗状态
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  /**
   * 打开新建弹窗
   */
  const handleCreate = () => {
    setEditingTag(null);
    setIsModalOpen(true);
    clearError();
  };

  /**
   * 打开编辑弹窗
   */
  const handleEdit = (tag: Tag) => {
    setEditingTag(tag);
    setIsModalOpen(true);
    clearError();
  };

  /**
   * 关闭弹窗
   */
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTag(null);
  };

  /**
   * 保存标签（创建或更新）
   */
  const handleSave = async (name: string, color: string) => {
    setIsSaving(true);

    try {
      if (editingTag) {
        // 编辑模式
        return await editTag(editingTag.id, { name, color });
      } else {
        // 创建模式
        return await addTag(name, color);
      }
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * 删除标签
   */
  const handleDelete = async (id: string) => {
    setDeletingTagId(id);

    try {
      await removeTag(id);
    } finally {
      setDeletingTagId(null);
    }
  };

  /**
   * 确认删除弹窗
   */
  const handleConfirmDelete = (tag: Tag) => {
    const confirmed = window.confirm(
      `确定要删除标签"${tag.name}"吗？\n\n删除后，关联此标签的词汇将自动移除该标签。`
    );
    if (confirmed) {
      handleDelete(tag.id);
    }
  };

  // 加载状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-500 dark:text-gray-400">加载标签...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="tag-management">
      {/* 标题和操作 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TagIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-base font-medium text-gray-900 dark:text-white">
            标签管理
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({tags.length})
          </span>
        </div>

        <button
          type="button"
          onClick={handleCreate}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-colors"
          data-testid="tag-create-button"
        >
          <Plus size={16} />
          <span>新建</span>
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div
          className="px-3 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md"
          role="alert"
          data-testid="tag-error"
        >
          {error}
        </div>
      )}

      {/* 标签列表 */}
      {tags.length === 0 ? (
        <div className="text-center py-8">
          <TagIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            还没有创建标签
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            点击"新建"按钮创建您的第一个标签
          </p>
        </div>
      ) : (
        <div className="space-y-2" data-testid="tag-list">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg group hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              data-testid={`tag-item-${tag.id}`}
            >
              {/* 标签信息 */}
              <div className="flex items-center gap-3">
                {/* 颜色圆点 */}
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color }}
                  data-testid={`tag-color-${tag.id}`}
                />

                {/* 标签名称 */}
                <span
                  className="text-sm font-medium text-gray-900 dark:text-white"
                  data-testid={`tag-name-${tag.id}`}
                >
                  {tag.name}
                </span>

                {/* 颜色值（小字） */}
                <span className="text-xs text-gray-400 dark:text-gray-500 font-mono hidden sm:block">
                  {tag.color}
                </span>
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* 编辑按钮 */}
                <button
                  type="button"
                  onClick={() => handleEdit(tag)}
                  className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  title="编辑标签"
                  data-testid={`tag-edit-${tag.id}`}
                >
                  <Pencil size={14} />
                </button>

                {/* 删除按钮 */}
                <button
                  type="button"
                  onClick={() => handleConfirmDelete(tag)}
                  disabled={deletingTagId === tag.id}
                  className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                  title="删除标签"
                  data-testid={`tag-delete-${tag.id}`}
                >
                  {deletingTagId === tag.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 编辑弹窗 */}
      <TagEditModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        tag={editingTag}
        isSaving={isSaving}
      />
    </div>
  );
}

export default TagManagement;
