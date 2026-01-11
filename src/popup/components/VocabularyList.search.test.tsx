import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { VocabularyList } from './VocabularyList';
import type { WordRecord } from '../../shared/messaging';

const mockUseSearch = vi.fn();

vi.mock('../../hooks/useSearch', () => ({
  useSearch: () => mockUseSearch(),
}));

const baseWord: WordRecord = {
  id: 'word-1',
  text: 'context',
  meaning: '语境',
  pronunciation: '',
  partOfSpeech: '',
  exampleSentence: '',
  sourceUrl: '',
  sourceTitle: '',
  xpath: '',
  textOffset: 0,
  contextBefore: '',
  contextAfter: '',
  createdAt: 1,
  nextReviewAt: 1,
  reviewCount: 0,
  easeFactor: 2.5,
  interval: 1,
  tagIds: [],
};

describe('VocabularyList search states', () => {
  it('renders NoResults and clears search', () => {
    const clearSearch = vi.fn();
    mockUseSearch.mockReturnValue({
      searchQuery: 'missing',
      setSearchQuery: vi.fn(),
      searchResults: [],
      matchCount: 0,
      totalCount: 1,
      isSearching: false,
      clearSearch,
      hasActiveSearch: true,
      error: null,
    });

    render(<VocabularyList />);

    expect(screen.getByText('No matching words found')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear Search' }));

    expect(clearSearch).toHaveBeenCalled();
  });

  it('renders sorted words when results exist', () => {
    mockUseSearch.mockReturnValue({
      searchQuery: '',
      setSearchQuery: vi.fn(),
      searchResults: [baseWord, { ...baseWord, id: 'word-2', text: 'apple', createdAt: 2 }],
      matchCount: 2,
      totalCount: 2,
      isSearching: false,
      clearSearch: vi.fn(),
      hasActiveSearch: false,
      error: null,
    });

    render(<VocabularyList />);

    const cards = screen.getAllByRole('button', { name: /word details/i });
    expect(cards.length).toBe(2);
  });
});
