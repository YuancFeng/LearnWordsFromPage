/**
 * LingoRecall AI - TagEditModal Component
 * Story 4.4 - Task 5: 标签编辑弹窗
 *
 * 用于创建和编辑标签的模态框
 *
 * @module popup/components/TagEditModal
 */

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Tag, UpdateTagInput } from '../../shared/types/tag';
import { DEFAULT_TAG_COLOR, isValidTagName } from '../../shared/types/tag';
import { ColorPicker } from './ColorPicker';

/**
 * TagEditModal 属性
 */
export interface TagEditModalProps {
  /** 是否打开弹窗 */
  isOpen: boolean;
  /** 关闭弹窗回调 */
  onClose: () => void;
  /** 保存回调 */
  onSave: (name: string, color: string) => Promise<{ success: boolean; error?: { message: string } }>;
  /** 编辑模式下的现有标签 */
  tag?: Tag | null;
  /** 是否正在保存 */
  isSaving?: boolean;
}

/**
 * 标签编辑弹窗组件
 * Story 4.4 - AC2, AC4: 创建/编辑标签
 *
 * @example
 * ```tsx
 * <TagEditModal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   onSave={handleSave}
 *   tag={editingTag}
 * />
 * ```
 */
export function TagEditModal({
  isOpen,
  onClose,
  onSave,
  tag,
  isSaving = false,
}: TagEditModalProps): React.ReactElement | null {
  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_TAG_COLOR);
  const [error, setError] = useState<string | null>(null);
  const [localSaving, setLocalSaving] = useState(false);

  const isEditing = !!tag;
  const saving = isSaving || localSaving;

  /**
   * 初始化表单数据
   */
  useEffect(() => {
    if (isOpen) {
      if (tag) {
        setName(tag.name);
        setColor(tag.color);
      } else {
        setName('');
        setColor(DEFAULT_TAG_COLOR);
      }
      setError(null);
    }
  }, [isOpen, tag]);

  /**
   * 处理表单提交
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();

    // 前端验证
    if (!isValidTagName(trimmedName)) {
      setError('标签名称需要 1-20 个字符');
      return;
    }

    setLocalSaving(true);

    try {
      const result = await onSave(trimmedName, color);

      if (result.success) {
        onClose();
      } else {
        setError(result.error?.message || '保存失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setLocalSaving(false);
    }
  };

  /**
   * 处理键盘事件
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tag-modal-title"
      data-testid="tag-edit-modal"
    >
      <div className="w-full max-w-md mx-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl">
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2
            id="tag-modal-title"
            className="text-lg font-semibold text-gray-900 dark:text-white"
          >
            {isEditing ? '编辑标签' : '新建标签'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md transition-colors"
            aria-label="关闭"
            data-testid="tag-modal-close"
          >
            <X size={20} />
          </button>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* 名称输入 */}
          <div className="space-y-2">
            <label
              htmlFor="tag-name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              名称
            </label>
            <input
              id="tag-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="输入标签名称"
              maxLength={20}
              autoFocus
              disabled={saving}
              className={`
                w-full px-3 py-2 text-sm rounded-md
                bg-gray-50 dark:bg-gray-900
                border focus:outline-none focus:ring-2 focus:ring-blue-500
                disabled:opacity-50 disabled:cursor-not-allowed
                ${error
                  ? 'border-red-300 dark:border-red-600'
                  : 'border-gray-200 dark:border-gray-600'
                }
              `}
              data-testid="tag-name-input"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {name.length}/20 字符
            </p>
          </div>

          {/* 颜色选择 */}
          <ColorPicker
            value={color}
            onChange={setColor}
            disabled={saving}
          />

          {/* 错误提示 */}
          {error && (
            <div
              className="px-3 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md"
              role="alert"
              data-testid="tag-modal-error"
            >
              {error}
            </div>
          )}

          {/* 按钮 */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              data-testid="tag-modal-cancel"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="px-4 py-2 text-sm text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="tag-modal-save"
            >
              {saving ? '保存中...' : isEditing ? '更新' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TagEditModal;
