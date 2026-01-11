# Story 2.1: Save Words to Local Database

Status: done

## Story

As a English learner,
I want to save queried words to local storage,
so that I can review these words anytime, even offline.

## Acceptance Criteria

### AC1: Save Word Successfully
**Given** user has queried a word in the popup and sees the translation
**When** user clicks the "Save" button
**Then** system stores the word info into IndexedDB `words` Object Store
**And** saved data includes: id, text, meaning, pronunciation, partOfSpeech, exampleSentence
**And** saved data includes source info: sourceUrl, sourceTitle, xpath, textOffset, contextBefore, contextAfter
**And** initialize review parameters: createdAt=current timestamp, nextReviewAt=current timestamp + 1 day, reviewCount=0
**And** displays "Saved successfully" Toast notification

### AC2: Prevent Duplicate Entries
**Given** user has already saved the same word (same text + same sourceUrl + same xpath)
**When** user tries to save again
**Then** system shows "This word has already been saved"
**And** no duplicate record is created

### AC3: Auto-create Database on First Use
**Given** user uses the extension for the first time
**When** extension loads
**Then** automatically create IndexedDB database "LingoRecallDB"
**And** create words Object Store with keyPath "id"
**And** create indexes: byCreatedAt, byNextReviewAt, byTagId (multiEntry), bySourceUrl

## Tasks / Subtasks

### Task 1: Implement IndexedDB Database Layer (AC: #3)
- [ ] 1.1 Create `src/shared/storage/db.ts` with database initialization
- [ ] 1.2 Define database schema with version 1
- [ ] 1.3 Implement `initDatabase()` function with upgrade handling
- [ ] 1.4 Create words Object Store with keyPath "id"
- [ ] 1.5 Create tags Object Store with keyPath "id"
- [ ] 1.6 Add index: byCreatedAt on `createdAt` field
- [ ] 1.7 Add index: byNextReviewAt on `nextReviewAt` field
- [ ] 1.8 Add index: byTagId on `tagIds` field with multiEntry: true
- [ ] 1.9 Add index: bySourceUrl on `sourceUrl` field

### Task 2: Implement Word Save Service (AC: #1)
- [ ] 2.1 Create `src/shared/storage/wordService.ts`
- [ ] 2.2 Implement `saveWord(word: WordRecord): Promise<Response<void>>`
- [ ] 2.3 Generate UUID for word id using `crypto.randomUUID()`
- [ ] 2.4 Set default values: createdAt, nextReviewAt (now + 1 day), reviewCount=0, interval=1
- [ ] 2.5 Return unified Response structure

### Task 3: Implement Duplicate Detection (AC: #2)
- [ ] 3.1 Implement `findDuplicateWord(text, sourceUrl, xpath): Promise<WordRecord | null>`
- [ ] 3.2 Use compound query: text + sourceUrl + xpath
- [ ] 3.3 Return existing word if found, null otherwise
- [ ] 3.4 Integrate duplicate check into saveWord flow

### Task 4: Implement Service Worker Message Handler (AC: #1, #2)
- [ ] 4.1 Create `src/background/handlers/wordHandlers.ts`
- [ ] 4.2 Implement `handleSaveWord(payload): Promise<Response<void>>`
- [ ] 4.3 Check for duplicates before saving
- [ ] 4.4 Return appropriate error for duplicate attempts
- [ ] 4.5 Register handler in Service Worker message router

### Task 5: Implement Save Button UI and Toast (AC: #1, #2)
- [ ] 5.1 Update `AnalysisPopup.tsx` to include Save button
- [ ] 5.2 Implement `handleSave()` that sends SAVE_WORD message
- [ ] 5.3 Create Toast component for success/error feedback
- [ ] 5.4 Handle loading state during save operation
- [ ] 5.5 Display appropriate message for duplicate detection

## Dev Notes

### Technical Requirements

**IndexedDB Schema:**
```typescript
// Database: LingoRecallDB v1
const DB_NAME = 'LingoRecallDB';
const DB_VERSION = 1;

interface WordRecord {
  id: string;                    // UUID (keyPath)
  text: string;                  // Word/phrase text
  meaning: string;               // AI-generated explanation
  pronunciation: string;         // IPA pronunciation
  partOfSpeech: string;          // Part of speech
  exampleSentence: string;       // Original context

  // Source location
  sourceUrl: string;             // Source URL
  sourceTitle: string;           // Page title
  xpath: string;                 // Element XPath
  textOffset: number;            // Text offset
  contextBefore: string;         // 100 chars before
  contextAfter: string;          // 100 chars after

  // Learning state
  tagIds: string[];              // Tag ID array
  createdAt: number;             // Creation timestamp
  nextReviewAt: number;          // Next review timestamp
  reviewCount: number;           // Review count
  easeFactor: number;            // SM-2 difficulty factor
  interval: number;              // Current review interval (days)
}
```

**Message Type:**
```typescript
interface SaveWordMessage {
  type: 'SAVE_WORD';
  payload: Omit<WordRecord, 'id' | 'createdAt' | 'nextReviewAt' | 'reviewCount' | 'easeFactor' | 'interval'>;
}
```

**Response Structure:**
```typescript
// Success
{ success: true, data: void }

// Duplicate
{ success: false, error: { code: 'DUPLICATE_WORD', message: 'This word has already been saved' } }

// Storage Error
{ success: false, error: { code: 'STORAGE_ERROR', message: '...' } }
```

### File Structure

**Files to Create:**
```
src/shared/storage/
  db.ts                  # IndexedDB initialization and utils
  wordService.ts         # Word CRUD operations
  migrations.ts          # Database migration handlers

src/shared/types/
  word.ts                # WordRecord type definition

src/background/handlers/
  wordHandlers.ts        # SAVE_WORD, GET_WORDS handlers
```

**Files to Modify:**
```
src/background/index.ts          # Add message routing for SAVE_WORD
src/content/components/AnalysisPopup.tsx  # Add Save button
src/shared/messaging/types.ts    # Add SAVE_WORD message type
```

### Key Code Patterns

**Database Initialization:**
```typescript
// src/shared/storage/db.ts
let dbInstance: IDBDatabase | null = null;

export async function getDatabase(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create words store
      if (!db.objectStoreNames.contains('words')) {
        const wordsStore = db.createObjectStore('words', { keyPath: 'id' });
        wordsStore.createIndex('byCreatedAt', 'createdAt', { unique: false });
        wordsStore.createIndex('byNextReviewAt', 'nextReviewAt', { unique: false });
        wordsStore.createIndex('byTagId', 'tagIds', { unique: false, multiEntry: true });
        wordsStore.createIndex('bySourceUrl', 'sourceUrl', { unique: false });
      }

      // Create tags store
      if (!db.objectStoreNames.contains('tags')) {
        db.createObjectStore('tags', { keyPath: 'id' });
      }
    };
  });
}
```

**Save Word with Duplicate Check:**
```typescript
// src/shared/storage/wordService.ts
export async function saveWord(
  wordData: Omit<WordRecord, 'id' | 'createdAt' | 'nextReviewAt' | 'reviewCount' | 'easeFactor' | 'interval'>
): Promise<Response<void>> {
  try {
    const db = await getDatabase();

    // Check for duplicates
    const duplicate = await findDuplicateWord(wordData.text, wordData.sourceUrl, wordData.xpath);
    if (duplicate) {
      return {
        success: false,
        error: { code: 'DUPLICATE_WORD', message: 'This word has already been saved' }
      };
    }

    // Create complete word record
    const word: WordRecord = {
      ...wordData,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      nextReviewAt: Date.now() + 24 * 60 * 60 * 1000, // +1 day
      reviewCount: 0,
      easeFactor: 2.5,
      interval: 1,
    };

    return new Promise((resolve) => {
      const tx = db.transaction('words', 'readwrite');
      const store = tx.objectStore('words');
      const request = store.add(word);

      request.onsuccess = () => resolve({ success: true });
      request.onerror = () => resolve({
        success: false,
        error: { code: 'STORAGE_ERROR', message: request.error?.message || 'Failed to save word' }
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

**Message Handler:**
```typescript
// src/background/handlers/wordHandlers.ts
export async function handleSaveWord(
  payload: SaveWordPayload
): Promise<Response<void>> {
  return await saveWord(payload);
}

// Register in Service Worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SAVE_WORD') {
    handleSaveWord(message.payload).then(sendResponse);
    return true; // Indicates async response
  }
});
```

### References

- Architecture Decision: Data Architecture (Section 1.1, 1.2)
- PRD Section 6.1: WordRecord Data Model
- Project Context: IndexedDB naming rules
- Epics: Story 2.1 Acceptance Criteria

### Testing Considerations

1. Test database creation on fresh install
2. Test index creation and query performance
3. Test duplicate detection with various combinations
4. Test error handling for storage quota exceeded
5. Mock chrome.runtime.sendMessage for unit tests

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex CLI)

### Completion Notes List

1. 保存操作使用分析结果写入 meaning/pronunciation/partOfSpeech，保证 AC1 数据完整
2. WordRecord 增加 interval 与 tagIds，并在保存时设置默认值
3. 重复保存错误码对齐为 DUPLICATE_WORD
4. 新增 IndexedDB 存储层单元测试覆盖建库、默认字段与重复检测
5. 测试环境引入 fake-indexeddb，确保 IndexedDB 可用

### File List

**Created:**
- src/shared/storage/wordService.test.ts

**Modified:**
- src/content/index.ts
- src/shared/storage/wordService.ts
- src/shared/messaging/types.ts
- src/shared/types/errors.ts
- src/hooks/useVocabulary.ts
- src/test/setup.ts
- package.json
- package-lock.json
