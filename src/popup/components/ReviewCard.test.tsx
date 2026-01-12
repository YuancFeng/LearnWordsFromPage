import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ReviewCard } from './ReviewCard';
import type { WordRecord } from '../../shared/messaging/types';

const mockWord: WordRecord = {
  id: 'word-1',
  text: 'serendipity',
  meaning: '意外发现美好事物的能力',
  pronunciation: '/ˌserənˈdipəti/',
  partOfSpeech: 'noun',
  exampleSentence: 'It was pure serendipity that we met.',
  sourceUrl: 'https://example.com/article',
  sourceTitle: 'Test Article',
  xpath: '/html/body/p[1]',
  textOffset: 0,
  contextBefore: 'It was pure ',
  contextAfter: ' that we met.',
  createdAt: 1700000000000,
  nextReviewAt: 1700086400000,
  reviewCount: 0,
  easeFactor: 2.5,
  interval: 1,
  tagIds: [],
};

describe('ReviewCard', () => {
  it('shows word and flip button on front', () => {
    const onFlip = vi.fn();

    render(
      <ReviewCard
        word={mockWord}
        isFlipped={false}
        onFlip={onFlip}
        onRemembered={vi.fn()}
        onForgotten={vi.fn()}
      />
    );

    expect(screen.getAllByText('serendipity').length).toBeGreaterThan(0);

    const flipButton = screen.getByRole('button', { name: '显示答案' });
    fireEvent.click(flipButton);

    expect(onFlip).toHaveBeenCalledTimes(1);
  });

  it('calls onFlip when clicking the card', () => {
    const onFlip = vi.fn();

    render(
      <ReviewCard
        word={mockWord}
        isFlipped={false}
        onFlip={onFlip}
        onRemembered={vi.fn()}
        onForgotten={vi.fn()}
      />
    );

    const wordNodes = screen.getAllByText('serendipity');
    fireEvent.click(wordNodes[0]);

    expect(onFlip).toHaveBeenCalledTimes(1);
  });

  it('shows action buttons when flipped', () => {
    const onRemembered = vi.fn();
    const onForgotten = vi.fn();

    render(
      <ReviewCard
        word={mockWord}
        isFlipped
        onFlip={vi.fn()}
        onRemembered={onRemembered}
        onForgotten={onForgotten}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '记住了' }));
    fireEvent.click(screen.getByRole('button', { name: '忘记了' }));

    expect(onRemembered).toHaveBeenCalledTimes(1);
    expect(onForgotten).toHaveBeenCalledTimes(1);
  });
});
