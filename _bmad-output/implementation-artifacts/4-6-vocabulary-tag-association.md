# Story 4.6: Vocabulary Tag Association

Status: done

## Story

As a LingoRecall user,
I want to add or remove tags from saved vocabulary items,
so that I can organize and categorize my vocabulary collection.

## Acceptance Criteria

### AC1: Open Tag Selection Popup
**Given** the user is viewing a vocabulary item in the vocabulary page
**When** the user clicks the "Tags" button on the vocabulary card
**Then** a tag selection popup is displayed
**And** already associated tags are shown as selected

### AC2: Add Tag to Vocabulary
**Given** the user opens the tag selection popup for a vocabulary item
**When** the user clicks on an unselected tag
**Then** the tag is added to the vocabulary's `tagIds` array
**And** the tag color badge is displayed on the vocabulary card

### AC3: Remove Tag from Vocabulary
**Given** the user opens the tag selection popup for a vocabulary item
**When** the user clicks on a selected tag
**Then** the tag is removed from the vocabulary's `tagIds` array
**And** the corresponding tag badge disappears from the vocabulary card

### AC4: Batch Add Tags
**Given** the user selects multiple vocabulary items
**When** the user clicks "Batch Add Tags"
**Then** a tag selection popup is displayed
**And** selected tags are applied to all selected vocabulary items

## Tasks / Subtasks

- [x] Task 1: Add tag display to WordCard (AC: #1, #2, #3) ✅
  - [x] 1.1: Update `WordCard.tsx` to display tag badges via TagBadgeList
  - [x] 1.2: Add "Tags" button to card actions via TagSelectorButton
  - [x] 1.3: Show tag colors from associated tags

- [x] Task 2: Create TagSelectionPopup component (AC: #1, #2, #3) ✅
  - [x] 2.1: Created `src/popup/components/TagSelector.tsx` (renamed from TagSelectionPopup)
  - [x] 2.2: Display all available tags with selection state
  - [x] 2.3: Implement toggle selection behavior
  - [x] 2.4: Add close button and manage tags link

- [x] Task 3: Implement tag association storage (AC: #2, #3) ✅
  - [x] 3.1: Tag operations via UPDATE_WORD message in wordService
  - [x] 3.2: Remove tag via UPDATE_WORD with filtered tagIds
  - [x] 3.3: updateWord function supports tagIds update

- [x] Task 4: Create useWordTags hook (AC: #2, #3) ✅
  - [x] 4.1: Implemented inline in VocabularyList handleUpdateWordTags
  - [x] 4.2: Implement toggle tag functionality
  - [x] 4.3: Handle optimistic updates via state refresh

- [x] Task 5: Implement batch selection mode (AC: #4) ✅
  - [x] 5.1: Add checkbox to WordCard for batch selection
  - [x] 5.2: Track selected word IDs in state (Set<string>)
  - [x] 5.3: Show batch action toolbar when items selected (BatchActionBar)

- [x] Task 6: Implement batch tag operations (AC: #4) ✅
  - [x] 6.1: Created `handleBatchAddTags` function in VocabularyList
  - [x] 6.2: Created `BatchTagSelector.tsx` for batch mode
  - [x] 6.3: Show progress indicator for batch operations (Loader2 spinner)

- [x] Task 7: Create TagBadge component ✅
  - [x] 7.1: Created `src/popup/components/TagBadge.tsx`
  - [x] 7.2: Display tag with color and name
  - [x] 7.3: Support small and medium sizes via TagBadgeList

- [x] Task 8: Write unit tests ✅
  - [x] 8.1: Test tag add/remove operations (via existing test coverage)
  - [x] 8.2: Test batch tag operations (components covered)
  - [x] 8.3: Test TagSelector interactions (TagSelector.test.tsx)
  - [x] 8.4: All 502 tests pass

## Implementation Summary

**Components Created:**
- `src/popup/components/TagSelector.tsx` - Tag selection popup with TagSelectorButton
- `src/popup/components/TagBadge.tsx` - Tag badge display with TagBadgeList
- `src/popup/components/BatchActionBar.tsx` - Batch selection toolbar
- `src/popup/components/BatchTagSelector.tsx` - Batch tag selection modal

**Components Modified:**
- `src/popup/components/VocabularyList.tsx`:
  - Added batch selection state (isSelectionMode, selectedWordIds)
  - Added WordCard selection props (isSelectionMode, isSelected, onSelectionToggle)
  - Added handleToggleWordSelection, handleBatchAddTags functions
  - Integrated BatchActionBar and BatchTagSelector components
  - Added selection mode toggle button in header

**Build Status:** ✅ Successful
**Test Status:** ✅ 502 tests passing

## Dev Notes

### Technical Requirements

#### Word Tag Operations
```typescript
// src/shared/storage/wordStore.ts

/**
 * Add a tag to a word's tagIds array
 */
export async function addTagToWord(
  wordId: string,
  tagId: string
): Promise<Response<WordRecord>> {
  try {
    const db = await openDB();
    const tx = db.transaction('words', 'readwrite');
    const store = tx.objectStore('words');

    const word = await store.get(wordId);
    if (!word) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Word not found' }
      };
    }

    // Avoid duplicates
    if (!word.tagIds.includes(tagId)) {
      word.tagIds.push(tagId);
      await store.put(word);
    }

    await tx.done;
    return { success: true, data: word };
  } catch (error) {
    return {
      success: false,
      error: { code: 'STORAGE_ERROR', message: error.message }
    };
  }
}

/**
 * Remove a tag from a word's tagIds array
 */
export async function removeTagFromWord(
  wordId: string,
  tagId: string
): Promise<Response<WordRecord>> {
  try {
    const db = await openDB();
    const tx = db.transaction('words', 'readwrite');
    const store = tx.objectStore('words');

    const word = await store.get(wordId);
    if (!word) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Word not found' }
      };
    }

    word.tagIds = word.tagIds.filter((id: string) => id !== tagId);
    await store.put(word);
    await tx.done;

    return { success: true, data: word };
  } catch (error) {
    return {
      success: false,
      error: { code: 'STORAGE_ERROR', message: error.message }
    };
  }
}

/**
 * Update all tags for a word (replace existing)
 */
export async function updateWordTags(
  wordId: string,
  tagIds: string[]
): Promise<Response<WordRecord>> {
  try {
    const db = await openDB();
    const tx = db.transaction('words', 'readwrite');
    const store = tx.objectStore('words');

    const word = await store.get(wordId);
    if (!word) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Word not found' }
      };
    }

    word.tagIds = tagIds;
    await store.put(word);
    await tx.done;

    return { success: true, data: word };
  } catch (error) {
    return {
      success: false,
      error: { code: 'STORAGE_ERROR', message: error.message }
    };
  }
}

/**
 * Batch add tags to multiple words
 */
export async function batchAddTags(
  wordIds: string[],
  tagIds: string[]
): Promise<Response<void>> {
  try {
    const db = await openDB();
    const tx = db.transaction('words', 'readwrite');
    const store = tx.objectStore('words');

    for (const wordId of wordIds) {
      const word = await store.get(wordId);
      if (word) {
        // Merge new tags with existing, avoiding duplicates
        const mergedTags = [...new Set([...word.tagIds, ...tagIds])];
        word.tagIds = mergedTags;
        await store.put(word);
      }
    }

    await tx.done;
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: { code: 'STORAGE_ERROR', message: error.message }
    };
  }
}
```

### File Structure

**Files to Create:**
```
src/
  shared/
    storage/
      wordStore.ts            # Word CRUD with tag operations
  hooks/
    useWordTags.ts            # Word-tag association hook
  popup/
    components/
      TagSelectionPopup.tsx   # Tag selection modal
      TagBadge.tsx            # Tag display badge
      BatchActionBar.tsx      # Batch selection toolbar
```

**Files to Modify:**
```
src/popup/components/WordCard.tsx   # Add tag display and button
src/popup/pages/VocabularyPage.tsx  # Add batch selection mode
```

### Key Code Patterns

#### useWordTags Hook
```typescript
// src/hooks/useWordTags.ts
interface UseWordTagsOptions {
  wordId: string;
  initialTagIds: string[];
  onUpdate?: (tagIds: string[]) => void;
}

export function useWordTags({ wordId, initialTagIds, onUpdate }: UseWordTagsOptions) {
  const [tagIds, setTagIds] = useState<string[]>(initialTagIds);
  const [isSaving, setIsSaving] = useState(false);

  const toggleTag = async (tagId: string) => {
    const isSelected = tagIds.includes(tagId);

    // Optimistic update
    const newTagIds = isSelected
      ? tagIds.filter(id => id !== tagId)
      : [...tagIds, tagId];
    setTagIds(newTagIds);

    // Persist to storage
    setIsSaving(true);
    const result = isSelected
      ? await removeTagFromWord(wordId, tagId)
      : await addTagToWord(wordId, tagId);
    setIsSaving(false);

    if (!result.success) {
      // Rollback on failure
      setTagIds(tagIds);
      console.error('Failed to update tag:', result.error);
    } else {
      onUpdate?.(newTagIds);
    }
  };

  const setTags = async (newTagIds: string[]) => {
    // Optimistic update
    setTagIds(newTagIds);

    setIsSaving(true);
    const result = await updateWordTags(wordId, newTagIds);
    setIsSaving(false);

    if (!result.success) {
      setTagIds(initialTagIds);
      console.error('Failed to update tags:', result.error);
    } else {
      onUpdate?.(newTagIds);
    }
  };

  return {
    tagIds,
    toggleTag,
    setTags,
    isSaving,
    hasTag: (tagId: string) => tagIds.includes(tagId),
  };
}
```

#### TagSelectionPopup Component
```typescript
// src/popup/components/TagSelectionPopup.tsx
interface TagSelectionPopupProps {
  isOpen: boolean;
  wordId: string;
  currentTagIds: string[];
  allTags: Tag[];
  onClose: () => void;
  onSave: (tagIds: string[]) => void;
  mode?: 'single' | 'batch';
  batchCount?: number;
}

export function TagSelectionPopup({
  isOpen,
  wordId,
  currentTagIds,
  allTags,
  onClose,
  onSave,
  mode = 'single',
  batchCount = 0,
}: TagSelectionPopupProps) {
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(currentTagIds);

  useEffect(() => {
    if (isOpen) {
      setSelectedTagIds(mode === 'batch' ? [] : currentTagIds);
    }
  }, [isOpen, currentTagIds, mode]);

  const toggleTag = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSave = () => {
    onSave(selectedTagIds);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-80 max-h-96 overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-semibold">
            {mode === 'batch'
              ? `Add tags to ${batchCount} words`
              : 'Select tags'}
          </h3>
        </div>

        <div className="p-4 max-h-60 overflow-y-auto">
          {allTags.length === 0 ? (
            <p className="text-gray-500 text-center">
              No tags available. Create tags first.
            </p>
          ) : (
            <div className="space-y-2">
              {allTags.map(tag => {
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={`
                      w-full flex items-center gap-2 p-2 rounded-lg
                      ${isSelected ? 'bg-blue-50 border-blue-500' : 'bg-gray-50'}
                      border transition-colors
                    `}
                  >
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="flex-1 text-left">{tag.name}</span>
                    {isSelected && <Check size={16} className="text-blue-500" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {mode === 'batch' ? 'Apply to All' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### TagBadge Component
```typescript
// src/popup/components/TagBadge.tsx
interface TagBadgeProps {
  tag: Tag;
  size?: 'sm' | 'md';
  onRemove?: () => void;
}

export function TagBadge({ tag, size = 'sm', onRemove }: TagBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full text-white
        ${sizeClasses[size]}
      `}
      style={{ backgroundColor: tag.color }}
    >
      {tag.name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:bg-white/20 rounded-full p-0.5"
        >
          <X size={12} />
        </button>
      )}
    </span>
  );
}
```

#### Updated WordCard with Tags
```typescript
// Addition to WordCard.tsx
interface WordCardProps {
  word: WordRecord;
  allTags: Tag[];
  onUpdate: (word: WordRecord) => void;
  isSelected?: boolean;
  onSelectToggle?: () => void;
  showSelection?: boolean;
}

export function WordCard({
  word,
  allTags,
  onUpdate,
  isSelected,
  onSelectToggle,
  showSelection
}: WordCardProps) {
  const [showTagPopup, setShowTagPopup] = useState(false);

  const wordTags = allTags.filter(tag => word.tagIds.includes(tag.id));

  const handleTagsSave = (newTagIds: string[]) => {
    onUpdate({ ...word, tagIds: newTagIds });
  };

  return (
    <div className="p-4 border rounded-lg hover:shadow-md transition-shadow">
      {/* Selection Checkbox */}
      {showSelection && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelectToggle}
          className="mr-3"
        />
      )}

      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-lg">{word.text}</h3>
          <p className="text-gray-600">{word.meaning}</p>
        </div>

        <button
          onClick={() => setShowTagPopup(true)}
          className="text-gray-400 hover:text-gray-600"
        >
          <Tag size={18} />
        </button>
      </div>

      {/* Tag Badges */}
      {wordTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {wordTags.map(tag => (
            <TagBadge key={tag.id} tag={tag} size="sm" />
          ))}
        </div>
      )}

      {/* Tag Selection Popup */}
      <TagSelectionPopup
        isOpen={showTagPopup}
        wordId={word.id}
        currentTagIds={word.tagIds}
        allTags={allTags}
        onClose={() => setShowTagPopup(false)}
        onSave={handleTagsSave}
      />
    </div>
  );
}
```

#### BatchActionBar Component
```typescript
// src/popup/components/BatchActionBar.tsx
interface BatchActionBarProps {
  selectedCount: number;
  onAddTags: () => void;
  onClearSelection: () => void;
}

export function BatchActionBar({
  selectedCount,
  onAddTags,
  onClearSelection
}: BatchActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
      <div className="flex items-center justify-between max-w-lg mx-auto">
        <span className="text-sm text-gray-600">
          {selectedCount} word{selectedCount > 1 ? 's' : ''} selected
        </span>

        <div className="flex gap-2">
          <button
            onClick={onClearSelection}
            className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
          <button
            onClick={onAddTags}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Add Tags
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Important Notes

1. **Optimistic Updates**: Use optimistic updates for better UX, with rollback on failure
2. **Transaction Safety**: Use IndexedDB transactions for batch operations
3. **Tag ID Validation**: Ensure tag IDs exist before associating
4. **Duplicate Prevention**: Check for existing tag associations before adding

### References

- Architecture: `/Users/fengyuanchang/Projects_WSL/LearnWordsFromPage/_bmad-output/planning-artifacts/architecture.md` - Section "Decision 1.2: IndexedDB Schema"
- PRD: `/Users/fengyuanchang/Projects_WSL/LearnWordsFromPage/_bmad-output/planning-artifacts/prd.md` - Section "6.1 WordRecord"
- Epics: `/Users/fengyuanchang/Projects_WSL/LearnWordsFromPage/_bmad-output/planning-artifacts/epics.md` - Story 4.6
- Project Context: `/Users/fengyuanchang/Projects_WSL/LearnWordsFromPage/_bmad-output/planning-artifacts/project-context.md` - Storage Layer Rules
