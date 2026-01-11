/**
 * LingoRecall AI - SortDropdown Component Tests
 * Story 2.5 - AC2: 排序功能测试
 *
 * @module popup/components/SortDropdown.test
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SortDropdown, SORT_CONFIG } from './SortDropdown';

describe('SortDropdown', () => {
  const defaultProps = {
    value: 'recent' as const,
    onChange: vi.fn(),
  };

  it('renders button with current sort label', () => {
    render(<SortDropdown {...defaultProps} value="recent" />);

    expect(screen.getByRole('button', { name: /排序方式/i })).toBeInTheDocument();
    expect(screen.getByText('Most Recent')).toBeInTheDocument();
  });

  it('shows oldest label when value is oldest', () => {
    render(<SortDropdown {...defaultProps} value="oldest" />);

    expect(screen.getByText('Oldest First')).toBeInTheDocument();
  });

  it('shows alphabetical label when value is alphabetical', () => {
    render(<SortDropdown {...defaultProps} value="alphabetical" />);

    expect(screen.getByText('Alphabetical')).toBeInTheDocument();
  });

  it('opens dropdown menu when button is clicked', () => {
    render(<SortDropdown {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /排序方式/i }));

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('shows all sort options in dropdown', () => {
    render(<SortDropdown {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /排序方式/i }));

    expect(screen.getAllByText('Most Recent').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Oldest First')).toBeInTheDocument();
    expect(screen.getByText('Alphabetical')).toBeInTheDocument();
  });

  it('calls onChange with selected option', () => {
    const onChange = vi.fn();
    render(<SortDropdown {...defaultProps} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /排序方式/i }));
    fireEvent.click(screen.getByRole('option', { name: /Oldest First/i }));

    expect(onChange).toHaveBeenCalledWith('oldest');
  });

  it('closes dropdown after selection', () => {
    render(<SortDropdown {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /排序方式/i }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('option', { name: /Alphabetical/i }));

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('highlights currently selected option', () => {
    render(<SortDropdown {...defaultProps} value="alphabetical" />);

    fireEvent.click(screen.getByRole('button', { name: /排序方式/i }));

    const alphabeticalOption = screen.getByRole('option', { name: /Alphabetical/i });
    expect(alphabeticalOption).toHaveAttribute('aria-selected', 'true');
    expect(alphabeticalOption).toHaveClass('bg-blue-50');
  });


  it('calls onChange with selected option', () => {
    const onChange = vi.fn();
    render(<SortDropdown {...defaultProps} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /排序方式/i }));
    fireEvent.click(screen.getByRole('option', { name: /Oldest First/i }));

    expect(onChange).toHaveBeenCalledWith('oldest');
  });

  it('closes dropdown after selection', () => {
    render(<SortDropdown {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /排序方式/i }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('option', { name: /Alphabetical/i }));

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes dropdown when clicking outside', () => {
    render(
      <div>
        <SortDropdown {...defaultProps} />
        <div data-testid="outside">Outside</div>
      </div>
    );

    fireEvent.click(screen.getByRole('button', { name: /排序方式/i }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId('outside'));

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes dropdown when Escape key is pressed', () => {
    render(<SortDropdown {...defaultProps} />);

    const button = screen.getByRole('button', { name: /排序方式/i });
    fireEvent.click(button);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.keyDown(button, { key: 'Escape' });

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('does not open dropdown when disabled', () => {
    render(<SortDropdown {...defaultProps} disabled={true} />);

    fireEvent.click(screen.getByRole('button', { name: /排序方式/i }));

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('highlights currently selected option', () => {
    render(<SortDropdown {...defaultProps} value="alphabetical" />);

    fireEvent.click(screen.getByRole('button', { name: /排序方式/i }));

    const alphabeticalOption = screen.getByRole('option', { name: /Alphabetical/i });
    expect(alphabeticalOption).toHaveAttribute('aria-selected', 'true');
    expect(alphabeticalOption).toHaveClass('bg-blue-50');
  });

  it('exports correct SORT_CONFIG', () => {
    expect(SORT_CONFIG.recent).toEqual({ field: 'createdAt', order: 'desc' });
    expect(SORT_CONFIG.oldest).toEqual({ field: 'createdAt', order: 'asc' });
    expect(SORT_CONFIG.alphabetical).toEqual({ field: 'text', order: 'asc' });
  });
});
