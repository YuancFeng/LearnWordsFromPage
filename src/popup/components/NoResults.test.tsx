/**
 * LingoRecall AI - NoResults Component Tests
 * Story 2.5 - AC3: 空搜索结果状态测试
 *
 * @module popup/components/NoResults.test
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NoResults } from './NoResults';

describe('NoResults', () => {
  const defaultProps = {
    query: 'test',
    onClear: vi.fn(),
  };

  it('renders no results message', () => {
    render(<NoResults {...defaultProps} />);

    expect(screen.getByText('No matching words found')).toBeInTheDocument();
  });

  it('displays the search query in message', () => {
    render(<NoResults {...defaultProps} query="apple" />);

    expect(screen.getByText(/No words match/)).toBeInTheDocument();
    expect(screen.getByText('apple')).toBeInTheDocument();
  });

  it('renders clear search button', () => {
    render(<NoResults {...defaultProps} />);

    expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument();
  });

  it('calls onClear when clear button is clicked', () => {
    const onClear = vi.fn();
    render(<NoResults {...defaultProps} onClear={onClear} />);

    fireEvent.click(screen.getByRole('button', { name: /clear search/i }));

    expect(onClear).toHaveBeenCalled();
  });

  it('renders search icon', () => {
    const { container } = render(<NoResults {...defaultProps} />);

    // SearchX icon is rendered
    const svgIcon = container.querySelector('svg');
    expect(svgIcon).toBeInTheDocument();
  });

  it('handles special characters in query', () => {
    render(<NoResults {...defaultProps} query="<script>alert('xss')</script>" />);

    // Should render as text, not execute
    expect(screen.getByText("<script>alert('xss')</script>")).toBeInTheDocument();
  });

  it('handles empty query gracefully', () => {
    render(<NoResults {...defaultProps} query="" />);

    expect(screen.getByText('No matching words found')).toBeInTheDocument();
    expect(screen.getByText('No words match ""')).toBeInTheDocument();
  });

  it('handles long query text', () => {
    const longQuery = 'a'.repeat(100);
    render(<NoResults {...defaultProps} query={longQuery} />);

    expect(screen.getByText(longQuery)).toBeInTheDocument();
  });
});
