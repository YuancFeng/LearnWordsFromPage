# Story 2.3: Jump Back to Source Page

Status: done

## Story

As a English learner,
I want to click "Jump to Source" button in the vocabulary list to return to the source page,
so that I can review the word in its original context.

## Acceptance Criteria

### AC1: Switch to Existing Tab
**Given** user has saved a word from a webpage
**And** that page is already open in the browser
**When** user clicks "Jump to Source" button in vocabulary
**Then** browser switches to that page's tab
**And** sends highlight request message to that page

### AC2: Open New Tab When Page Not Open
**Given** user's saved word source page is not open in the browser
**When** user clicks "Jump to Source" button
**Then** open that URL in a new tab
**And** send highlight request message after page loads

### AC3: Handle Inaccessible Source Page
**Given** user's saved word source page is inaccessible (404 or other error)
**When** user clicks "Jump to Source" button
**Then** display friendly message: "Source page is inaccessible, but you can still view the full context here"
**And** display contextBefore + word + contextAfter in the Popup

## Tasks / Subtasks

### Task 1: Implement Tab Management Service (AC: #1, #2)
- [ ] 1.1 Create `src/background/tabService.ts`
- [ ] 1.2 Implement `findTabByUrl(url: string): Promise<chrome.tabs.Tab | null>`
- [ ] 1.3 Implement `switchToTab(tabId: number): Promise<void>`
- [ ] 1.4 Implement `createTab(url: string): Promise<chrome.tabs.Tab>`
- [ ] 1.5 Implement `waitForTabLoad(tabId: number): Promise<void>`

### Task 2: Define HIGHLIGHT_WORD Message Type (AC: #1, #2)
- [ ] 2.1 Add HIGHLIGHT_WORD to message types in `src/shared/messaging/types.ts`
- [ ] 2.2 Define HighlightWordPayload interface
- [ ] 2.3 Define HighlightWordResponse interface

### Task 3: Implement Jump to Source Handler (AC: #1, #2, #3)
- [ ] 3.1 Create `src/background/handlers/navigationHandlers.ts`
- [ ] 3.2 Implement `handleJumpToSource(word: WordRecord): Promise<Response<JumpResult>>`
- [ ] 3.3 Check if tab with sourceUrl exists
- [ ] 3.4 If exists: switch to tab, send HIGHLIGHT_WORD message
- [ ] 3.5 If not exists: create new tab, wait for load, send HIGHLIGHT_WORD message
- [ ] 3.6 Register handler in Service Worker message router

### Task 4: Implement Content Script Message Listener (AC: #1, #2)
- [ ] 4.1 Add HIGHLIGHT_WORD listener in `src/content/index.ts`
- [ ] 4.2 Extract payload and call highlight function (stub for Story 2.4)
- [ ] 4.3 Return response indicating success/failure

### Task 5: Handle Page Inaccessibility (AC: #3)
- [ ] 5.1 Implement error detection for 404/network errors
- [ ] 5.2 Add `onError` handler for tab loading
- [ ] 5.3 Return error response with PAGE_INACCESSIBLE code
- [ ] 5.4 Implement timeout for tab load (10 seconds)

### Task 6: Update WordCard Component (AC: #1, #2, #3)
- [ ] 6.1 Update `onJumpToSource` handler to send JUMP_TO_SOURCE message
- [ ] 6.2 Handle loading state during navigation
- [ ] 6.3 Display error message for inaccessible pages
- [ ] 6.4 Display context preview when page is inaccessible
- [ ] 6.5 Create ContextPreview component for fallback display

## Dev Notes

### Technical Requirements

**Message Types:**
```typescript
// JUMP_TO_SOURCE - Request to navigate to source page
interface JumpToSourceMessage {
  type: 'JUMP_TO_SOURCE';
  payload: {
    sourceUrl: string;
    sourceTitle: string;
    xpath: string;
    textOffset: number;
    textLength: number;
    text: string;
    contextBefore: string;
    contextAfter: string;
  };
}

// HIGHLIGHT_WORD - Request to highlight word in Content Script
interface HighlightWordMessage {
  type: 'HIGHLIGHT_WORD';
  payload: {
    xpath: string;
    textOffset: number;
    textLength: number;
    text: string;
    contextBefore: string;
    contextAfter: string;
  };
}

// Response types
interface JumpToSourceResponse {
  success: true;
  data: {
    tabId: number;
    status: 'switched' | 'created';
  };
}

interface JumpToSourceErrorResponse {
  success: false;
  error: {
    code: 'PAGE_INACCESSIBLE' | 'NETWORK_ERROR' | 'TAB_ERROR';
    message: string;
  };
}
```

### File Structure

**Files to Create:**
```
src/background/
  tabService.ts              # Tab management utilities
  handlers/navigationHandlers.ts  # Jump to source handler

src/popup/components/
  ContextPreview.tsx         # Fallback context display
```

**Files to Modify:**
```
src/shared/messaging/types.ts     # Add JUMP_TO_SOURCE, HIGHLIGHT_WORD
src/background/index.ts           # Register navigation handler
src/content/index.ts              # Add HIGHLIGHT_WORD listener
src/popup/components/WordCard.tsx # Update jump button handler
```

### Key Code Patterns

**Tab Management Service:**
```typescript
// src/background/tabService.ts

export async function findTabByUrl(url: string): Promise<chrome.tabs.Tab | null> {
  try {
    // Extract origin and pathname for flexible matching
    const targetUrl = new URL(url);
    const tabs = await chrome.tabs.query({});

    // Find tab with matching URL (ignore query params and hash)
    const matchingTab = tabs.find(tab => {
      if (!tab.url) return false;
      try {
        const tabUrl = new URL(tab.url);
        return tabUrl.origin === targetUrl.origin &&
               tabUrl.pathname === targetUrl.pathname;
      } catch {
        return false;
      }
    });

    return matchingTab || null;
  } catch {
    return null;
  }
}

export async function switchToTab(tabId: number): Promise<void> {
  await chrome.tabs.update(tabId, { active: true });
  const tab = await chrome.tabs.get(tabId);
  if (tab.windowId) {
    await chrome.windows.update(tab.windowId, { focused: true });
  }
}

export async function createTab(url: string): Promise<chrome.tabs.Tab> {
  return await chrome.tabs.create({ url, active: true });
}

export async function waitForTabLoad(
  tabId: number,
  timeoutMs: number = 10000
): Promise<boolean> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve(false);
    }, timeoutMs);

    const listener = (
      updatedTabId: number,
      changeInfo: chrome.tabs.TabChangeInfo
    ) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve(true);
      }
    };

    chrome.tabs.onUpdated.addListener(listener);
  });
}
```

**Navigation Handler:**
```typescript
// src/background/handlers/navigationHandlers.ts
import { findTabByUrl, switchToTab, createTab, waitForTabLoad } from '../tabService';
import type { Response, WordRecord } from '@/shared/types';

interface JumpResult {
  tabId: number;
  status: 'switched' | 'created';
}

export async function handleJumpToSource(
  payload: JumpToSourcePayload
): Promise<Response<JumpResult>> {
  try {
    const { sourceUrl, xpath, textOffset, textLength, text, contextBefore, contextAfter } = payload;

    // Check for existing tab
    const existingTab = await findTabByUrl(sourceUrl);

    if (existingTab?.id) {
      // Switch to existing tab
      await switchToTab(existingTab.id);

      // Send highlight request
      await chrome.tabs.sendMessage(existingTab.id, {
        type: 'HIGHLIGHT_WORD',
        payload: { xpath, textOffset, textLength, text, contextBefore, contextAfter }
      });

      return {
        success: true,
        data: { tabId: existingTab.id, status: 'switched' }
      };
    }

    // Create new tab
    const newTab = await createTab(sourceUrl);

    if (!newTab.id) {
      return {
        success: false,
        error: { code: 'TAB_ERROR', message: 'Failed to create new tab' }
      };
    }

    // Wait for page load
    const loaded = await waitForTabLoad(newTab.id, 10000);

    if (!loaded) {
      return {
        success: false,
        error: { code: 'PAGE_INACCESSIBLE', message: 'Page failed to load within timeout' }
      };
    }

    // Send highlight request after load
    try {
      await chrome.tabs.sendMessage(newTab.id, {
        type: 'HIGHLIGHT_WORD',
        payload: { xpath, textOffset, textLength, text, contextBefore, contextAfter }
      });
    } catch {
      // Content script may not be injected yet, ignore
    }

    return {
      success: true,
      data: { tabId: newTab.id, status: 'created' }
    };

  } catch (error) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

// Register in Service Worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'JUMP_TO_SOURCE') {
    handleJumpToSource(message.payload).then(sendResponse);
    return true;
  }
});
```

**Content Script Listener (Stub for Story 2.4):**
```typescript
// src/content/index.ts (add to existing file)

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'HIGHLIGHT_WORD') {
    // Will be implemented in Story 2.4
    highlightAndScrollToWord(message.payload)
      .then(result => sendResponse(result))
      .catch(err => sendResponse({
        success: false,
        error: { code: 'LOCATION_FAILED', message: err.message }
      }));
    return true;
  }
});

// Stub function - implemented in Story 2.4
async function highlightAndScrollToWord(payload: HighlightWordPayload): Promise<Response<void>> {
  console.log('HIGHLIGHT_WORD received:', payload);
  return { success: true };
}
```

**Updated WordCard with Jump Handling:**
```typescript
// src/popup/components/WordCard.tsx (update onJumpToSource)

const [isJumping, setIsJumping] = useState(false);
const [jumpError, setJumpError] = useState<string | null>(null);

const handleJumpToSource = async () => {
  setIsJumping(true);
  setJumpError(null);

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'JUMP_TO_SOURCE',
      payload: {
        sourceUrl: word.sourceUrl,
        sourceTitle: word.sourceTitle,
        xpath: word.xpath,
        textOffset: word.textOffset,
        textLength: word.text.length,
        text: word.text,
        contextBefore: word.contextBefore,
        contextAfter: word.contextAfter,
      }
    });

    if (!response.success) {
      if (response.error?.code === 'PAGE_INACCESSIBLE') {
        setJumpError('Source page is inaccessible');
      } else {
        setJumpError(response.error?.message || 'Failed to navigate');
      }
    }
  } catch (err) {
    setJumpError('Failed to navigate to source');
  } finally {
    setIsJumping(false);
  }
};
```

**Context Preview Component (Fallback):**
```typescript
// src/popup/components/ContextPreview.tsx
interface ContextPreviewProps {
  contextBefore: string;
  word: string;
  contextAfter: string;
}

export function ContextPreview({ contextBefore, word, contextAfter }: ContextPreviewProps) {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-3">
      <p className="text-xs text-yellow-600 mb-2">
        Source page is inaccessible. Here's the original context:
      </p>
      <p className="text-sm text-gray-700">
        <span className="text-gray-500">...{contextBefore}</span>
        <mark className="bg-yellow-200 px-1 font-semibold">{word}</mark>
        <span className="text-gray-500">{contextAfter}...</span>
      </p>
    </div>
  );
}
```

### References

- Architecture Decision: Communication Patterns (Section 2.2)
- PRD Section 3.2: US-2.2 One-click Jump Back
- Project Context: Chrome Extension Context Rules
- Epics: Story 2.3 Acceptance Criteria

### Testing Considerations

1. Test switching to existing tab with same URL
2. Test creating new tab when URL not open
3. Test URL matching ignores query params and hash
4. Test timeout handling for slow-loading pages
5. Test error handling for 404 pages
6. Test Content Script message listener registration
7. Mock chrome.tabs API for unit tests
8. Test window focus switching with switchToTab

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex CLI)

### Completion Notes List

1. 增加 URL 可访问性探测（HEAD + GET 回退），避免 404 页面误跳转
2. 仅在高亮消息成功响应后切换标签页，保证 AC3 错误提示可见
3. 新标签页先后台打开，成功后再激活，避免 Popup 立即关闭
4. 已打开标签页先等待加载完成再发送高亮，减少误判
5. ContextPreview 在上下文为空时仍可展示
6. 补充导航处理的成功/失败测试用例

### File List

**Modified:**
- src/background/tabService.ts
- src/background/handlers/navigationHandlers.ts
- src/background/handlers/navigationHandlers.test.ts
- src/popup/components/VocabularyList.tsx
- _bmad-output/implementation-artifacts/2-3-jump-back-to-source-page.md
