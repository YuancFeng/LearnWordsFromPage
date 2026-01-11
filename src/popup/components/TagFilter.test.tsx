/**
 * LingoRecall AI - TagFilter Component Tests
 * Story 4.5 - Task 6: Unit Tests
 *
 * @module popup/components/TagFilter.test
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TagFilter } from './TagFilter';
import type { Tag } from '../../shared/types/tag';

// 测试用标签数据
const mockTags: Tag[] = [
  { id: 'tag-1', name: '重要', color: '#ef4444', createdAt: Date.now() },
  { id: 'tag-2', name: '工作', color: '#3b82f6', createdAt: Date.now() },
  { id: 'tag-3', name: '学习', color: '#22c55e', createdAt: Date.now() },
];

describe('TagFilter', () => {
  describe('rendering', () => {
    it('renders nothing when no tags provided', () => {
      const { container } = render(
        <TagFilter tags={[]} selectedIds={[]} onToggle={vi.fn()} />
      );
      expect(container.querySelector('[data-testid="tag-filter"]')).not.toBeInTheDocument();
    });

    it('renders filter button when tags exist', () => {
      render(<TagFilter tags={mockTags} selectedIds={[]} onToggle={vi.fn()} />);
      expect(screen.getByTestId('tag-filter-button')).toBeInTheDocument();
      expect(screen.getByText('标签筛选')).toBeInTheDocument();
    });

    it('shows selected count when tags are selected', () => {
      render(
        <TagFilter tags={mockTags} selectedIds={['tag-1', 'tag-2']} onToggle={vi.fn()} />
      );
      expect(screen.getByText('2 个标签')).toBeInTheDocument();
    });

    it('applies selected style to button when tags selected', () => {
      render(
        <TagFilter tags={mockTags} selectedIds={['tag-1']} onToggle={vi.fn()} />
      );
      const button = screen.getByTestId('tag-filter-button');
      expect(button).toHaveClass('border-blue-300', 'bg-blue-50');
    });
  });

  describe('dropdown interaction', () => {
    it('opens dropdown when button clicked', () => {
      render(<TagFilter tags={mockTags} selectedIds={[]} onToggle={vi.fn()} />);

      expect(screen.queryByTestId('tag-filter-dropdown')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('tag-filter-button'));

      expect(screen.getByTestId('tag-filter-dropdown')).toBeInTheDocument();
      expect(screen.getByText('按标签筛选')).toBeInTheDocument();
    });

    it('shows all tags in dropdown', () => {
      render(<TagFilter tags={mockTags} selectedIds={[]} onToggle={vi.fn()} />);
      fireEvent.click(screen.getByTestId('tag-filter-button'));

      expect(screen.getByTestId('tag-option-tag-1')).toBeInTheDocument();
      expect(screen.getByTestId('tag-option-tag-2')).toBeInTheDocument();
      expect(screen.getByTestId('tag-option-tag-3')).toBeInTheDocument();
    });

    it('closes dropdown when clicking outside', () => {
      render(<TagFilter tags={mockTags} selectedIds={[]} onToggle={vi.fn()} />);
      fireEvent.click(screen.getByTestId('tag-filter-button'));

      expect(screen.getByTestId('tag-filter-dropdown')).toBeInTheDocument();

      // Click the overlay
      const overlay = document.querySelector('.fixed.inset-0');
      if (overlay) {
        fireEvent.click(overlay);
      }

      expect(screen.queryByTestId('tag-filter-dropdown')).not.toBeInTheDocument();
    });
  });

  describe('tag selection - AC2', () => {
    it('calls onToggle when tag clicked', () => {
      const onToggle = vi.fn();
      render(<TagFilter tags={mockTags} selectedIds={[]} onToggle={onToggle} />);

      fireEvent.click(screen.getByTestId('tag-filter-button'));
      fireEvent.click(screen.getByTestId('tag-option-tag-1'));

      expect(onToggle).toHaveBeenCalledWith('tag-1');
    });

    it('shows checkmark on selected tags', () => {
      render(
        <TagFilter tags={mockTags} selectedIds={['tag-1']} onToggle={vi.fn()} />
      );

      fireEvent.click(screen.getByTestId('tag-filter-button'));

      const selectedTag = screen.getByTestId('tag-option-tag-1');
      expect(selectedTag.querySelector('svg')).toBeInTheDocument(); // Check icon
    });

    it('applies color background to selected tags', () => {
      render(
        <TagFilter tags={mockTags} selectedIds={['tag-1']} onToggle={vi.fn()} />
      );

      fireEvent.click(screen.getByTestId('tag-filter-button'));

      const selectedTag = screen.getByTestId('tag-option-tag-1');
      expect(selectedTag).toHaveStyle({ backgroundColor: '#ef4444' });
    });
  });

  describe('selected tags display', () => {
    it('shows selected tag badges', () => {
      render(
        <TagFilter tags={mockTags} selectedIds={['tag-1', 'tag-2']} onToggle={vi.fn()} />
      );

      expect(screen.getByTestId('selected-tags')).toBeInTheDocument();
      expect(screen.getByText('重要')).toBeInTheDocument();
      expect(screen.getByText('工作')).toBeInTheDocument();
    });

    it('removes tag when clicking X on badge', () => {
      const onToggle = vi.fn();
      render(
        <TagFilter tags={mockTags} selectedIds={['tag-1']} onToggle={onToggle} />
      );

      const removeButton = screen.getByLabelText('移除 重要 筛选');
      fireEvent.click(removeButton);

      expect(onToggle).toHaveBeenCalledWith('tag-1');
    });
  });

  describe('clear all - AC3', () => {
    it('shows clear all button when multiple tags selected', () => {
      const onClearAll = vi.fn();
      render(
        <TagFilter
          tags={mockTags}
          selectedIds={['tag-1', 'tag-2']}
          onToggle={vi.fn()}
          onClearAll={onClearAll}
        />
      );

      expect(screen.getByTestId('clear-tag-filter')).toBeInTheDocument();
    });

    it('hides clear all button when only one tag selected', () => {
      render(
        <TagFilter
          tags={mockTags}
          selectedIds={['tag-1']}
          onToggle={vi.fn()}
          onClearAll={vi.fn()}
        />
      );

      expect(screen.queryByTestId('clear-tag-filter')).not.toBeInTheDocument();
    });

    it('calls onClearAll when clear all clicked', () => {
      const onClearAll = vi.fn();
      render(
        <TagFilter
          tags={mockTags}
          selectedIds={['tag-1', 'tag-2']}
          onToggle={vi.fn()}
          onClearAll={onClearAll}
        />
      );

      fireEvent.click(screen.getByTestId('clear-tag-filter'));
      expect(onClearAll).toHaveBeenCalled();
    });

    it('shows clear button in dropdown when tags selected', () => {
      const onClearAll = vi.fn();
      render(
        <TagFilter
          tags={mockTags}
          selectedIds={['tag-1']}
          onToggle={vi.fn()}
          onClearAll={onClearAll}
        />
      );

      fireEvent.click(screen.getByTestId('tag-filter-button'));

      const clearButton = screen.getByText('清除');
      fireEvent.click(clearButton);

      expect(onClearAll).toHaveBeenCalled();
    });
  });

  describe('disabled state', () => {
    it('disables button when disabled prop is true', () => {
      render(
        <TagFilter tags={mockTags} selectedIds={[]} onToggle={vi.fn()} disabled />
      );

      const button = screen.getByTestId('tag-filter-button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
    });

    it('does not open dropdown when disabled', () => {
      render(
        <TagFilter tags={mockTags} selectedIds={[]} onToggle={vi.fn()} disabled />
      );

      fireEvent.click(screen.getByTestId('tag-filter-button'));

      expect(screen.queryByTestId('tag-filter-dropdown')).not.toBeInTheDocument();
    });
  });
});
