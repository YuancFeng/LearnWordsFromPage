# Story 1.3: Implement Text Selection Listener

Status: in-progress

## Story

**As a** English learner,
**I want to** see an action button after selecting text on any webpage,
**So that** I can quickly trigger AI analysis.

## Acceptance Criteria

**AC-1: Text Selection Detection**
- **Given** the user is browsing any webpage
- **When** the user selects text between 1-50 characters
- **Then** a floating button appears at the top-right of the selection (8px offset)
- **And** the button is a 32x32px circular icon

**AC-2: Button Animation**
- **Given** text is selected
- **When** the floating button appears
- **Then** it fades in within 300ms

**AC-3: Button Dismissal**
- **Given** the floating button is visible
- **When** the user clicks elsewhere on the page
- **Then** the button disappears

**AC-4: Selection Length Limit**
- **Given** the user selects text
- **When** the selected text exceeds 50 characters
- **Then** the floating button does NOT appear

**AC-5: Performance Requirement**
- **Given** the Content Script is loaded
- **When** measuring script initialization time
- **Then** Content Script load time is < 100ms

## Tasks / Subtasks

- [x] **Task 1: Create Selection Detection Module** (AC: #1, #4)
  - [x] 1.1 Implemented in `src/content/index.ts` (integrated with Shadow DOM)
  - [x] 1.2 Add mouseup event listener on document
  - [x] 1.3 Implement `getSelectedText()` via `window.getSelection()`
  - [x] 1.4 Implement selection length validation (1-50 chars)
  - [x] 1.5 Calculate selection bounding rect position via `getButtonPosition()`

- [x] **Task 2: Create Floating Button Component** (AC: #1, #2)
  - [x] 2.1 Created `src/content/components/FloatingButton.tsx` (Story 1.4)
  - [x] 2.2 Implement 32x32px circular button with icon
  - [x] 2.3 Position button at selection top-right
  - [x] 2.4 Add fadeIn animation (300ms)
  - [x] 2.5 Style with inline CSS (Shadow DOM compatible)

- [x] **Task 3: Implement Button Dismissal** (AC: #3)
  - [x] 3.1 Add click-outside detection via `handleDocumentClick`
  - [x] 3.2 Add fadeOut via `hideUI()`
  - [x] 3.3 Clean up handled by Shadow DOM module

- [x] **Task 4: Create Selection State Manager** (AC: #1, #3)
  - [x] 4.1 Track current selection state via `currentSelection`
  - [x] 4.2 Store selection metadata (text, position, range, sourceLocation)
  - [x] 4.3 Clear state on dismissal

- [x] **Task 5: Performance Optimization** (AC: #5)
  - [x] 5.1 Selection finalization delay (10ms setTimeout)
  - [x] 5.2 UI components rendered in Shadow DOM on demand
  - [x] 5.3 Measure and log initialization time
  - [x] 5.4 Ensure total load < 100ms with performance warning

- [x] **Task 6: Integration with Content Script** (AC: #1)
  - [x] 6.1 Initialize selection listener in `src/content/index.ts`
  - [x] 6.2 Connect button click to analysis trigger (handleAnalyze)
  - [x] 6.3 Export selection metadata with XPath (Story 1.5 integrated)

## Dev Notes

### Technical Requirements

**Selection Detection Algorithm:**
```typescript
// src/content/selection.ts

interface SelectionInfo {
  text: string;
  range: Range;
  rect: DOMRect;
  position: { x: number; y: number };
}

function getSelectionInfo(): SelectionInfo | null {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return null;

  const text = selection.toString().trim();
  if (text.length < 1 || text.length > 50) return null;

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  return {
    text,
    range,
    rect,
    position: {
      x: rect.right + 8,  // 8px offset from right edge
      y: rect.top - 8,    // 8px above selection
    },
  };
}
```

### File Structure

**Files to Create/Modify:**
```
src/content/
├── index.ts              # Entry point (modify)
├── selection.ts          # Selection detection module
├── state.ts              # Selection state management
└── components/
    └── FloatingButton.tsx # Floating button component
```

### Key Code Patterns

**Selection Listener:**
```typescript
// src/content/selection.ts

import { SelectionState, setSelectionState, clearSelectionState } from './state';

const MIN_LENGTH = 1;
const MAX_LENGTH = 50;
const DEBOUNCE_MS = 50;

let debounceTimer: number | null = null;

export interface SelectionInfo {
  text: string;
  range: Range;
  rect: DOMRect;
  position: { x: number; y: number };
}

export function getSelectionInfo(): SelectionInfo | null {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return null;

  const text = selection.toString().trim();

  // Validate length
  if (text.length < MIN_LENGTH || text.length > MAX_LENGTH) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  // Calculate button position (top-right of selection + 8px offset)
  const position = {
    x: rect.right + window.scrollX + 8,
    y: rect.top + window.scrollY - 8,
  };

  return { text, range, rect, position };
}

export function initSelectionListener(
  onSelection: (info: SelectionInfo) => void,
  onClear: () => void
): () => void {
  const handleMouseUp = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = window.setTimeout(() => {
      const info = getSelectionInfo();
      if (info) {
        onSelection(info);
      }
    }, DEBOUNCE_MS);
  };

  const handleClickOutside = (e: MouseEvent) => {
    // Check if click is outside our UI
    const target = e.target as HTMLElement;
    if (!target.closest('lingorecall-root')) {
      onClear();
    }
  };

  document.addEventListener('mouseup', handleMouseUp);
  document.addEventListener('mousedown', handleClickOutside);

  // Return cleanup function
  return () => {
    document.removeEventListener('mouseup', handleMouseUp);
    document.removeEventListener('mousedown', handleClickOutside);
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
  };
}
```

**Floating Button Component:**
```typescript
// src/content/components/FloatingButton.tsx

import React, { useState, useEffect } from 'react';

interface FloatingButtonProps {
  position: { x: number; y: number };
  onAnalyze: () => void;
  onSave: () => void;
}

const BUTTON_SIZE = 32;
const ANIMATION_DURATION = 300;

const styles = {
  container: {
    position: 'fixed' as const,
    zIndex: 2147483647, // Max z-index
    display: 'flex',
    gap: '4px',
  },
  button: {
    width: `${BUTTON_SIZE}px`,
    height: `${BUTTON_SIZE}px`,
    borderRadius: '50%',
    border: 'none',
    backgroundColor: '#3B82F6',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    transition: 'transform 0.15s ease, background-color 0.15s ease',
  },
  buttonHover: {
    transform: 'scale(1.1)',
    backgroundColor: '#2563EB',
  },
  icon: {
    width: '16px',
    height: '16px',
  },
};

export function FloatingButton({ position, onAnalyze, onSave }: FloatingButtonProps) {
  const [opacity, setOpacity] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Fade in animation
  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      setOpacity(1);
    });
    return () => cancelAnimationFrame(timer);
  }, []);

  return (
    <div
      style={{
        ...styles.container,
        left: `${position.x}px`,
        top: `${position.y}px`,
        opacity,
        transition: `opacity ${ANIMATION_DURATION}ms ease-in-out`,
      }}
    >
      <button
        style={{
          ...styles.button,
          ...(isHovered ? styles.buttonHover : {}),
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          onAnalyze();
        }}
        title="AI Analysis"
      >
        {/* AI Icon - simple SVG */}
        <svg style={styles.icon} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
        </svg>
      </button>
    </div>
  );
}
```

**Selection State Manager:**
```typescript
// src/content/state.ts

import { SelectionInfo } from './selection';

export interface SelectionState {
  info: SelectionInfo | null;
  isButtonVisible: boolean;
}

let currentState: SelectionState = {
  info: null,
  isButtonVisible: false,
};

type StateChangeCallback = (state: SelectionState) => void;
const listeners: StateChangeCallback[] = [];

export function getState(): SelectionState {
  return currentState;
}

export function setSelectionState(info: SelectionInfo): void {
  currentState = {
    info,
    isButtonVisible: true,
  };
  notifyListeners();
}

export function clearSelectionState(): void {
  currentState = {
    info: null,
    isButtonVisible: false,
  };
  notifyListeners();
}

export function subscribeToState(callback: StateChangeCallback): () => void {
  listeners.push(callback);
  return () => {
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  };
}

function notifyListeners(): void {
  listeners.forEach(cb => cb(currentState));
}
```

**Content Script Integration:**
```typescript
// src/content/index.ts

import { initSelectionListener, SelectionInfo } from './selection';
import { setSelectionState, clearSelectionState, subscribeToState } from './state';
import { injectUI, updateUI, removeUI } from './shadow'; // From Story 1.4

console.log('[LingoRecall] Content script loaded');

const startTime = performance.now();

function handleSelection(info: SelectionInfo): void {
  console.log('[LingoRecall] Selection:', info.text);
  setSelectionState(info);
}

function handleClear(): void {
  console.log('[LingoRecall] Selection cleared');
  clearSelectionState();
}

function init(): void {
  // Initialize selection listener
  initSelectionListener(handleSelection, handleClear);

  // Subscribe to state changes for UI updates
  subscribeToState((state) => {
    if (state.isButtonVisible && state.info) {
      // Will be implemented in Story 1.4
      // injectUI(state.info);
      console.log('[LingoRecall] Should show button at:', state.info.position);
    } else {
      // removeUI();
      console.log('[LingoRecall] Should hide button');
    }
  });

  const loadTime = performance.now() - startTime;
  console.log(`[LingoRecall] Initialized in ${loadTime.toFixed(2)}ms`);
}

init();
```

### Performance Considerations

1. **Debounce mouseup**: 50ms delay prevents excessive calls
2. **Lazy component loading**: Button component only instantiated when needed
3. **No external CSS**: All styles inline for fast rendering
4. **Minimal DOM operations**: Single UI root element

**Performance Measurement:**
```typescript
// Add to content script
const startTime = performance.now();
// ... initialization code ...
const loadTime = performance.now() - startTime;
if (loadTime > 100) {
  console.warn(`[LingoRecall] Slow initialization: ${loadTime}ms`);
}
```

### Dependencies

**No new dependencies required** - Using native browser APIs only.

### Testing Strategy

1. **Unit Tests:**
   - Test selection length validation
   - Test position calculation
   - Test debounce behavior

2. **Manual Testing:**
   - Test on Wikipedia article
   - Test on Twitter/X
   - Test on MDN docs
   - Verify button position correctness
   - Verify animation smoothness

**Test Cases:**
| Scenario | Expected Result |
|----------|-----------------|
| Select 1 char | Button appears |
| Select 50 chars | Button appears |
| Select 51 chars | Button does NOT appear |
| Select then click elsewhere | Button disappears |
| Fast multiple selections | Only last selection triggers button |

### References

- PRD: US-1.1 (Text Selection Trigger)
- PRD: UI Specification 8.1 (Floating Button)
- Architecture.md: Decision 3.2 (Shadow DOM injection - referenced for integration)
- project-context.md: Content Script performance requirement

### Edge Cases

- **No text selected**: getSelectionInfo returns null
- **Selection in iframe**: May not work, document limitation
- **Selection in input/textarea**: Should still work
- **Multiple rapid selections**: Debounce handles this
- **Selection across elements**: Range.getBoundingClientRect still works
- **RTL text**: Position calculation may need adjustment (future enhancement)
- **Page scroll during selection**: Use scroll offset in position calculation

### Definition of Done

- [x] Selection listener detects text selection
- [x] Button appears for 1-50 character selections
- [x] Button position is top-right of selection
- [x] Button is 32x32px circular
- [x] Button fades in within 300ms
- [x] Clicking elsewhere dismisses button
- [x] Selections > 50 chars don't show button
- [x] Content Script loads in < 100ms (with performance warning)
- [ ] Works on Wikipedia, Twitter, MDN (manual testing required)

---

## Dev Agent Record

### Implementation Summary

**Date**: 2026-01-08
**Agent**: Claude Opus 4.5

### Implementation Approach

Story 1.3 was largely implemented as part of Story 1.4 (Shadow DOM UI Isolation) since they share the same content script entry point. This session completed the integration by:

1. Adding XPath extraction (Story 1.5) to selection handling
2. Adjusting selection length limits from 100 to 50 characters
3. Adding performance measurement and warning

### Files Modified

1. **`src/content/index.ts`** - Selection handling
   - Align button anchor to selection top-right with 8px offset
   - Clear UI on invalid or cleared selections
   - Ignore Shadow DOM clicks via composedPath detection
   - Export helper functions for tests
2. **`src/content/components/FloatingButton.tsx`** - Button rendering/animation
   - Apply 300ms fade-in and fade-out on dismiss
   - Use anchored position without extra offsets
3. **`src/content/components/ShadowApp.tsx`** - UI state wiring
   - Propagate fade-out state to button
4. **`src/content/shadow.ts`** - UI lifecycle
   - Add dismiss fade-out state and timeout cleanup
5. **`src/content/styles/components.ts`** - Animation timing
   - Update button fade-in to 300ms
6. **`src/content/index.test.ts`** - Unit tests
   - Validate selection length rules and button anchor positioning
7. **`package.json`** - Test tooling
   - Add `vitest` devDependency and `test` script

### Review Fixes (2026-01-08)

1. Corrected button placement to top-right + 8px offset
2. Added 300ms fade-in and fade-out on dismiss
3. Clear UI on invalid or cleared selections
4. Added unit tests and Vitest test script

### Review Fixes (2026-01-11)

1. Hardened click-outside detection for closed Shadow DOM
2. Measured initialization time from init start (excludes DOM readiness wait)
3. Marked story as in-progress pending cross-site manual testing

### Repository Notes

- Unrelated uncommitted changes observed during review: `index.html`, `manifest.json`, `tsconfig.json`, `vite.config.ts`

### Technical Decisions

1. **Integrated approach**: Rather than creating separate `selection.ts` and `state.ts` modules, all selection handling is in `index.ts` for simplicity and to avoid circular dependencies with Shadow DOM module.

2. **XPath integration**: SourceLocation from Story 1.5 is now extracted on every selection and used for ANALYZE_WORD and SAVE_WORD messages.

3. **Context building**: Uses SourceLocation's `contextBefore` + `text` + `contextAfter` for richer AI context, with fallback to simple text content.

### Build Verification

```
npm run build - SUCCESS
- dist/content.js: 20.92 kB (gzip: 6.51 kB)
- 1723 modules transformed
- Built in 1.64s
```

### Pending Manual Testing

Cross-site compatibility testing required on:
- Wikipedia (heavy CSS)
- Twitter/X (CSS-in-JS)
- MDN (modern CSS)
