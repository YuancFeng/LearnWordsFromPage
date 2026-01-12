import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReviewPage } from './ReviewPage';
import type { WordRecord } from '../../shared/messaging/types';

const mockUseReview = vi.fn();

vi.mock('../../hooks/useReview', () => ({
  useReview: () => mockUseReview(),
}));

const baseWord: WordRecord = {
  id: 'word-1',
  text: 'context',
  meaning: '语境，背景说明',
  pronunciation: 'ˈkɒn.tekst',
  partOfSpeech: 'noun',
  exampleSentence: 'This is a context example sentence.',
  sourceUrl: 'https://example.com/article',
  sourceTitle: 'Example Article',
  xpath: '/html/body/div[1]/p[2]',
  textOffset: 10,
  contextBefore: 'This is a ',
  contextAfter: ' example sentence.',
  createdAt: 1700000000000,
  nextReviewAt: 1700086400000,
  reviewCount: 0,
  easeFactor: 2.5,
  interval: 1,
  tagIds: [],
};

describe('ReviewPage', () => {
  beforeEach(() => {
    mockUseReview.mockReset();
  });

  it('shows loading state', () => {
    mockUseReview.mockReturnValue({
      dueWords: [],
      isLoading: true,
      error: null,
      submitReview: vi.fn(),
    });

    render(<ReviewPage onBack={vi.fn()} />);

    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('shows empty state when no due words', () => {
    mockUseReview.mockReturnValue({
      dueWords: [],
      isLoading: false,
      error: null,
      submitReview: vi.fn(),
    });

    render(<ReviewPage onBack={vi.fn()} />);

    expect(screen.getByText('太棒了！')).toBeInTheDocument();
    expect(screen.getByText('暂无待复习词汇')).toBeInTheDocument();
  });

  it('shows progress and current word', () => {
    mockUseReview.mockReturnValue({
      dueWords: [baseWord, { ...baseWord, id: 'word-2', text: 'memory' }],
      isLoading: false,
      error: null,
      submitReview: vi.fn().mockResolvedValue(true),
    });

    render(<ReviewPage onBack={vi.fn()} />);

    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(screen.getAllByText('context').length).toBeGreaterThan(0);
  });
});
