# Story 4.5: Advanced Search & Filter

Status: done

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

- [x] Task 1: Create SearchBar component (AC: #1)
  - [x] 1.1: Create `src/popup/components/SearchBar.tsx`
  - [x] 1.2: Implement debounced search input (300ms)
  - [x] 1.3: Add clear search button
  - [x] 1.4: Add search icon

- [x] Task 2: Implement search logic (AC: #1)
  - [x] 2.1: Create `src/hooks/useVocabularyFilter.ts` (matchesKeyword function)
  - [x] 2.2: Implement case-insensitive search on `text` and `meaning` fields
  - [x] 2.3: Create highlight matching function
  - [x] 2.4: Optimize search for large datasets (useMemo)

- [x] Task 3: Create TagFilter component (AC: #2)
  - [x] 3.1: Create `src/popup/components/TagFilter.tsx`
  - [x] 3.2: Display all available tags as selectable chips
  - [x] 3.3: Support multi-select (toggle selection)
  - [x] 3.4: Show selected tag badges

- [x] Task 4: Implement tag filtering logic (AC: #2)
  - [x] 4.1: Filter words by `tagIds` array intersection
  - [x] 4.2: Support "AND" logic for multiple tags (word must have all selected tags)
  - [x] 4.3: Optimize with IndexedDB `byTagId` index

- [x] Task 5: Create FilterControls component (AC: #3)
  - [x] 5.1: Integrated in `src/popup/components/VocabularyList.tsx` (lines 710-726)
  - [x] 5.2: Display active filter count
  - [x] 5.3: Add "Clear Filters" button
  - [x] 5.4: Show active filter summary

- [x] Task 6: Implement combined search and filter (AC: #1, #2, #3)
  - [x] 6.1: Create `useVocabularyFilter` hook
  - [x] 6.2: Combine keyword search with tag filter
  - [x] 6.3: Memoize filtered results for performance
  - [x] 6.4: Handle loading states

- [x] Task 7: Create EmptyState component (AC: #4)
  - [x] 7.1: EmptyState in `VocabularyList.tsx`, NoResults in `src/popup/components/NoResults.tsx`
  - [x] 7.2: Display message for no search results
  - [x] 7.3: Display message for no vocabulary (different from no results)
  - [x] 7.4: Add clear filters action in empty state

- [x] Task 8: Implement text highlighting (AC: #1)
  - [x] 8.1: Create `highlightText` in `src/popup/components/HighlightedText.tsx`
  - [x] 8.2: Wrap matching text in `<mark>` elements
  - [x] 8.3: Apply highlight styles

- [x] Task 9: Write unit tests
  - [x] 9.1: Test search matching logic (`useVocabularyFilter.test.ts`)
  - [x] 9.2: Test tag filtering logic (`TagFilter.test.tsx`)
  - [x] 9.3: Test combined search + filter (`useVocabularyFilter.test.ts`)
  - [x] 9.4: Test highlight function (`HighlightedText.test.tsx`)

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

---

## Dev Agent Record

### Implementation Plan
Story 4.5 功能在之前的开发迭代中已经完全实现。本次 Dev Agent 验证了所有 AC 均已满足：

1. **AC1 (关键词搜索高亮)**: SearchBar + HighlightedText 组件实现完整
2. **AC2 (多标签筛选)**: TagFilter + useVocabularyFilter 实现 AND 逻辑
3. **AC3 (清除筛选)**: VocabularyList 中内联实现清除全部筛选功能
4. **AC4 (空结果消息)**: EmptyState + NoResults 组件处理不同空状态

### Completion Notes
- 所有 9 个任务及其子任务已完成
- 502 个测试全部通过
- Build 成功无警告
- Task 5 (FilterControls) 采用内联方式集成在 VocabularyList 中，避免过度组件化
- Task 2 (searchUtils) 功能整合到 useVocabularyFilter hook 中，遵循项目现有模式

### Debug Log
无错误或调试问题。

---

## File List

### New Files
- `src/popup/components/SearchBar.tsx` - 搜索栏组件
- `src/popup/components/SearchBar.test.tsx` - SearchBar 测试
- `src/popup/components/TagFilter.tsx` - 标签筛选组件
- `src/popup/components/TagFilter.test.tsx` - TagFilter 测试
- `src/popup/components/HighlightedText.tsx` - 文本高亮组件
- `src/popup/components/HighlightedText.test.tsx` - HighlightedText 测试
- `src/popup/components/NoResults.tsx` - 搜索无结果组件
- `src/popup/components/NoResults.test.tsx` - NoResults 测试
- `src/hooks/useVocabularyFilter.ts` - 词汇筛选 Hook
- `src/hooks/useVocabularyFilter.test.ts` - useVocabularyFilter 测试

### Modified Files
- `src/popup/components/VocabularyList.tsx` - 集成搜索、筛选、高亮功能

---

## Change Log

| Date | Changes | Author |
|------|---------|--------|
| 2026-01-12 | Story 4.5 验证完成，所有任务已实现，502 测试通过 | Dev Agent (Amelia) |
