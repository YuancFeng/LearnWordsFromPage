# Story 2.4: Highlight and Locate Source Position

Status: done

## Story

As a English learner,
I want to see the target word highlighted and automatically scrolled to when jumping back to source,
so that I can immediately see the word's exact position and context in the original text.

## Acceptance Criteria

### AC1: XPath + textOffset Positioning
**Given** source page has loaded
**And** Content Script receives highlight request
**When** using XPath + textOffset to locate target text
**Then** find the target text node
**And** wrap the target word with `<mark>` tag
**And** apply light yellow background style (#FEF08A)
**And** page smoothly scrolls to highlight position (vertically centered)
**And** highlight fades out after 5 seconds (0.5 second animation)

### AC2: Fallback to Context Matching
**Given** source page structure has changed, XPath positioning fails
**When** XPath positioning returns null
**Then** use fallback: contextBefore + text + contextAfter for full-text search
**And** find matching text and execute highlight and scroll

### AC3: Positioning Failure Handling
**Given** both XPath positioning and context matching fail
**When** target text cannot be found on the page
**Then** display Toast message: "Cannot locate this word on the current page, content may have changed"
**And** do not execute any highlight operation

## Tasks / Subtasks

### Task 1: Implement XPath Location Utility (AC: #1)
- [x] 1.1 Create `src/content/xpath.ts`
- [x] 1.2 Implement `evaluateXPath(xpath: string): Node | null`
- [x] 1.3 Implement `getTextNodeAtOffset(element: Node, offset: number): { node: Text, localOffset: number } | null`
- [x] 1.4 Handle edge cases: whitespace normalization, nested elements

### Task 2: Implement Context Matching Fallback (AC: #2)
- [x] 2.1 Create `src/content/textMatcher.ts`
- [x] 2.2 Implement `findTextByContext(contextBefore: string, text: string, contextAfter: string): Range | null`
- [x] 2.3 Collect all text nodes in document body
- [x] 2.4 Build concatenated text and search for pattern
- [x] 2.5 Map found position back to DOM Range

### Task 3: Implement Highlight Rendering (AC: #1)
- [x] 3.1 Create `src/content/highlight.ts`
- [x] 3.2 Implement `highlightRange(range: Range): HTMLElement`
- [x] 3.3 Create `<mark>` wrapper with lingorecall-highlight class
- [x] 3.4 Apply inline styles for #FEF08A background
- [x] 3.5 Ensure highlight works across text node boundaries

### Task 4: Implement Scroll to Highlight (AC: #1)
- [x] 4.1 Implement `scrollToElement(element: HTMLElement): void`
- [x] 4.2 Use `scrollIntoView({ behavior: 'smooth', block: 'center' })`
- [x] 4.3 Add small delay after scroll for visual effect

### Task 5: Implement Fade Out Animation (AC: #1)
- [x] 5.1 Inject CSS keyframes for highlight-fade animation
- [x] 5.2 Set 5-second delay before fade starts
- [x] 5.3 Implement 0.5-second fade out animation
- [x] 5.4 Remove `<mark>` element after animation completes
- [x] 5.5 Restore original text node structure

### Task 6: Implement HIGHLIGHT_WORD Handler (AC: #1, #2, #3)
- [x] 6.1 Update `src/content/index.ts` to implement full handler
- [x] 6.2 Try XPath + textOffset positioning first
- [x] 6.3 Fall back to context matching if XPath fails
- [x] 6.4 Execute highlight and scroll on success
- [x] 6.5 Return appropriate response for success/failure

### Task 7: Implement Toast Notification (AC: #3)
- [x] 7.1 Create `src/content/components/Toast.tsx`
- [x] 7.2 Inject Toast into Shadow DOM
- [x] 7.3 Implement `showToast(message: string, duration?: number)`
- [x] 7.4 Style with Tailwind (amber background for warnings)
- [x] 7.5 Auto-dismiss after duration

## Dev Notes

### Technical Requirements

**Highlight Payload:**
```typescript
interface HighlightWordPayload {
  xpath: string;           // XPath to parent element
  textOffset: number;      // Character offset within text content
  textLength: number;      // Length of text to highlight
  text: string;            // Original selected text
  contextBefore: string;   // 100 chars before (for fallback)
  contextAfter: string;    // 100 chars after (for fallback)
}
```

**Highlight Styles:**
```css
.lingorecall-highlight {
  background-color: #FEF08A;  /* Tailwind yellow-200 */
  border-radius: 2px;
  padding: 0 2px;
  animation: lingorecall-fade 5s ease-out forwards;
  animation-delay: 0s;
}

@keyframes lingorecall-fade {
  0%, 90% { background-color: #FEF08A; }
  100% { background-color: transparent; }
}
```

### File Structure

**Files to Create:**
```
src/content/
  xpath.ts              # XPath evaluation utilities
  textMatcher.ts        # Context-based text matching
  highlight.ts          # Highlight rendering and animation
  components/
    Toast.tsx           # Toast notification component
```

**Files to Modify:**
```
src/content/index.ts    # Implement HIGHLIGHT_WORD handler
src/content/shadow.ts   # Inject highlight styles
```

### Key Code Patterns

**XPath Evaluation:**
```typescript
// src/content/xpath.ts

export function evaluateXPath(xpath: string): Node | null {
  try {
    const result = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    return result.singleNodeValue;
  } catch {
    return null;
  }
}

export function getTextNodeAtOffset(
  element: Node,
  targetOffset: number
): { node: Text; localOffset: number } | null {
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null
  );

  let currentOffset = 0;
  let textNode: Text | null;

  while ((textNode = walker.nextNode() as Text | null)) {
    const nodeLength = textNode.textContent?.length || 0;

    if (currentOffset + nodeLength > targetOffset) {
      return {
        node: textNode,
        localOffset: targetOffset - currentOffset
      };
    }

    currentOffset += nodeLength;
  }

  return null;
}

export function locateTextByXPath(
  xpath: string,
  textOffset: number,
  textLength: number
): Range | null {
  const element = evaluateXPath(xpath);
  if (!element) return null;

  const textLocation = getTextNodeAtOffset(element, textOffset);
  if (!textLocation) return null;

  const { node, localOffset } = textLocation;
  const nodeLength = node.textContent?.length || 0;

  // Check if text fits in single node
  if (localOffset + textLength <= nodeLength) {
    const range = document.createRange();
    range.setStart(node, localOffset);
    range.setEnd(node, localOffset + textLength);
    return range;
  }

  // Handle text spanning multiple nodes
  return createMultiNodeRange(element, textOffset, textLength);
}

function createMultiNodeRange(
  element: Node,
  startOffset: number,
  length: number
): Range | null {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
  const range = document.createRange();

  let currentOffset = 0;
  let started = false;
  let remaining = length;
  let textNode: Text | null;

  while ((textNode = walker.nextNode() as Text | null)) {
    const nodeLength = textNode.textContent?.length || 0;

    if (!started && currentOffset + nodeLength > startOffset) {
      range.setStart(textNode, startOffset - currentOffset);
      started = true;
      remaining -= (nodeLength - (startOffset - currentOffset));
    } else if (started) {
      if (remaining <= nodeLength) {
        range.setEnd(textNode, remaining);
        return range;
      }
      remaining -= nodeLength;
    }

    currentOffset += nodeLength;
  }

  return started ? range : null;
}
```

**Context-Based Text Matching:**
```typescript
// src/content/textMatcher.ts

interface TextNodeInfo {
  node: Text;
  start: number;
  end: number;
}

export function findTextByContext(
  contextBefore: string,
  text: string,
  contextAfter: string
): Range | null {
  // Collect all text nodes
  const textNodes: TextNodeInfo[] = [];
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null
  );

  let fullText = '';
  let node: Text | null;

  while ((node = walker.nextNode() as Text | null)) {
    const content = node.textContent || '';
    textNodes.push({
      node,
      start: fullText.length,
      end: fullText.length + content.length
    });
    fullText += content;
  }

  // Search for pattern
  const pattern = normalizeWhitespace(contextBefore + text + contextAfter);
  const normalizedFull = normalizeWhitespace(fullText);

  const patternIndex = normalizedFull.indexOf(pattern);
  if (patternIndex === -1) {
    // Try with just the text if context doesn't match exactly
    return findTextOnly(textNodes, fullText, text);
  }

  // Calculate text position
  const textStart = patternIndex + contextBefore.length;
  const textEnd = textStart + text.length;

  // Map back to Range
  return createRangeFromPosition(textNodes, textStart, textEnd);
}

function normalizeWhitespace(str: string): string {
  return str.replace(/\s+/g, ' ').trim();
}

function findTextOnly(
  textNodes: TextNodeInfo[],
  fullText: string,
  text: string
): Range | null {
  const index = fullText.indexOf(text);
  if (index === -1) return null;

  return createRangeFromPosition(textNodes, index, index + text.length);
}

function createRangeFromPosition(
  textNodes: TextNodeInfo[],
  start: number,
  end: number
): Range | null {
  const range = document.createRange();
  let foundStart = false;

  for (const info of textNodes) {
    if (!foundStart && info.end > start) {
      range.setStart(info.node, start - info.start);
      foundStart = true;
    }

    if (foundStart && info.end >= end) {
      range.setEnd(info.node, end - info.start);
      return range;
    }
  }

  return null;
}
```

**Highlight Rendering:**
```typescript
// src/content/highlight.ts

const HIGHLIGHT_CLASS = 'lingorecall-highlight';
const HIGHLIGHT_STYLES = `
  .${HIGHLIGHT_CLASS} {
    background-color: #FEF08A;
    border-radius: 2px;
    padding: 0 2px;
    animation: lingorecall-fade 0.5s ease-out forwards;
    animation-delay: 4.5s;
  }

  @keyframes lingorecall-fade {
    from { background-color: #FEF08A; }
    to { background-color: transparent; }
  }
`;

let stylesInjected = false;

function injectHighlightStyles(): void {
  if (stylesInjected) return;

  const style = document.createElement('style');
  style.textContent = HIGHLIGHT_STYLES;
  document.head.appendChild(style);
  stylesInjected = true;
}

export function highlightRange(range: Range): HTMLElement {
  injectHighlightStyles();

  const mark = document.createElement('mark');
  mark.className = HIGHLIGHT_CLASS;

  try {
    range.surroundContents(mark);
  } catch {
    // Range spans multiple elements, use extractContents
    mark.appendChild(range.extractContents());
    range.insertNode(mark);
  }

  return mark;
}

export function scrollToElement(element: HTMLElement): void {
  element.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
    inline: 'nearest'
  });
}

export function scheduleHighlightRemoval(mark: HTMLElement): void {
  // Wait for animation to complete (4.5s delay + 0.5s animation)
  setTimeout(() => {
    const parent = mark.parentNode;
    if (!parent) return;

    // Restore original text structure
    const textNode = document.createTextNode(mark.textContent || '');
    parent.replaceChild(textNode, mark);
    parent.normalize(); // Merge adjacent text nodes
  }, 5500);
}
```

**Complete HIGHLIGHT_WORD Handler:**
```typescript
// src/content/index.ts (HIGHLIGHT_WORD implementation)
import { locateTextByXPath } from './xpath';
import { findTextByContext } from './textMatcher';
import { highlightRange, scrollToElement, scheduleHighlightRemoval } from './highlight';
import { showToast } from './components/Toast';
import type { Response } from '@/shared/types';

interface HighlightWordPayload {
  xpath: string;
  textOffset: number;
  textLength: number;
  text: string;
  contextBefore: string;
  contextAfter: string;
}

async function highlightAndScrollToWord(
  payload: HighlightWordPayload
): Promise<Response<void>> {
  const { xpath, textOffset, textLength, text, contextBefore, contextAfter } = payload;

  // Step 1: Try XPath + offset positioning
  let range = locateTextByXPath(xpath, textOffset, textLength);

  // Step 2: Fall back to context matching
  if (!range) {
    console.log('[LingoRecall] XPath failed, trying context match');
    range = findTextByContext(contextBefore, text, contextAfter);
  }

  // Step 3: Handle failure
  if (!range) {
    showToast('Cannot locate this word on the current page, content may have changed', 5000);
    return {
      success: false,
      error: { code: 'LOCATION_FAILED', message: 'Could not locate text on page' }
    };
  }

  // Step 4: Highlight and scroll
  const mark = highlightRange(range);

  // Small delay before scroll for better UX
  await new Promise(resolve => setTimeout(resolve, 100));
  scrollToElement(mark);

  // Step 5: Schedule removal
  scheduleHighlightRemoval(mark);

  return { success: true };
}

// Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'HIGHLIGHT_WORD') {
    highlightAndScrollToWord(message.payload).then(sendResponse);
    return true; // Async response
  }
});
```

**Toast Component:**
```typescript
// src/content/components/Toast.tsx
let toastContainer: HTMLElement | null = null;

function ensureToastContainer(): HTMLElement {
  if (toastContainer) return toastContainer;

  const host = document.createElement('lingorecall-toast');
  const shadow = host.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = `
    .toast {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #FEF3C7;
      color: #92400E;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      z-index: 2147483647;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    .toast.visible {
      opacity: 1;
    }
  `;
  shadow.appendChild(style);

  const toast = document.createElement('div');
  toast.className = 'toast';
  shadow.appendChild(toast);

  document.body.appendChild(host);
  toastContainer = toast;

  return toast;
}

export function showToast(message: string, duration: number = 3000): void {
  const toast = ensureToastContainer();
  toast.textContent = message;
  toast.classList.add('visible');

  setTimeout(() => {
    toast.classList.remove('visible');
  }, duration);
}
```

### References

- Architecture Decision: XPath Dual Positioning Strategy (Section 5.1)
- PRD Section 8.3: Jump-back Highlight Styles
- Project Context: Shadow DOM UI Injection Rules
- Epics: Story 2.4 Acceptance Criteria

### Testing Considerations

1. Test XPath location on various DOM structures
2. Test text spanning multiple text nodes
3. Test whitespace handling in context matching
4. Test highlight on pages with dynamic content
5. Test scroll behavior with different viewport sizes
6. Test fade animation timing (5 second total)
7. Test mark element cleanup after animation
8. Test Toast display in Shadow DOM isolation
9. Mock document.evaluate for unit tests

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex CLI), Claude Opus 4.5 (Test Expansion)

### Completion Notes List

1. 跨节点高亮改为逐段包裹，避免破坏原始 DOM 结构
2. 多节点 Range 未完整覆盖时返回 null，避免错误高亮
3. 上下文回退仅保留完整匹配，减少重复词误高亮
4. 清理高亮时合并相邻文本节点，尽量恢复原始结构
5. 新增 XPath、多节点高亮、上下文匹配的单元测试
6. [2026-01-10] 扩展测试覆盖: xpath.test.ts 从 2 个测试扩展到 23 个测试
7. [2026-01-10] 扩展测试覆盖: textMatcher.test.ts 从 2 个测试扩展到 10 个测试
8. [2026-01-10] 测试覆盖中文文本、混合语言、嵌套元素、空上下文等边缘场景

### File List

**Created:**
- src/content/textMatcher.test.ts
- src/content/xpath.test.ts

**Modified:**
- src/content/highlight.ts
- src/content/highlight.test.ts
- src/content/textMatcher.ts
- src/content/xpath.ts
- _bmad-output/implementation-artifacts/2-4-highlight-locate-source-position.md

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-10 | 扩展测试覆盖率：xpath (23 tests), textMatcher (10 tests), highlight (2 tests) | Amelia (Dev Agent) |
| 2026-01-10 | 验证所有 53 个测试通过 | Amelia (Dev Agent) |
