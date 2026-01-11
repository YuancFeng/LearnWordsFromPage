# Story 4.5: Advanced Search & Filter

Status: ready-for-dev

## Story

As a LingoRecall user,
I want to quickly find vocabulary through keyword search and filter conditions,
so that I can efficiently locate target words in a large vocabulary collection.

## Acceptance Criteria

### AC1: Keyword Search with Highlighting
**Given** the user is on the vocabulary page
**When** the user enters a keyword in the search box
**Then** vocabulary items containing the keyword in word text or meaning are displayed in real-time
**And** matching text is highlighted in the search results

### AC2: Multi-Tag Filtering
**Given** the user has created tags in the vocabulary page
**When** the user selects one or more tags in the tag filter
**Then** only vocabulary items containing the selected tags are displayed
**And** the current filter conditions are shown as tag badges

### AC3: Clear Filters
**Given** the user has applied search and filter conditions
**When** the user clicks the "Clear Filters" button
**Then** all filter conditions are reset
**And** the complete vocabulary list is displayed

### AC4: Empty Results Message
**Given** search or filter results are empty
**When** the results finish loading
**Then** a friendly "No matching vocabulary found" message is displayed

## Tasks / Subtasks

- [ ] Task 1: Create SearchBar component (AC: #1)
  - [ ] 1.1: Create `src/popup/components/SearchBar.tsx`
  - [ ] 1.2: Implement debounced search input (300ms)
  - [ ] 1.3: Add clear search button
  - [ ] 1.4: Add search icon

- [ ] Task 2: Implement search logic (AC: #1)
  - [ ] 2.1: Create `src/shared/utils/searchUtils.ts`
  - [ ] 2.2: Implement case-insensitive search on `text` and `meaning` fields
  - [ ] 2.3: Create highlight matching function
  - [ ] 2.4: Optimize search for large datasets

- [ ] Task 3: Create TagFilter component (AC: #2)
  - [ ] 3.1: Create `src/popup/components/TagFilter.tsx`
  - [ ] 3.2: Display all available tags as selectable chips
  - [ ] 3.3: Support multi-select (toggle selection)
  - [ ] 3.4: Show selected tag badges

- [ ] Task 4: Implement tag filtering logic (AC: #2)
  - [ ] 4.1: Filter words by `tagIds` array intersection
  - [ ] 4.2: Support "AND" logic for multiple tags (word must have all selected tags)
  - [ ] 4.3: Optimize with IndexedDB `byTagId` index

- [ ] Task 5: Create FilterControls component (AC: #3)
  - [ ] 5.1: Create `src/popup/components/FilterControls.tsx`
  - [ ] 5.2: Display active filter count
  - [ ] 5.3: Add "Clear Filters" button
  - [ ] 5.4: Show active filter summary

- [ ] Task 6: Implement combined search and filter (AC: #1, #2, #3)
  - [ ] 6.1: Create `useVocabularySearch` hook
  - [ ] 6.2: Combine keyword search with tag filter
  - [ ] 6.3: Memoize filtered results for performance
  - [ ] 6.4: Handle loading states

- [ ] Task 7: Create EmptyState component (AC: #4)
  - [ ] 7.1: Create `src/popup/components/EmptyState.tsx`
  - [ ] 7.2: Display message for no search results
  - [ ] 7.3: Display message for no vocabulary (different from no results)
  - [ ] 7.4: Add clear filters action in empty state

- [ ] Task 8: Implement text highlighting (AC: #1)
  - [ ] 8.1: Create `highlightText` utility function
  - [ ] 8.2: Wrap matching text in `<mark>` elements
  - [ ] 8.3: Apply highlight styles

- [ ] Task 9: Write unit tests
  - [ ] 9.1: Test search matching logic
  - [ ] 9.2: Test tag filtering logic
  - [ ] 9.3: Test combined search + filter
  - [ ] 9.4: Test highlight function

## Dev Notes

### Technical Requirements

#### Search Utilities
```typescript
// src/shared/utils/searchUtils.ts

/**
 * Check if word matches search keyword
 */
export function matchesSearch(word: WordRecord, keyword: string): boolean {
  const normalizedKeyword = keyword.toLowerCase().trim();
  if (!normalizedKeyword) return true;

  const textMatch = word.text.toLowerCase().includes(normalizedKeyword);
  const meaningMatch = word.meaning.toLowerCase().includes(normalizedKeyword);

  return textMatch || meaningMatch;
}

/**
 * Check if word has all specified tags
 */
export function matchesTags(word: WordRecord, selectedTagIds: string[]): boolean {
  if (selectedTagIds.length === 0) return true;

  return selectedTagIds.every(tagId => word.tagIds.includes(tagId));
}

/**
 * Highlight matching text in a string
 */
export function highlightText(text: string, keyword: string): React.ReactNode {
  if (!keyword.trim()) return text;

  const normalizedKeyword = keyword.toLowerCase();
  const index = text.toLowerCase().indexOf(normalizedKeyword);

  if (index === -1) return text;

  const before = text.slice(0, index);
  const match = text.slice(index, index + keyword.length);
  const after = text.slice(index + keyword.length);

  return (
    <>
      {before}
      <mark className="bg-yellow-200 rounded px-0.5">{match}</mark>
      {highlightText(after, keyword)}
    </>
  );
}

/**
 * Debounce function for search input
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

### File Structure

**Files to Create:**
```
src/
  shared/
    utils/
      searchUtils.ts          # Search and highlight utilities
  hooks/
    useVocabularySearch.ts    # Combined search/filter hook
  popup/
    components/
      SearchBar.tsx           # Search input component
      TagFilter.tsx           # Tag selection filter
      FilterControls.tsx      # Filter management controls
      EmptyState.tsx          # Empty state display
      HighlightedText.tsx     # Text with search highlighting
```

**Files to Modify:**
```
src/popup/components/WordCard.tsx   # Add highlight support
src/popup/pages/VocabularyPage.tsx  # Integrate search/filter
```

### Key Code Patterns

#### useVocabularySearch Hook
```typescript
// src/hooks/useVocabularySearch.ts
interface SearchFilters {
  keyword: string;
  tagIds: string[];
}

interface VocabularySearchResult {
  words: WordRecord[];
  filteredCount: number;
  totalCount: number;
  isFiltering: boolean;
}

export function useVocabularySearch(allWords: WordRecord[]) {
  const [filters, setFilters] = useState<SearchFilters>({
    keyword: '',
    tagIds: [],
  });

  const debouncedKeyword = useDebounce(filters.keyword, 300);

  const filteredWords = useMemo(() => {
    return allWords.filter(word =>
      matchesSearch(word, debouncedKeyword) &&
      matchesTags(word, filters.tagIds)
    );
  }, [allWords, debouncedKeyword, filters.tagIds]);

  const setKeyword = (keyword: string) => {
    setFilters(prev => ({ ...prev, keyword }));
  };

  const toggleTag = (tagId: string) => {
    setFilters(prev => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter(id => id !== tagId)
        : [...prev.tagIds, tagId],
    }));
  };

  const clearFilters = () => {
    setFilters({ keyword: '', tagIds: [] });
  };

  const hasActiveFilters = debouncedKeyword.length > 0 || filters.tagIds.length > 0;

  return {
    words: filteredWords,
    filters,
    setKeyword,
    toggleTag,
    clearFilters,
    hasActiveFilters,
    filteredCount: filteredWords.length,
    totalCount: allWords.length,
    isFiltering: filters.keyword !== debouncedKeyword,
  };
}
```

#### SearchBar Component
```typescript
// src/popup/components/SearchBar.tsx
interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Search vocabulary...' }: SearchBarProps) {
  return (
    <div className="relative">
      <Search
        size={18}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}
```

#### TagFilter Component
```typescript
// src/popup/components/TagFilter.tsx
interface TagFilterProps {
  tags: Tag[];
  selectedIds: string[];
  onToggle: (tagId: string) => void;
}

export function TagFilter({ tags, selectedIds, onToggle }: TagFilterProps) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-600">Filter by tags</label>
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => {
          const isSelected = selectedIds.includes(tag.id);
          return (
            <button
              key={tag.id}
              onClick={() => onToggle(tag.id)}
              className={`
                px-3 py-1 rounded-full text-sm transition-colors
                ${isSelected
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
              `}
              style={isSelected ? { backgroundColor: tag.color } : undefined}
            >
              {tag.name}
              {isSelected && <Check size={14} className="inline ml-1" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

#### FilterControls Component
```typescript
// src/popup/components/FilterControls.tsx
interface FilterControlsProps {
  filteredCount: number;
  totalCount: number;
  hasActiveFilters: boolean;
  selectedTags: Tag[];
  keyword: string;
  onClearFilters: () => void;
}

export function FilterControls({
  filteredCount,
  totalCount,
  hasActiveFilters,
  selectedTags,
  keyword,
  onClearFilters,
}: FilterControlsProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>
          Showing {filteredCount} of {totalCount} words
        </span>

        {/* Active Filter Badges */}
        {keyword && (
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
            "{keyword}"
          </span>
        )}
        {selectedTags.map(tag => (
          <span
            key={tag.id}
            className="px-2 py-0.5 rounded-full text-xs text-white"
            style={{ backgroundColor: tag.color }}
          >
            {tag.name}
          </span>
        ))}
      </div>

      {hasActiveFilters && (
        <button
          onClick={onClearFilters}
          className="text-sm text-blue-500 hover:text-blue-700"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
```

#### EmptyState Component
```typescript
// src/popup/components/EmptyState.tsx
interface EmptyStateProps {
  type: 'no-results' | 'no-vocabulary';
  onClearFilters?: () => void;
}

export function EmptyState({ type, onClearFilters }: EmptyStateProps) {
  if (type === 'no-vocabulary') {
    return (
      <div className="text-center py-12">
        <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-700">No vocabulary yet</h3>
        <p className="text-gray-500 mt-1">
          Start browsing web pages and save words to build your vocabulary!
        </p>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <SearchX size={48} className="mx-auto text-gray-300 mb-4" />
      <h3 className="text-lg font-medium text-gray-700">No matching vocabulary</h3>
      <p className="text-gray-500 mt-1">
        Try adjusting your search or filter criteria
      </p>
      {onClearFilters && (
        <button
          onClick={onClearFilters}
          className="mt-4 text-blue-500 hover:text-blue-700"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}
```

#### HighlightedText Component
```typescript
// src/popup/components/HighlightedText.tsx
interface HighlightedTextProps {
  text: string;
  keyword: string;
}

export function HighlightedText({ text, keyword }: HighlightedTextProps) {
  if (!keyword.trim()) {
    return <>{text}</>;
  }

  const parts = text.split(new RegExp(`(${escapeRegExp(keyword)})`, 'gi'));

  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === keyword.toLowerCase() ? (
          <mark key={index} className="bg-yellow-200 rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

### Performance Optimization

1. **Debounced Search**: 300ms delay prevents excessive re-filtering
2. **Memoized Results**: `useMemo` prevents recalculation on unrelated re-renders
3. **IndexedDB Index**: Use `byTagId` index for optimized tag queries
4. **Virtualized List**: For large vocabularies (500+ words), consider virtualization

### References

- Architecture: `/Users/fengyuanchang/Projects_WSL/LearnWordsFromPage/_bmad-output/planning-artifacts/architecture.md` - Section "FR-3.3 Search and Filter"
- PRD: `/Users/fengyuanchang/Projects_WSL/LearnWordsFromPage/_bmad-output/planning-artifacts/prd.md` - Section "3.4 Epic 4: Vocabulary Management"
- Epics: `/Users/fengyuanchang/Projects_WSL/LearnWordsFromPage/_bmad-output/planning-artifacts/epics.md` - Story 4.5
- Project Context: `/Users/fengyuanchang/Projects_WSL/LearnWordsFromPage/_bmad-output/planning-artifacts/project-context.md` - NFR Performance Requirements
