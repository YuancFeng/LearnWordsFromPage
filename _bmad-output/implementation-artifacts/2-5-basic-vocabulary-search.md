# Story 2.5: Basic Vocabulary Search

Status: done

## Story

As a English learner,
I want to search for words in my vocabulary list,
so that I can quickly find words I want to review when my vocabulary grows large.

## Acceptance Criteria

### AC1: Real-time Search with Debounce
**Given** user has multiple words in vocabulary
**When** user types keywords in the search box
**Then** display matching results in real-time (debounce 300ms)
**And** match words containing the keyword in word text or meaning
**And** display match count

### AC2: Sorting Options
**Given** user is viewing the vocabulary list
**When** user clicks sorting option
**Then** available options: Most Recent, Oldest First, Alphabetical
**And** list immediately re-sorts by selected method

### AC3: No Results State
**Given** search returns no matching words
**When** no words in vocabulary match the keyword
**Then** display "No matching words found"
**And** provide "Clear Search" button

## Tasks / Subtasks

### Task 1: Implement Search Service (AC: #1)
- [x] 1.1 Create `src/shared/storage/searchService.ts` (实现在 wordService.ts)
- [x] 1.2 Implement `searchWords(query: string): Promise<Response<WordRecord[]>>`
- [x] 1.3 Search in word.text and word.meaning fields
- [x] 1.4 Return matching results with match count
- [x] 1.5 Handle empty query (return all words)

### Task 2: Add SEARCH_WORDS Message Handler (AC: #1)
- [x] 2.1 Define SEARCH_WORDS message type in `src/shared/messaging/types.ts` (使用 GET_WORDS + searchQuery)
- [x] 2.2 Create handler in `src/background/handlers/wordHandlers.ts` (实现在 background/index.ts)
- [x] 2.3 Register handler in Service Worker message router

### Task 3: Implement useSearch Hook (AC: #1)
- [x] 3.1 Create `src/hooks/useSearch.ts`
- [x] 3.2 Implement debounced search with 300ms delay
- [x] 3.3 Track searchQuery, results, isSearching, matchCount states
- [x] 3.4 Implement clearSearch() function
- [x] 3.5 Return search states and handlers

### Task 4: Create SearchBar Component (AC: #1, #3)
- [x] 4.1 Create `src/popup/components/SearchBar.tsx`
- [x] 4.2 Input field with search icon and clear button
- [x] 4.3 Emit onChange with debounce handling in parent
- [x] 4.4 Show loading indicator during search
- [x] 4.5 Show match count badge when results available

### Task 5: Implement Sorting Functionality (AC: #2)
- [x] 5.1 Create `src/popup/components/SortDropdown.tsx`
- [x] 5.2 Define SortOption type: 'recent' | 'oldest' | 'alphabetical'
- [x] 5.3 Implement sort logic in useVocabulary hook (实现在 VocabularyList)
- [x] 5.4 Update VocabularyList to use sortOption state
- [x] 5.5 Persist sort preference in chrome.storage.local

### Task 6: Create NoResults Component (AC: #3)
- [x] 6.1 Create `src/popup/components/NoResults.tsx`
- [x] 6.2 Display search icon and "No matching words found" message
- [x] 6.3 Include "Clear Search" button
- [x] 6.4 Connect to clearSearch handler

### Task 7: Integrate Search into VocabularyList (AC: #1, #2, #3)
- [x] 7.1 Add SearchBar above word list
- [x] 7.2 Add SortDropdown next to SearchBar
- [x] 7.3 Filter words based on search results
- [x] 7.4 Show NoResults when search returns empty
- [x] 7.5 Update match count display

## Dev Notes

### Technical Requirements

**Message Types:**
```typescript
// SEARCH_WORDS - Search vocabulary by keyword
interface SearchWordsMessage {
  type: 'SEARCH_WORDS';
  payload: {
    query: string;
    sortBy?: 'createdAt' | 'text';
    sortOrder?: 'asc' | 'desc';
  };
}

// Response
interface SearchWordsResponse {
  success: true;
  data: {
    words: WordRecord[];
    matchCount: number;
    totalCount: number;
  };
}
```

**Sort Options:**
```typescript
type SortOption = 'recent' | 'oldest' | 'alphabetical';

const SORT_CONFIG: Record<SortOption, { field: keyof WordRecord; order: 'asc' | 'desc' }> = {
  recent: { field: 'createdAt', order: 'desc' },
  oldest: { field: 'createdAt', order: 'asc' },
  alphabetical: { field: 'text', order: 'asc' },
};
```

### File Structure

**Files to Create:**
```
src/shared/storage/
  searchService.ts          # Search logic

src/hooks/
  useSearch.ts              # Search state and debounce

src/popup/components/
  SearchBar.tsx             # Search input component
  SortDropdown.tsx          # Sort selection dropdown
  NoResults.tsx             # No results state display
```

**Files to Modify:**
```
src/shared/messaging/types.ts        # Add SEARCH_WORDS type
src/background/handlers/wordHandlers.ts  # Add search handler
src/background/index.ts              # Register handler
src/hooks/useVocabulary.ts           # Add sorting logic
src/popup/components/VocabularyList.tsx  # Integrate search UI
```

### Key Code Patterns

**Search Service:**
```typescript
// src/shared/storage/searchService.ts
import { getDatabase } from './db';
import type { WordRecord, Response } from '@/shared/types';

interface SearchResult {
  words: WordRecord[];
  matchCount: number;
  totalCount: number;
}

export async function searchWords(
  query: string,
  options?: { sortBy?: string; sortOrder?: 'asc' | 'desc' }
): Promise<Response<SearchResult>> {
  try {
    const db = await getDatabase();

    return new Promise((resolve) => {
      const tx = db.transaction('words', 'readonly');
      const store = tx.objectStore('words');
      const request = store.getAll();

      request.onsuccess = () => {
        const allWords: WordRecord[] = request.result;
        const totalCount = allWords.length;

        // Filter by query
        const normalizedQuery = query.toLowerCase().trim();
        const matchingWords = normalizedQuery
          ? allWords.filter(word =>
              word.text.toLowerCase().includes(normalizedQuery) ||
              word.meaning.toLowerCase().includes(normalizedQuery)
            )
          : allWords;

        // Sort results
        const sortField = options?.sortBy || 'createdAt';
        const sortOrder = options?.sortOrder || 'desc';

        matchingWords.sort((a, b) => {
          const aVal = a[sortField as keyof WordRecord];
          const bVal = b[sortField as keyof WordRecord];

          if (typeof aVal === 'string' && typeof bVal === 'string') {
            return sortOrder === 'asc'
              ? aVal.localeCompare(bVal)
              : bVal.localeCompare(aVal);
          }

          if (typeof aVal === 'number' && typeof bVal === 'number') {
            return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
          }

          return 0;
        });

        resolve({
          success: true,
          data: {
            words: matchingWords,
            matchCount: matchingWords.length,
            totalCount
          }
        });
      };

      request.onerror = () => resolve({
        success: false,
        error: { code: 'STORAGE_ERROR', message: 'Search failed' }
      });
    });
  } catch (error) {
    return {
      success: false,
      error: { code: 'STORAGE_ERROR', message: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}
```

**useSearch Hook with Debounce:**
```typescript
// src/hooks/useSearch.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import type { WordRecord } from '@/shared/types';

interface UseSearchReturn {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: WordRecord[] | null;
  matchCount: number;
  totalCount: number;
  isSearching: boolean;
  clearSearch: () => void;
}

export function useSearch(): UseSearchReturn {
  const [searchQuery, setSearchQueryState] = useState('');
  const [searchResults, setSearchResults] = useState<WordRecord[] | null>(null);
  const [matchCount, setMatchCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const performSearch = useCallback(async (query: string) => {
    setIsSearching(true);

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SEARCH_WORDS',
        payload: { query }
      });

      if (response.success) {
        setSearchResults(response.data.words);
        setMatchCount(response.data.matchCount);
        setTotalCount(response.data.totalCount);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setSearchQueryState(query);

    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new debounced search
    debounceTimer.current = setTimeout(() => {
      performSearch(query);
    }, 300);
  }, [performSearch]);

  const clearSearch = useCallback(() => {
    setSearchQueryState('');
    setSearchResults(null);
    setMatchCount(0);
    performSearch('');
  }, [performSearch]);

  // Initial load
  useEffect(() => {
    performSearch('');
  }, [performSearch]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    matchCount,
    totalCount,
    isSearching,
    clearSearch
  };
}
```

**SearchBar Component:**
```typescript
// src/popup/components/SearchBar.tsx
import { Search, X, Loader2 } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  isSearching: boolean;
  matchCount: number;
  totalCount: number;
}

export function SearchBar({
  value,
  onChange,
  onClear,
  isSearching,
  matchCount,
  totalCount
}: SearchBarProps) {
  const showCount = value.length > 0 && !isSearching;

  return (
    <div className="relative mb-3">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search words..."
          className="w-full pl-9 pr-20 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {isSearching && (
            <Loader2 size={16} className="text-gray-400 animate-spin" />
          )}
          {showCount && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              {matchCount}/{totalCount}
            </span>
          )}
          {value && (
            <button
              onClick={onClear}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X size={14} className="text-gray-400" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

**SortDropdown Component:**
```typescript
// src/popup/components/SortDropdown.tsx
import { useState, useRef, useEffect } from 'react';
import { ArrowUpDown, Check } from 'lucide-react';

export type SortOption = 'recent' | 'oldest' | 'alphabetical';

interface SortDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

const SORT_LABELS: Record<SortOption, string> = {
  recent: 'Most Recent',
  oldest: 'Oldest First',
  alphabetical: 'Alphabetical',
};

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
      >
        <ArrowUpDown size={14} />
        <span>{SORT_LABELS[value]}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
          {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
            <button
              key={option}
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
            >
              <span>{SORT_LABELS[option]}</span>
              {value === option && <Check size={14} className="text-blue-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

**NoResults Component:**
```typescript
// src/popup/components/NoResults.tsx
import { SearchX } from 'lucide-react';

interface NoResultsProps {
  query: string;
  onClear: () => void;
}

export function NoResults({ query, onClear }: NoResultsProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <SearchX size={48} className="text-gray-300 mb-4" />
      <h3 className="text-lg font-medium text-gray-600 mb-2">
        No matching words found
      </h3>
      <p className="text-sm text-gray-400 mb-4">
        No words match "{query}"
      </p>
      <button
        onClick={onClear}
        className="px-4 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
      >
        Clear Search
      </button>
    </div>
  );
}
```

**Updated VocabularyList with Search:**
```typescript
// src/popup/components/VocabularyList.tsx
import { useSearch } from '@/hooks/useSearch';
import { SearchBar } from './SearchBar';
import { SortDropdown, SortOption } from './SortDropdown';
import { WordCard } from './WordCard';
import { EmptyState } from './EmptyState';
import { NoResults } from './NoResults';
import { useState, useEffect } from 'react';

export function VocabularyList() {
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    matchCount,
    totalCount,
    isSearching,
    clearSearch
  } = useSearch();

  const [sortOption, setSortOption] = useState<SortOption>('recent');

  // Persist sort preference
  useEffect(() => {
    chrome.storage.local.get(['sortOption'], (result) => {
      if (result.sortOption) {
        setSortOption(result.sortOption);
      }
    });
  }, []);

  const handleSortChange = (option: SortOption) => {
    setSortOption(option);
    chrome.storage.local.set({ sortOption: option });
  };

  const handleJumpToSource = async (word: WordRecord) => {
    // Implemented in Story 2.3
    await chrome.runtime.sendMessage({
      type: 'JUMP_TO_SOURCE',
      payload: { /* ... */ }
    });
  };

  const handleDelete = async (id: string): Promise<boolean> => {
    const response = await chrome.runtime.sendMessage({
      type: 'DELETE_WORD',
      payload: { id }
    });
    if (response.success) {
      // Refresh search results
      setSearchQuery(searchQuery);
    }
    return response.success;
  };

  const words = searchResults || [];

  // Sort words locally
  const sortedWords = [...words].sort((a, b) => {
    switch (sortOption) {
      case 'recent':
        return b.createdAt - a.createdAt;
      case 'oldest':
        return a.createdAt - b.createdAt;
      case 'alphabetical':
        return a.text.localeCompare(b.text);
      default:
        return 0;
    }
  });

  // Determine what to render
  const renderContent = () => {
    // Empty vocabulary
    if (totalCount === 0) {
      return <EmptyState />;
    }

    // No search results
    if (searchQuery && sortedWords.length === 0) {
      return <NoResults query={searchQuery} onClear={clearSearch} />;
    }

    // Word list
    return sortedWords.map(word => (
      <WordCard
        key={word.id}
        word={word}
        onDelete={handleDelete}
        onJumpToSource={handleJumpToSource}
      />
    ));
  };

  return (
    <div className="p-4">
      <div className="flex gap-2 mb-4">
        <div className="flex-1">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onClear={clearSearch}
            isSearching={isSearching}
            matchCount={matchCount}
            totalCount={totalCount}
          />
        </div>
        <SortDropdown
          value={sortOption}
          onChange={handleSortChange}
        />
      </div>

      <div className="space-y-2">
        {renderContent()}
      </div>
    </div>
  );
}
```

### References

- Architecture Decision: Frontend Architecture (Section 3.1)
- PRD Section 4.3: FR-3.3 Search and Filter
- Project Context: React/Hooks Rules
- Epics: Story 2.5 Acceptance Criteria

### Testing Considerations

1. Test debounce timing (300ms delay)
2. Test search matches in both text and meaning
3. Test case-insensitive search
4. Test empty query returns all results
5. Test sort options apply correctly
6. Test sort preference persistence
7. Test clear search functionality
8. Test no results state display
9. Mock chrome.runtime.sendMessage for unit tests
10. Test keyboard navigation in dropdown

---

## Dev Agent Record

**Agent**: Amelia (Dev Agent)
**Date**: 2026-01-10
**Implementation Notes**:

### 实现概述

Story 2.5 代码已完整实现，本次工作主要进行代码验证和测试扩展。

### 代码实现验证

1. **Search Service** - `src/shared/storage/wordService.ts:475-539`
   - `searchWords()` 函数完整实现搜索逻辑
   - 支持大小写不敏感搜索
   - 在 word.text 和 word.meaning 中匹配
   - 支持排序参数

2. **Message Handler** - `src/background/index.ts:145-182`
   - GET_WORDS handler 支持 searchQuery 参数
   - 调用 searchWords 服务

3. **useSearch Hook** - `src/hooks/useSearch.ts`
   - 300ms 防抖实现
   - 完整状态管理
   - 增加请求序列控制，避免旧请求覆盖新结果
   - clearSearch 功能

4. **UI Components**
   - `SearchBar.tsx` - 搜索输入框、加载状态、匹配计数
   - `SortDropdown.tsx` - 排序选项文案对齐 AC
   - `NoResults.tsx` - 空结果状态、Clear Search 按钮

5. **VocabularyList 集成** - `src/popup/components/VocabularyList.tsx`
   - SearchBar 和 SortDropdown 集成
   - 排序偏好持久化
   - NoResults 状态处理

6. **测试补强**
   - `useSearch.test.tsx` - 防抖/并发请求覆盖
   - `SortDropdown.test.tsx` - 排序文案与交互
   - `VocabularyList.search.test.tsx` - 无结果清除按钮

### 测试扩展

扩展测试覆盖率从 53 个测试增加到 102 个测试：

| 测试文件 | 测试数 | 覆盖内容 |
|---------|-------|---------|
| wordService.test.ts | 11 | searchWords 函数 8 个新测试 |
| useSearch.test.tsx | 6 | 防抖、初始化、清除、错误处理 |
| SearchBar.test.tsx | 15 | 输入、加载、计数、清除、键盘 |
| SortDropdown.test.tsx | 11 | 选项、选择、关闭、禁用 |
| NoResults.test.tsx | 8 | 消息、按钮、特殊字符 |

### 验证结果

```
Test Files  12 passed (12)
Tests       102 passed (102)
Duration    20.00s
```

所有 AC 验证通过：
- ✅ AC1: 实时搜索 300ms 防抖
- ✅ AC2: 三种排序选项 + 偏好持久化
- ✅ AC3: 无结果状态 + Clear Search 按钮

---

## Change Log

| Date | Change | Files |
|------|--------|-------|
| 2026-01-10 | 验证代码实现完整性 | 全部实现文件 |
| 2026-01-10 | 扩展 wordService 测试 | wordService.test.ts (+8 tests) |
| 2026-01-10 | 扩展 useSearch 测试 | useSearch.test.tsx (+5 tests) |
| 2026-01-10 | 创建 SearchBar 测试 | SearchBar.test.tsx (15 tests) |
| 2026-01-10 | 创建 SortDropdown 测试 | SortDropdown.test.tsx (11 tests) |
| 2026-01-10 | 创建 NoResults 测试 | NoResults.test.tsx (8 tests) |
| 2026-01-10 | 标记所有任务完成 | 2-5-basic-vocabulary-search.md |
| 2026-01-10 | 故事状态更新为 done | sprint-status.yaml |
