/**
 * LingoRecall AI - SearchBar Component Tests
 * Story 2.5 - AC1: 搜索输入框测试
 *
 * @module popup/components/SearchBar.test
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SearchBar } from './SearchBar';

describe('SearchBar', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    onClear: vi.fn(),
    isSearching: false,
    matchCount: 0,
    totalCount: 10,
  };

  it('renders search input with placeholder', () => {
    render(<SearchBar {...defaultProps} />);

    const input = screen.getByRole('textbox', { name: /搜索词汇/i });
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', '搜索词汇...');
  });

  it('displays custom placeholder when provided', () => {
    render(<SearchBar {...defaultProps} placeholder="Search..." />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('placeholder', 'Search...');
  });

  it('calls onChange when user types', () => {
    const onChange = vi.fn();
    render(<SearchBar {...defaultProps} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });

    expect(onChange).toHaveBeenCalledWith('test');
  });

  it('shows loading spinner when isSearching is true', () => {
    render(<SearchBar {...defaultProps} isSearching={true} />);

    expect(screen.getByLabelText('搜索中')).toBeInTheDocument();
  });

  it('does not show loading spinner when isSearching is false', () => {
    render(<SearchBar {...defaultProps} isSearching={false} />);

    expect(screen.queryByLabelText('搜索中')).not.toBeInTheDocument();
  });

  it('shows match count badge when value is present and not searching', () => {
    render(
      <SearchBar
        {...defaultProps}
        value="apple"
        matchCount={3}
        totalCount={10}
        isSearching={false}
      />
    );

    expect(screen.getByText('3/10')).toBeInTheDocument();
  });

  it('does not show match count badge when value is empty', () => {
    render(
      <SearchBar {...defaultProps} value="" matchCount={10} totalCount={10} />
    );

    expect(screen.queryByText('10/10')).not.toBeInTheDocument();
  });

  it('does not show match count badge when searching', () => {
    render(
      <SearchBar
        {...defaultProps}
        value="apple"
        matchCount={3}
        totalCount={10}
        isSearching={true}
      />
    );

    expect(screen.queryByText('3/10')).not.toBeInTheDocument();
  });

  it('shows clear button when value is present', () => {
    render(<SearchBar {...defaultProps} value="test" />);

    expect(screen.getByRole('button', { name: /清除搜索/i })).toBeInTheDocument();
  });

  it('does not show clear button when value is empty', () => {
    render(<SearchBar {...defaultProps} value="" />);

    expect(screen.queryByRole('button', { name: /清除搜索/i })).not.toBeInTheDocument();
  });

  it('calls onClear when clear button is clicked', () => {
    const onClear = vi.fn();
    render(<SearchBar {...defaultProps} value="test" onClear={onClear} />);

    fireEvent.click(screen.getByRole('button', { name: /清除搜索/i }));

    expect(onClear).toHaveBeenCalled();
  });

  it('calls onClear when Escape key is pressed with value', () => {
    const onClear = vi.fn();
    render(<SearchBar {...defaultProps} value="test" onClear={onClear} />);

    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(onClear).toHaveBeenCalled();
  });

  it('does not call onClear when Escape is pressed with empty value', () => {
    const onClear = vi.fn();
    render(<SearchBar {...defaultProps} value="" onClear={onClear} />);

    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(onClear).not.toHaveBeenCalled();
  });

  it('disables input when disabled prop is true', () => {
    render(<SearchBar {...defaultProps} disabled={true} />);

    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('applies different style when matchCount is 0', () => {
    render(
      <SearchBar
        {...defaultProps}
        value="xyz"
        matchCount={0}
        totalCount={10}
        isSearching={false}
      />
    );

    const badge = screen.getByText('0/10');
    expect(badge).toHaveClass('bg-gray-100');
  });

  it('applies blue style when matchCount is greater than 0', () => {
    render(
      <SearchBar
        {...defaultProps}
        value="apple"
        matchCount={5}
        totalCount={10}
        isSearching={false}
      />
    );

    const badge = screen.getByText('5/10');
    expect(badge).toHaveClass('bg-blue-50');
  });
});
