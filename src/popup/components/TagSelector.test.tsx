/**
 * LingoRecall AI - TagSelector Component Tests
 * Story 4.6 - Task 5: Unit Tests
 *
 * @module popup/components/TagSelector.test
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TagSelector, TagSelectorButton } from './TagSelector';
import type { Tag } from '../../shared/types/tag';

// 测试用标签数据
const mockTags: Tag[] = [
  { id: 'tag-1', name: '重要', color: '#ef4444', createdAt: Date.now() },
  { id: 'tag-2', name: '工作', color: '#3b82f6', createdAt: Date.now() },
  { id: 'tag-3', name: '学习', color: '#22c55e', createdAt: Date.now() },
];

describe('TagSelector', () => {
  const defaultProps = {
    allTags: mockTags,
    selectedTagIds: [] as string[],
    onToggle: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders tag selector with title', () => {
      render(<TagSelector {...defaultProps} />);
      expect(screen.getByText('选择标签')).toBeInTheDocument();
    });

    it('renders all available tags', () => {
      render(<TagSelector {...defaultProps} />);
      expect(screen.getByTestId('tag-selector-option-tag-1')).toBeInTheDocument();
      expect(screen.getByTestId('tag-selector-option-tag-2')).toBeInTheDocument();
      expect(screen.getByTestId('tag-selector-option-tag-3')).toBeInTheDocument();
    });

    it('shows empty state when no tags available', () => {
      render(<TagSelector {...defaultProps} allTags={[]} />);
      expect(screen.getByText('还没有创建标签')).toBeInTheDocument();
    });

    it('shows "去创建标签" link when no tags and onManageTags provided', () => {
      const onManageTags = vi.fn();
      render(<TagSelector {...defaultProps} allTags={[]} onManageTags={onManageTags} />);
      expect(screen.getByText('去创建标签')).toBeInTheDocument();
    });
  });

  describe('selection display - AC1', () => {
    it('shows checkmark on selected tags', () => {
      render(<TagSelector {...defaultProps} selectedTagIds={['tag-1']} />);
      const selectedTag = screen.getByTestId('tag-selector-option-tag-1');
      expect(selectedTag.querySelector('svg')).toBeInTheDocument(); // Check icon
    });

    it('applies selected style to selected tags', () => {
      render(<TagSelector {...defaultProps} selectedTagIds={['tag-1']} />);
      const selectedTag = screen.getByTestId('tag-selector-option-tag-1');
      expect(selectedTag).toHaveClass('bg-blue-50');
    });

    it('shows multiple selected tags', () => {
      render(<TagSelector {...defaultProps} selectedTagIds={['tag-1', 'tag-2']} />);
      const tag1 = screen.getByTestId('tag-selector-option-tag-1');
      const tag2 = screen.getByTestId('tag-selector-option-tag-2');
      expect(tag1.querySelector('svg')).toBeInTheDocument();
      expect(tag2.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('tag toggle - AC2, AC3', () => {
    it('calls onToggle with tagId and true when unselected tag clicked', () => {
      const onToggle = vi.fn();
      render(<TagSelector {...defaultProps} onToggle={onToggle} />);

      fireEvent.click(screen.getByTestId('tag-selector-option-tag-1'));

      expect(onToggle).toHaveBeenCalledWith('tag-1', true);
    });

    it('calls onToggle with tagId and false when selected tag clicked', () => {
      const onToggle = vi.fn();
      render(
        <TagSelector {...defaultProps} selectedTagIds={['tag-1']} onToggle={onToggle} />
      );

      fireEvent.click(screen.getByTestId('tag-selector-option-tag-1'));

      expect(onToggle).toHaveBeenCalledWith('tag-1', false);
    });

    it('does not call onToggle when loading', () => {
      const onToggle = vi.fn();
      render(<TagSelector {...defaultProps} onToggle={onToggle} isLoading={true} />);

      fireEvent.click(screen.getByTestId('tag-selector-option-tag-1'));

      expect(onToggle).not.toHaveBeenCalled();
    });
  });

  describe('close behavior', () => {
    it('calls onClose when close button clicked', () => {
      const onClose = vi.fn();
      render(<TagSelector {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByLabelText('关闭'));

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when ESC key pressed', () => {
      const onClose = vi.fn();
      render(<TagSelector {...defaultProps} onClose={onClose} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when clicking outside', () => {
      const onClose = vi.fn();
      const { container } = render(
        <div>
          <div data-testid="outside">Outside</div>
          <TagSelector {...defaultProps} onClose={onClose} />
        </div>
      );

      fireEvent.mouseDown(screen.getByTestId('outside'));

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('manage tags link', () => {
    it('shows manage tags button when onManageTags provided and tags exist', () => {
      const onManageTags = vi.fn();
      render(<TagSelector {...defaultProps} onManageTags={onManageTags} />);

      expect(screen.getByText('管理标签')).toBeInTheDocument();
    });

    it('calls onManageTags and onClose when manage tags clicked', () => {
      const onManageTags = vi.fn();
      const onClose = vi.fn();
      render(
        <TagSelector {...defaultProps} onManageTags={onManageTags} onClose={onClose} />
      );

      fireEvent.click(screen.getByText('管理标签'));

      expect(onClose).toHaveBeenCalled();
      expect(onManageTags).toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('disables tag buttons when loading', () => {
      render(<TagSelector {...defaultProps} isLoading={true} />);

      const tagButton = screen.getByTestId('tag-selector-option-tag-1');
      expect(tagButton).toBeDisabled();
      expect(tagButton).toHaveClass('opacity-50');
    });
  });
});

describe('TagSelectorButton', () => {
  it('renders with zero count', () => {
    render(<TagSelectorButton selectedCount={0} onClick={vi.fn()} />);
    const button = screen.getByTestId('tag-selector-button');
    expect(button).toBeInTheDocument();
    expect(button).not.toHaveTextContent('0');
  });

  it('shows count when selectedCount > 0', () => {
    render(<TagSelectorButton selectedCount={3} onClick={vi.fn()} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('applies selected style when has selections', () => {
    render(<TagSelectorButton selectedCount={2} onClick={vi.fn()} />);
    const button = screen.getByTestId('tag-selector-button');
    expect(button).toHaveClass('text-blue-600');
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<TagSelectorButton selectedCount={0} onClick={onClick} />);

    fireEvent.click(screen.getByTestId('tag-selector-button'));

    expect(onClick).toHaveBeenCalled();
  });

  it('is disabled when disabled prop is true', () => {
    render(<TagSelectorButton selectedCount={0} onClick={vi.fn()} disabled />);
    const button = screen.getByTestId('tag-selector-button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('opacity-50');
  });
});
