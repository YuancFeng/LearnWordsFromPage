# Story 4.4: Tag Creation & Management

Status: ready-for-dev

## Story

As a LingoRecall user,
I want to create and manage custom tags,
so that I can categorize my vocabulary by topic.

## Acceptance Criteria

### AC1: Create New Tag
**Given** the user opens the tag management section in the vocabulary page
**When** the user enters a tag name, selects a color, and clicks "Create"
**Then** the new tag is saved to IndexedDB `tags` store
**And** the tag list updates in real-time to show the new tag

### AC2: Edit Existing Tag
**Given** there are existing tags in the list
**When** the user clicks the edit button on a tag
**Then** an edit modal appears with editable name and color fields
**And** saving updates the tag record in IndexedDB

### AC3: Delete Tag with Cascade Update
**Given** there are existing tags in the list
**When** the user clicks the delete button on a tag and confirms
**Then** the tag is deleted from IndexedDB
**And** vocabulary items associated with this tag are automatically disassociated (tagId removed from their `tagIds` array)

### AC4: Color Selection
**Given** the user is creating or editing a tag
**When** the user needs to select a color
**Then** 8-12 preset colors are available for selection
**And** custom HEX color input is supported

## Tasks / Subtasks

- [ ] Task 1: Define Tag data model (AC: #1, #4)
  - [ ] 1.1: Create `src/shared/types/tag.ts` with Tag interface
  - [ ] 1.2: Define preset color palette constant
  - [ ] 1.3: Add Tag type to IndexedDB schema

- [ ] Task 2: Implement IndexedDB tags store (AC: #1, #2, #3)
  - [ ] 2.1: Add `tags` Object Store to database schema
  - [ ] 2.2: Implement `createTag(tag: Tag)` function
  - [ ] 2.3: Implement `updateTag(id: string, updates: Partial<Tag>)` function
  - [ ] 2.4: Implement `deleteTag(id: string)` function with cascade logic
  - [ ] 2.5: Implement `getAllTags()` function

- [ ] Task 3: Create useTags hook (AC: #1, #2, #3)
  - [ ] 3.1: Create `src/hooks/useTags.ts`
  - [ ] 3.2: Implement CRUD operations with loading states
  - [ ] 3.3: Handle real-time updates
  - [ ] 3.4: Implement cascade delete logic

- [ ] Task 4: Create TagManagement component (AC: #1, #2, #3)
  - [ ] 4.1: Create `src/popup/components/TagManagement.tsx`
  - [ ] 4.2: Implement tag list display with color indicators
  - [ ] 4.3: Add create button with inline form
  - [ ] 4.4: Add edit and delete buttons for each tag

- [ ] Task 5: Create TagEditModal component (AC: #2, #4)
  - [ ] 5.1: Create `src/popup/components/TagEditModal.tsx`
  - [ ] 5.2: Implement name input field
  - [ ] 5.3: Implement color picker with presets
  - [ ] 5.4: Add custom HEX color input option

- [ ] Task 6: Implement ColorPicker component (AC: #4)
  - [ ] 6.1: Create `src/popup/components/ColorPicker.tsx`
  - [ ] 6.2: Display 8-12 preset color swatches
  - [ ] 6.3: Add HEX input field with validation
  - [ ] 6.4: Show selected color preview

- [ ] Task 7: Implement cascade delete for vocabulary (AC: #3)
  - [ ] 7.1: Query words with deleted tagId
  - [ ] 7.2: Update each word's tagIds array
  - [ ] 7.3: Use transaction for atomic operation
  - [ ] 7.4: Handle errors gracefully

- [ ] Task 8: Write unit tests
  - [ ] 8.1: Test tag CRUD operations
  - [ ] 8.2: Test cascade delete functionality
  - [ ] 8.3: Test color picker HEX validation
  - [ ] 8.4: Test UI component interactions

## Dev Notes

### Technical Requirements

#### Tag Interface
```typescript
// src/shared/types/tag.ts
export interface Tag {
  id: string;           // UUID
  name: string;         // Tag name (max 20 chars)
  color: string;        // HEX color code (e.g., #3B82F6)
  createdAt: number;    // Unix timestamp
}

export const PRESET_COLORS = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#14B8A6', // Teal
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#6B7280', // Gray
  '#78716C', // Stone
  '#0EA5E9', // Sky
  '#D946EF', // Fuchsia
];

export function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}
```

#### IndexedDB Schema Update
```typescript
// src/shared/storage/db.ts
const DB_VERSION = 1;

function upgradeDB(db: IDBDatabase, oldVersion: number) {
  if (oldVersion < 1) {
    // words store (existing)
    const wordsStore = db.createObjectStore('words', { keyPath: 'id' });
    wordsStore.createIndex('byCreatedAt', 'createdAt');
    wordsStore.createIndex('byNextReviewAt', 'nextReviewAt');
    wordsStore.createIndex('byTagId', 'tagIds', { multiEntry: true });
    wordsStore.createIndex('bySourceUrl', 'sourceUrl');

    // tags store (new)
    const tagsStore = db.createObjectStore('tags', { keyPath: 'id' });
    tagsStore.createIndex('byCreatedAt', 'createdAt');
  }
}
```

### File Structure

**Files to Create:**
```
src/
  shared/
    types/
      tag.ts                  # Tag interface and color constants
    storage/
      tagStore.ts             # Tag CRUD operations
  hooks/
    useTags.ts                # Tags state management hook
  popup/
    components/
      TagManagement.tsx       # Tag list and management UI
      TagEditModal.tsx        # Create/Edit tag modal
      ColorPicker.tsx         # Color selection component
      TagBadge.tsx            # Tag display badge component
```

**Files to Modify:**
```
src/shared/storage/db.ts      # Add tags store to schema
```

### Key Code Patterns

#### Tag Store Operations
```typescript
// src/shared/storage/tagStore.ts
import { openDB } from '@/shared/storage/db';
import type { Tag } from '@/shared/types/tag';
import { Response } from '@/shared/types';

export async function createTag(tag: Omit<Tag, 'id' | 'createdAt'>): Promise<Response<Tag>> {
  try {
    const db = await openDB();
    const newTag: Tag = {
      ...tag,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };

    await db.add('tags', newTag);
    return { success: true, data: newTag };
  } catch (error) {
    return {
      success: false,
      error: { code: 'STORAGE_ERROR', message: error.message }
    };
  }
}

export async function updateTag(
  id: string,
  updates: Partial<Pick<Tag, 'name' | 'color'>>
): Promise<Response<Tag>> {
  try {
    const db = await openDB();
    const tx = db.transaction('tags', 'readwrite');
    const store = tx.objectStore('tags');

    const existing = await store.get(id);
    if (!existing) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Tag not found' }
      };
    }

    const updated = { ...existing, ...updates };
    await store.put(updated);
    await tx.done;

    return { success: true, data: updated };
  } catch (error) {
    return {
      success: false,
      error: { code: 'STORAGE_ERROR', message: error.message }
    };
  }
}

export async function deleteTag(id: string): Promise<Response<void>> {
  try {
    const db = await openDB();

    // Use transaction for atomic cascade delete
    const tx = db.transaction(['tags', 'words'], 'readwrite');

    // Delete the tag
    await tx.objectStore('tags').delete(id);

    // Cascade: Remove tagId from all associated words
    const wordsStore = tx.objectStore('words');
    const tagIndex = wordsStore.index('byTagId');

    // Get all words with this tag
    const cursor = tagIndex.openCursor(IDBKeyRange.only(id));

    await cursor.then(async function processEntry(cursor) {
      if (!cursor) return;

      const word = cursor.value;
      word.tagIds = word.tagIds.filter((tid: string) => tid !== id);
      await wordsStore.put(word);

      return cursor.continue().then(processEntry);
    });

    await tx.done;
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: { code: 'STORAGE_ERROR', message: error.message }
    };
  }
}

export async function getAllTags(): Promise<Response<Tag[]>> {
  try {
    const db = await openDB();
    const tags = await db.getAll('tags');
    return { success: true, data: tags };
  } catch (error) {
    return {
      success: false,
      error: { code: 'STORAGE_ERROR', message: error.message }
    };
  }
}
```

#### useTags Hook
```typescript
// src/hooks/useTags.ts
export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    setIsLoading(true);
    const result = await getAllTags();
    if (result.success && result.data) {
      setTags(result.data.sort((a, b) => b.createdAt - a.createdAt));
    } else {
      setError(result.error?.message || 'Failed to load tags');
    }
    setIsLoading(false);
  };

  const addTag = async (name: string, color: string): Promise<Response<Tag>> => {
    const result = await createTag({ name, color });
    if (result.success && result.data) {
      setTags(prev => [result.data!, ...prev]);
    }
    return result;
  };

  const editTag = async (
    id: string,
    updates: Partial<Pick<Tag, 'name' | 'color'>>
  ): Promise<Response<Tag>> => {
    const result = await updateTag(id, updates);
    if (result.success && result.data) {
      setTags(prev => prev.map(t => t.id === id ? result.data! : t));
    }
    return result;
  };

  const removeTag = async (id: string): Promise<Response<void>> => {
    const result = await deleteTag(id);
    if (result.success) {
      setTags(prev => prev.filter(t => t.id !== id));
    }
    return result;
  };

  return {
    tags,
    isLoading,
    error,
    addTag,
    editTag,
    removeTag,
    reloadTags: loadTags,
  };
}
```

#### TagManagement Component
```typescript
// src/popup/components/TagManagement.tsx
export function TagManagement() {
  const { tags, isLoading, addTag, editTag, removeTag } = useTags();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleCreate = async (name: string, color: string) => {
    const result = await addTag(name, color);
    if (result.success) {
      setShowCreateForm(false);
    }
    return result;
  };

  const handleEdit = async (id: string, name: string, color: string) => {
    const result = await editTag(id, { name, color });
    if (result.success) {
      setEditingTag(null);
    }
    return result;
  };

  const handleDelete = async (id: string) => {
    const result = await removeTag(id);
    if (result.success) {
      setConfirmDelete(null);
    }
  };

  if (isLoading) {
    return <div>Loading tags...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tags</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-1 text-blue-500"
        >
          <Plus size={16} />
          New Tag
        </button>
      </div>

      {/* Tag List */}
      <div className="space-y-2">
        {tags.map(tag => (
          <div key={tag.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
              <span>{tag.name}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditingTag(tag)}>
                <Pencil size={16} />
              </button>
              <button onClick={() => setConfirmDelete(tag.id)}>
                <Trash2 size={16} className="text-red-500" />
              </button>
            </div>
          </div>
        ))}

        {tags.length === 0 && (
          <p className="text-gray-500 text-center py-4">
            No tags yet. Create your first tag to organize vocabulary.
          </p>
        )}
      </div>

      {/* Create Modal */}
      {showCreateForm && (
        <TagEditModal
          onSave={handleCreate}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Edit Modal */}
      {editingTag && (
        <TagEditModal
          tag={editingTag}
          onSave={(name, color) => handleEdit(editingTag.id, name, color)}
          onCancel={() => setEditingTag(null)}
        />
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <ConfirmDialog
          message="Delete this tag? Words with this tag will be updated."
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
```

#### ColorPicker Component
```typescript
// src/popup/components/ColorPicker.tsx
interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [customColor, setCustomColor] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const handleCustomSubmit = () => {
    if (isValidHexColor(customColor)) {
      onChange(customColor);
      setShowCustom(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Color</label>

      {/* Preset Colors */}
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map(color => (
          <button
            key={color}
            onClick={() => onChange(color)}
            className={`
              w-8 h-8 rounded-full border-2 transition-transform
              ${value === color ? 'border-gray-800 scale-110' : 'border-transparent'}
            `}
            style={{ backgroundColor: color }}
          />
        ))}

        {/* Custom Color Button */}
        <button
          onClick={() => setShowCustom(true)}
          className="w-8 h-8 rounded-full border-2 border-dashed border-gray-400 flex items-center justify-center"
        >
          <span className="text-gray-500 text-xs">+</span>
        </button>
      </div>

      {/* Custom HEX Input */}
      {showCustom && (
        <div className="flex gap-2">
          <input
            type="text"
            value={customColor}
            onChange={(e) => setCustomColor(e.target.value)}
            placeholder="#FF5733"
            className="flex-1 px-2 py-1 border rounded text-sm"
          />
          <button
            onClick={handleCustomSubmit}
            disabled={!isValidHexColor(customColor)}
            className="px-2 py-1 bg-blue-500 text-white rounded text-sm disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      )}

      {/* Selected Color Preview */}
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded border"
          style={{ backgroundColor: value }}
        />
        <span className="text-sm text-gray-600">{value}</span>
      </div>
    </div>
  );
}
```

### Important Notes

1. **multiEntry Index**: The `byTagId` index uses `multiEntry: true` to support queries on array fields
2. **Cascade Delete Transaction**: Use a single transaction for tag deletion and word updates to ensure atomicity
3. **Color Validation**: Always validate HEX colors before saving
4. **Tag Name Validation**: Limit tag names to 20 characters, trim whitespace

### References

- Architecture: `/Users/fengyuanchang/Projects_WSL/LearnWordsFromPage/_bmad-output/planning-artifacts/architecture.md` - Section "Decision 1.2: IndexedDB Schema"
- PRD: `/Users/fengyuanchang/Projects_WSL/LearnWordsFromPage/_bmad-output/planning-artifacts/prd.md` - Section "6.2 Tag"
- Epics: `/Users/fengyuanchang/Projects_WSL/LearnWordsFromPage/_bmad-output/planning-artifacts/epics.md` - Story 4.4
- Project Context: `/Users/fengyuanchang/Projects_WSL/LearnWordsFromPage/_bmad-output/planning-artifacts/project-context.md` - Storage Layer Rules
