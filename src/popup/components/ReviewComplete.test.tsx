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

    // i18n translations
    expect(screen.getByText('Review Complete!')).toBeInTheDocument();
    expect(screen.getByText('Total reviewed')).toBeInTheDocument();
    expect(screen.getByText('Remembered')).toBeInTheDocument();
    expect(screen.getByText('Forgot')).toBeInTheDocument();
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

    // i18n: review.complete.backToVocabulary = "Back to Vocabulary"
    fireEvent.click(screen.getByRole('button', { name: 'Back to Vocabulary' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
