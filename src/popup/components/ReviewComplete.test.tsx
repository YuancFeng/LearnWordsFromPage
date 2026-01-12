import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ReviewComplete } from './ReviewComplete';

describe('ReviewComplete', () => {
  it('shows summary stats', () => {
    render(
      <ReviewComplete
        stats={{ total: 10, remembered: 7, forgotten: 3 }}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByText('复习完成！')).toBeInTheDocument();
    expect(screen.getByText('总复习')).toBeInTheDocument();
    expect(screen.getByText('记住了')).toBeInTheDocument();
    expect(screen.getByText('忘记了')).toBeInTheDocument();
    expect(screen.getByText('10', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByText('7', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByText('3', { selector: 'p' })).toBeInTheDocument();
  });

  it('calls onBack when clicking return button', () => {
    const onBack = vi.fn();

    render(
      <ReviewComplete
        stats={{ total: 1, remembered: 1, forgotten: 0 }}
        onBack={onBack}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '返回词库' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
