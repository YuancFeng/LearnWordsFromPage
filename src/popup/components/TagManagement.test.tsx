/**
 * LingoRecall AI - TagManagement Component Tests
 * Story 4.4 - Task 8: 标签管理组件测试
 *
 * 测试标签列表展示、创建、编辑、删除功能
 *
 * @module popup/components/TagManagement.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import 'fake-indexeddb/auto';
import { TagManagement } from './TagManagement';
import { deleteDatabase } from '../../shared/storage/db';
import { createTag } from '../../shared/storage';

// Mock window.confirm
const mockConfirm = vi.fn();
vi.stubGlobal('confirm', mockConfirm);

// ============================================================
// Test Setup
// ============================================================

describe('TagManagement', () => {
  beforeEach(async () => {
    // 确保每个测试都有干净的数据库
    await deleteDatabase();
    mockConfirm.mockClear();
  });

  afterEach(async () => {
    // 清理测试后的数据库
    await deleteDatabase();
  });

  // ============================================================
  // Rendering Tests
  // ============================================================

  describe('渲染', () => {
    it('应该渲染标签管理组件', async () => {
      render(<TagManagement />);

      await waitFor(() => {
        expect(screen.getByTestId('tag-management')).toBeInTheDocument();
      });
    });

    it('应该显示标题"标签管理"', async () => {
      render(<TagManagement />);

      await waitFor(() => {
        // i18n: settings.tags.title = "Tag Management"
        expect(screen.getByText('Tag Management')).toBeInTheDocument();
      });
    });

    it('应该显示新建按钮', async () => {
      render(<TagManagement />);

      await waitFor(() => {
        expect(screen.getByTestId('tag-create-button')).toBeInTheDocument();
      });
    });

    it('应该在加载时显示加载状态', () => {
      render(<TagManagement />);

      // i18n: settings.tags.loading = "Loading tags..."
      expect(screen.getByText('Loading tags...')).toBeInTheDocument();
    });

    it('应该在无标签时显示空状态', async () => {
      render(<TagManagement />);

      await waitFor(() => {
        // i18n: settings.tags.empty = "No tags created yet"
        expect(screen.getByText('No tags created yet')).toBeInTheDocument();
      });
    });
  });

  // ============================================================
  // Tag List Tests - AC1
  // ============================================================

  describe('标签列表 - AC1', () => {
    it('应该显示所有标签', async () => {
      // 预先创建标签
      await createTag({ name: '学术', color: '#3B82F6' });
      await createTag({ name: '工作', color: '#EF4444' });

      render(<TagManagement />);

      await waitFor(() => {
        expect(screen.getByText('学术')).toBeInTheDocument();
        expect(screen.getByText('工作')).toBeInTheDocument();
      });
    });

    it('应该显示标签颜色', async () => {
      const tag = await createTag({ name: 'Test', color: '#22C55E' });

      render(<TagManagement />);

      await waitFor(() => {
        const colorIndicator = screen.getByTestId(`tag-color-${tag.data!.id}`);
        expect(colorIndicator).toHaveStyle({ backgroundColor: '#22C55E' });
      });
    });

    it('应该显示标签数量', async () => {
      await createTag({ name: 'Tag1', color: '#3B82F6' });
      await createTag({ name: 'Tag2', color: '#EF4444' });

      render(<TagManagement />);

      await waitFor(() => {
        expect(screen.getByText('(2)')).toBeInTheDocument();
      });
    });
  });

  // ============================================================
  // Create Tag Tests - AC1
  // ============================================================

  describe('创建标签 - AC1', () => {
    it('应该在点击新建按钮时打开弹窗', async () => {
      render(<TagManagement />);

      await waitFor(() => {
        // i18n: settings.tags.loading = "Loading tags..."
        expect(screen.queryByText('Loading tags...')).not.toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('tag-create-button'));

      expect(screen.getByTestId('tag-edit-modal')).toBeInTheDocument();
      // TagEditModal still has hardcoded Chinese
      expect(screen.getByText('新建标签')).toBeInTheDocument();
    });

    it('应该在保存后显示新标签', async () => {
      render(<TagManagement />);

      await waitFor(() => {
        // i18n: settings.tags.loading = "Loading tags..."
        expect(screen.queryByText('Loading tags...')).not.toBeInTheDocument();
      });

      // 打开弹窗
      fireEvent.click(screen.getByTestId('tag-create-button'));

      // 输入名称
      const input = screen.getByTestId('tag-name-input');
      fireEvent.change(input, { target: { value: '新标签' } });

      // 保存
      fireEvent.click(screen.getByTestId('tag-modal-save'));

      await waitFor(() => {
        expect(screen.getByText('新标签')).toBeInTheDocument();
      });
    });
  });

  // ============================================================
  // Edit Tag Tests - AC2
  // ============================================================

  describe('编辑标签 - AC2', () => {
    it('应该在点击编辑按钮时打开弹窗', async () => {
      const tag = await createTag({ name: 'Test', color: '#3B82F6' });

      render(<TagManagement />);

      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId(`tag-edit-${tag.data!.id}`));

      expect(screen.getByTestId('tag-edit-modal')).toBeInTheDocument();
      expect(screen.getByText('编辑标签')).toBeInTheDocument();
    });

    it('应该在弹窗中显示现有标签信息', async () => {
      const tag = await createTag({ name: 'Existing', color: '#EF4444' });

      render(<TagManagement />);

      await waitFor(() => {
        expect(screen.getByText('Existing')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId(`tag-edit-${tag.data!.id}`));

      const input = screen.getByTestId('tag-name-input') as HTMLInputElement;
      expect(input.value).toBe('Existing');
    });

    it('应该在更新后显示新名称', async () => {
      const tag = await createTag({ name: 'Old Name', color: '#3B82F6' });

      render(<TagManagement />);

      await waitFor(() => {
        expect(screen.getByText('Old Name')).toBeInTheDocument();
      });

      // 打开编辑弹窗
      fireEvent.click(screen.getByTestId(`tag-edit-${tag.data!.id}`));

      // 修改名称
      const input = screen.getByTestId('tag-name-input');
      fireEvent.change(input, { target: { value: 'New Name' } });

      // 保存
      fireEvent.click(screen.getByTestId('tag-modal-save'));

      await waitFor(() => {
        expect(screen.getByText('New Name')).toBeInTheDocument();
        expect(screen.queryByText('Old Name')).not.toBeInTheDocument();
      });
    });
  });

  // ============================================================
  // Delete Tag Tests - AC3
  // ============================================================

  describe('删除标签 - AC3', () => {
    it('应该在点击删除按钮时显示确认对话框', async () => {
      mockConfirm.mockReturnValue(false);
      const tag = await createTag({ name: 'Test', color: '#3B82F6' });

      render(<TagManagement />);

      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId(`tag-delete-${tag.data!.id}`));

      expect(mockConfirm).toHaveBeenCalled();
    });

    it('应该在确认后删除标签', async () => {
      mockConfirm.mockReturnValue(true);
      const tag = await createTag({ name: 'ToDelete', color: '#3B82F6' });

      render(<TagManagement />);

      await waitFor(() => {
        expect(screen.getByText('ToDelete')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId(`tag-delete-${tag.data!.id}`));

      await waitFor(() => {
        expect(screen.queryByText('ToDelete')).not.toBeInTheDocument();
      });
    });

    it('应该在取消后保留标签', async () => {
      mockConfirm.mockReturnValue(false);
      const tag = await createTag({ name: 'Keep', color: '#3B82F6' });

      render(<TagManagement />);

      await waitFor(() => {
        expect(screen.getByText('Keep')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId(`tag-delete-${tag.data!.id}`));

      // 标签应该仍然存在
      expect(screen.getByText('Keep')).toBeInTheDocument();
    });
  });

  // ============================================================
  // Modal Tests
  // ============================================================

  describe('弹窗操作', () => {
    it('应该在点击取消按钮时关闭弹窗', async () => {
      render(<TagManagement />);

      await waitFor(() => {
        // i18n: settings.tags.loading = "Loading tags..."
        expect(screen.queryByText('Loading tags...')).not.toBeInTheDocument();
      });

      // 打开弹窗
      fireEvent.click(screen.getByTestId('tag-create-button'));
      expect(screen.getByTestId('tag-edit-modal')).toBeInTheDocument();

      // 点击取消
      fireEvent.click(screen.getByTestId('tag-modal-cancel'));

      expect(screen.queryByTestId('tag-edit-modal')).not.toBeInTheDocument();
    });

    it('应该在点击关闭按钮时关闭弹窗', async () => {
      render(<TagManagement />);

      await waitFor(() => {
        // i18n: settings.tags.loading = "Loading tags..."
        expect(screen.queryByText('Loading tags...')).not.toBeInTheDocument();
      });

      // 打开弹窗
      fireEvent.click(screen.getByTestId('tag-create-button'));
      expect(screen.getByTestId('tag-edit-modal')).toBeInTheDocument();

      // 点击关闭
      fireEvent.click(screen.getByTestId('tag-modal-close'));

      expect(screen.queryByTestId('tag-edit-modal')).not.toBeInTheDocument();
    });
  });

  // ============================================================
  // Error Handling Tests
  // ============================================================

  describe('错误处理', () => {
    it('应该显示重复标签名称的错误', async () => {
      await createTag({ name: 'Existing', color: '#3B82F6' });

      render(<TagManagement />);

      await waitFor(() => {
        expect(screen.getByText('Existing')).toBeInTheDocument();
      });

      // 打开新建弹窗
      fireEvent.click(screen.getByTestId('tag-create-button'));

      // 输入重复的名称
      const input = screen.getByTestId('tag-name-input');
      fireEvent.change(input, { target: { value: 'Existing' } });

      // 保存
      fireEvent.click(screen.getByTestId('tag-modal-save'));

      await waitFor(() => {
        expect(screen.getByTestId('tag-modal-error')).toBeInTheDocument();
      });
    });
  });
});
