# Story 2.2: View Vocabulary List

Status: done

## Story

As a English learner,
I want to view all saved words in the extension popup,
so that I can browse and manage my vocabulary library.

## Acceptance Criteria

### AC1: Display Vocabulary List
**Given** user has saved multiple words
**When** user clicks the "Vocabulary" tab in the Popup
**Then** display a list of all saved words
**And** each word entry shows: word text, part of speech, Chinese meaning, save time
**And** list is sorted by save time in descending order (newest first)

### AC2: Empty State Display
**Given** user has not saved any words
**When** user enters the vocabulary page
**Then** display empty state message: "No words saved yet. Start reading and save new words!"

### AC3: Word Detail Expansion
**Given** user is viewing the vocabulary list
**When** user clicks on a word entry
**Then** expand to show full information: pronunciation, complete meaning, example sentence, source page title
**And** display "Jump to Source" button

### AC4: Delete Word Function
**Given** user is viewing a word's details
**When** user clicks "Delete" button and confirms
**Then** delete the word record from IndexedDB
**And** list updates in real-time, removing the word

## Tasks / Subtasks

### Task 1: Create GET_WORDS Message Handler (AC: #1)
- [ ] 1.1 Define GET_WORDS message type in `src/shared/messaging/types.ts`
- [ ] 1.2 Implement `getAllWords(): Promise<Response<WordRecord[]>>` in wordService.ts
- [ ] 1.3 Query words by `byCreatedAt` index in descending order
- [ ] 1.4 Create handler in `src/background/handlers/wordHandlers.ts`
- [ ] 1.5 Register handler in Service Worker message router

### Task 2: Create DELETE_WORD Message Handler (AC: #4)
- [ ] 2.1 Define DELETE_WORD message type in `src/shared/messaging/types.ts`
- [ ] 2.2 Implement `deleteWord(id: string): Promise<Response<void>>` in wordService.ts
- [ ] 2.3 Create handler in wordHandlers.ts
- [ ] 2.4 Register handler in Service Worker message router

### Task 3: Create useVocabulary Hook (AC: #1, #4)
- [ ] 3.1 Create `src/hooks/useVocabulary.ts`
- [ ] 3.2 Implement state: `words`, `isLoading`, `error`
- [ ] 3.3 Implement `fetchWords()` - sends GET_WORDS message
- [ ] 3.4 Implement `removeWord(id)` - sends DELETE_WORD message
- [ ] 3.5 Implement `refreshWords()` for manual refresh
- [ ] 3.6 Auto-fetch on hook mount

### Task 4: Create Vocabulary List Component (AC: #1, #2)
- [ ] 4.1 Create `src/popup/components/VocabularyList.tsx`
- [ ] 4.2 Use `useVocabulary` hook for data
- [ ] 4.3 Render loading skeleton during fetch
- [ ] 4.4 Render empty state when no words
- [ ] 4.5 Render word list with WordCard components
- [ ] 4.6 Sort by createdAt descending

### Task 5: Create WordCard Component (AC: #3, #4)
- [ ] 5.1 Create `src/popup/components/WordCard.tsx`
- [ ] 5.2 Display collapsed state: word, partOfSpeech, meaning (truncated), save time
- [ ] 5.3 Implement expand/collapse toggle
- [ ] 5.4 Display expanded state: pronunciation, full meaning, example, source title
- [ ] 5.5 Add "Jump to Source" button (disabled for now, implement in Story 2.3)
- [ ] 5.6 Add "Delete" button with confirmation dialog
- [ ] 5.7 Style with Tailwind utility classes

### Task 6: Add Vocabulary Tab to Popup (AC: #1)
- [ ] 6.1 Update `App.tsx` to include tab navigation
- [ ] 6.2 Add "Vocabulary" tab alongside existing tabs
- [ ] 6.3 Render VocabularyList when tab is active
- [ ] 6.4 Persist active tab selection

## Dev Notes

### Technical Requirements

**Message Types:**
```typescript
// GET_WORDS - Fetch all saved words
interface GetWordsMessage {
  type: 'GET_WORDS';
  payload: {
    sortBy?: 'createdAt' | 'text' | 'nextReviewAt';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  };
}

// DELETE_WORD - Delete a word by ID
interface DeleteWordMessage {
  type: 'DELETE_WORD';
  payload: {
    id: string;
  };
}
```

**Response Structures:**
```typescript
// GET_WORDS Response
interface GetWordsResponse {
  success: true;
  data: WordRecord[];
}

// DELETE_WORD Response
interface DeleteWordResponse {
  success: true;
  data: void;
}
```

### File Structure

**Files to Create:**
```
src/popup/components/
  VocabularyList.tsx      # Main vocabulary list container
  WordCard.tsx            # Individual word card component
  EmptyState.tsx          # Empty state display component

src/hooks/
  useVocabulary.ts        # Vocabulary CRUD hook
```

**Files to Modify:**
```
src/popup/App.tsx                    # Add tab navigation
src/shared/messaging/types.ts        # Add GET_WORDS, DELETE_WORD types
src/shared/storage/wordService.ts    # Add getAllWords, deleteWord
src/background/handlers/wordHandlers.ts  # Add handlers
src/background/index.ts              # Register handlers
```

### Key Code Patterns

**Word Service - Get All Words:**
```typescript
// src/shared/storage/wordService.ts
export async function getAllWords(
  options?: { sortBy?: string; sortOrder?: 'asc' | 'desc' }
): Promise<Response<WordRecord[]>> {
  try {
    const db = await getDatabase();

    return new Promise((resolve) => {
      const tx = db.transaction('words', 'readonly');
      const store = tx.objectStore('words');
      const index = store.index('byCreatedAt');

      const words: WordRecord[] = [];
      const direction = options?.sortOrder === 'asc' ? 'next' : 'prev';
      const request = index.openCursor(null, direction);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          words.push(cursor.value);
          cursor.continue();
        } else {
          resolve({ success: true, data: words });
        }
      };

      request.onerror = () => resolve({
        success: false,
        error: { code: 'STORAGE_ERROR', message: 'Failed to fetch words' }
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

**Delete Word:**
```typescript
// src/shared/storage/wordService.ts
export async function deleteWord(id: string): Promise<Response<void>> {
  try {
    const db = await getDatabase();

    return new Promise((resolve) => {
      const tx = db.transaction('words', 'readwrite');
      const store = tx.objectStore('words');
      const request = store.delete(id);

      request.onsuccess = () => resolve({ success: true });
      request.onerror = () => resolve({
        success: false,
        error: { code: 'STORAGE_ERROR', message: 'Failed to delete word' }
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

**useVocabulary Hook:**
```typescript
// src/hooks/useVocabulary.ts
import { useState, useEffect, useCallback } from 'react';
import type { WordRecord, Response } from '@/shared/types';

interface UseVocabularyReturn {
  words: WordRecord[];
  isLoading: boolean;
  error: string | null;
  fetchWords: () => Promise<void>;
  removeWord: (id: string) => Promise<boolean>;
  refreshWords: () => Promise<void>;
}

export function useVocabulary(): UseVocabularyReturn {
  const [words, setWords] = useState<WordRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWords = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_WORDS',
        payload: { sortBy: 'createdAt', sortOrder: 'desc' }
      });

      if (response.success) {
        setWords(response.data);
      } else {
        setError(response.error?.message || 'Failed to fetch words');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeWord = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'DELETE_WORD',
        payload: { id }
      });

      if (response.success) {
        setWords(prev => prev.filter(w => w.id !== id));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    fetchWords();
  }, [fetchWords]);

  return { words, isLoading, error, fetchWords, removeWord, refreshWords: fetchWords };
}
```

**WordCard Component:**
```typescript
// src/popup/components/WordCard.tsx
import { useState } from 'react';
import { ChevronDown, ChevronUp, Trash2, ExternalLink } from 'lucide-react';

interface WordCardProps {
  word: WordRecord;
  onDelete: (id: string) => Promise<boolean>;
  onJumpToSource: (word: WordRecord) => void;
}

export function WordCard({ word, onDelete, onJumpToSource }: WordCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this word?')) return;

    setIsDeleting(true);
    await onDelete(word.id);
    setIsDeleting(false);
  };

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('zh-CN', {
      month: 'short',
      day: 'numeric'
    }).format(new Date(timestamp));
  };

  return (
    <div className="border rounded-lg p-3 mb-2 bg-white shadow-sm">
      {/* Collapsed View */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1">
          <span className="font-semibold text-lg">{word.text}</span>
          <span className="ml-2 text-xs text-gray-500">{word.partOfSpeech}</span>
          <p className="text-sm text-gray-700 truncate">{word.meaning}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{formatDate(word.createdAt)}</span>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Expanded View */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-sm text-gray-600 mb-1">
            <span className="font-medium">Pronunciation:</span> {word.pronunciation}
          </p>
          <p className="text-sm text-gray-700 mb-2">{word.meaning}</p>
          <p className="text-sm text-gray-500 italic mb-2">
            "{word.exampleSentence}"
          </p>
          <p className="text-xs text-gray-400 mb-3">
            Source: {word.sourceTitle}
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => onJumpToSource(word)}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
            >
              <ExternalLink size={14} />
              Jump to Source
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 disabled:opacity-50"
            >
              <Trash2 size={14} />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Empty State Component:**
```typescript
// src/popup/components/EmptyState.tsx
import { BookOpen } from 'lucide-react';

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <BookOpen size={48} className="text-gray-300 mb-4" />
      <h3 className="text-lg font-medium text-gray-600 mb-2">
        No words saved yet
      </h3>
      <p className="text-sm text-gray-400 max-w-xs">
        Start reading and save new words!
      </p>
    </div>
  );
}
```

### References

- Architecture Decision: Frontend Architecture (Section 3.1)
- PRD Section 4.3: FR-3.1 Vocabulary List
- Project Context: React/Hooks Rules
- Epics: Story 2.2 Acceptance Criteria

### Testing Considerations

1. Test empty state rendering when no words exist
2. Test list sorting by createdAt descending
3. Test expand/collapse toggle behavior
4. Test delete confirmation and list update
5. Test loading state during fetch
6. Test error state display
7. Mock chrome.runtime.sendMessage for unit tests

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex CLI)

### Completion Notes List

1. Popup entry renders VocabularyList with shared WordRecord flow
2. Word card uses expand/collapse and aligns empty/no-results copy with AC
3. Jump-to-source reports PAGE_INACCESSIBLE when content script is unreachable
4. Highlight uses <mark> with 0.5s fade after 5s and aligned toast copy
5. Search total count refreshes after non-empty queries
6. Added unit tests for list, search debounce, jump error handling, and highlight

### File List

**Created:**
- src/popup/components/VocabularyList.test.tsx
- src/hooks/useSearch.test.tsx
- src/background/handlers/navigationHandlers.test.ts
- src/content/highlight.test.ts

**Modified:**
- index.tsx
- src/popup/components/VocabularyList.tsx
- src/popup/components/NoResults.tsx
- src/hooks/useSearch.ts
- src/background/handlers/navigationHandlers.ts
- src/content/highlight.ts
- src/content/index.ts
