import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { VocabularyList } from './VocabularyList';
import type { WordRecord } from '../../shared/messaging/types';

const mockUseSearch = vi.fn();

vi.mock('../../hooks/useSearch', () => ({
  useSearch: () => mockUseSearch(),
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

describe('VocabularyList', () => {
  beforeEach(() => {
    mockUseSearch.mockReset();
  });

  it('shows empty state when no words saved', () => {
    mockUseSearch.mockReturnValue({
      searchQuery: '',
      setSearchQuery: vi.fn(),
      searchResults: [],
      matchCount: 0,
      totalCount: 0,
      isSearching: false,
      clearSearch: vi.fn(),
      hasActiveSearch: false,
      error: null,
    });

    render(<VocabularyList />);

    expect(screen.getByText('No words saved yet')).toBeInTheDocument();
    expect(screen.getByText('Start reading and save new words!')).toBeInTheDocument();
  });

  it('toggles word details on expand/collapse', () => {
    mockUseSearch.mockReturnValue({
      searchQuery: '',
      setSearchQuery: vi.fn(),
      searchResults: [baseWord],
      matchCount: 1,
      totalCount: 1,
      isSearching: false,
      clearSearch: vi.fn(),
      hasActiveSearch: false,
      error: null,
    });

    render(<VocabularyList />);

    expect(screen.queryByText('Jump to Source')).not.toBeInTheDocument();

    const expandButton = screen.getByRole('button', { name: 'Expand word details' });
    fireEvent.click(expandButton);

    expect(screen.getByText('Jump to Source')).toBeInTheDocument();
    expect(screen.getByText('Source: Example Article')).toBeInTheDocument();

    const collapseButton = screen.getByRole('button', { name: 'Collapse word details' });
    fireEvent.click(collapseButton);

    expect(screen.queryByText('Jump to Source')).not.toBeInTheDocument();
  });
});
