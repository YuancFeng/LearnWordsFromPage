# Story 4.3: Website Blacklist Management

Status: done

## Story

As a LingoRecall user,
I want to disable extension features on specific websites,
so that my privacy is protected on sensitive pages like banking and payment sites.

## Acceptance Criteria

### AC1: Add URL Pattern to Blacklist
**Given** the user opens the "Blacklist" section of the settings page
**When** the user enters a URL pattern (e.g., `*.bank.com`) and clicks "Add"
**Then** the URL pattern is added to the `blacklistUrls` array
**And** the pattern is displayed in the blacklist list

### AC2: Remove URL Pattern from Blacklist
**Given** there are URL patterns in the blacklist
**When** the user clicks the delete button on a pattern entry
**Then** the URL pattern is removed from `blacklistUrls`

### AC3: Content Script Disabled on Blacklisted Sites
**Given** the user visits a website matching a blacklist pattern
**When** the page finishes loading
**Then** the extension's Content Script does not activate
**And** the extension icon shows a disabled state

### AC4: Preset Default Blacklist
**Given** the user installs the extension for the first time
**When** the user views the blacklist settings
**Then** preset sensitive website patterns are displayed:
- `*.paypal.com`
- `*.alipay.com`
- `*bank*`

## Tasks / Subtasks

- [ ] Task 1: Define blacklist data structure (AC: #4)
  - [ ] 1.1: Add `blacklistUrls` to Settings interface
  - [ ] 1.2: Define default blacklist patterns in `DEFAULT_SETTINGS`
  - [ ] 1.3: Create URL pattern type definitions

- [ ] Task 2: Create BlacklistSection component (AC: #1, #2, #4)
  - [ ] 2.1: Create `src/popup/components/BlacklistSection.tsx`
  - [ ] 2.2: Implement URL pattern input with validation
  - [ ] 2.3: Implement blacklist display list with delete buttons
  - [ ] 2.4: Add "Reset to defaults" option

- [ ] Task 3: Implement URL pattern validation (AC: #1)
  - [ ] 3.1: Create `src/shared/utils/urlMatcher.ts`
  - [ ] 3.2: Implement pattern validation function
  - [ ] 3.3: Show validation errors for invalid patterns
  - [ ] 3.4: Prevent duplicate pattern entries

- [ ] Task 4: Implement URL matching logic (AC: #3)
  - [ ] 4.1: Implement `matchesBlacklist(url: string, patterns: string[])` function
  - [ ] 4.2: Support wildcard patterns (`*` for any characters)
  - [ ] 4.3: Support domain wildcards (`*.domain.com`)
  - [ ] 4.4: Add unit tests for matching logic

- [ ] Task 5: Content Script blacklist check (AC: #3)
  - [ ] 5.1: Load blacklist settings on Content Script initialization
  - [ ] 5.2: Check current URL against blacklist before activating
  - [ ] 5.3: Implement early exit if URL matches blacklist
  - [ ] 5.4: Listen for blacklist updates via messaging

- [ ] Task 6: Update extension icon state (AC: #3)
  - [ ] 6.1: Create disabled icon variant (grayed out)
  - [ ] 6.2: Implement icon state change based on blacklist match
  - [ ] 6.3: Add tooltip explaining disabled state

- [ ] Task 7: Write unit tests
  - [ ] 7.1: Test URL pattern matching with various patterns
  - [ ] 7.2: Test blacklist add/remove operations
  - [ ] 7.3: Test Content Script early exit on blacklisted sites
  - [ ] 7.4: Test default blacklist initialization

## Dev Notes

### Technical Requirements

#### URL Pattern Matching
```typescript
// src/shared/utils/urlMatcher.ts

/**
 * Converts URL pattern to RegExp
 * Supports:
 * - `*` matches any characters
 * - `*.domain.com` matches any subdomain
 * - `*bank*` matches URLs containing "bank"
 */
export function patternToRegex(pattern: string): RegExp {
  // Escape special regex characters except *
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');

  return new RegExp(`^${escaped}$`, 'i');
}

/**
 * Check if URL matches any blacklist pattern
 */
export function matchesBlacklist(url: string, patterns: string[]): boolean {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;
    const fullUrl = url.toLowerCase();

    return patterns.some(pattern => {
      const normalizedPattern = pattern.toLowerCase();

      // Check hostname match
      if (patternToRegex(normalizedPattern).test(hostname)) {
        return true;
      }

      // Check full URL match
      if (patternToRegex(normalizedPattern).test(fullUrl)) {
        return true;
      }

      return false;
    });
  } catch {
    return false;
  }
}

/**
 * Validate URL pattern format
 */
export function isValidPattern(pattern: string): boolean {
  if (!pattern || pattern.trim().length === 0) {
    return false;
  }

  // Pattern should not be just wildcards
  if (/^\*+$/.test(pattern)) {
    return false;
  }

  // Should contain at least one non-wildcard character
  const nonWildcard = pattern.replace(/\*/g, '');
  return nonWildcard.length >= 2;
}
```

#### Default Blacklist Patterns
```typescript
// In DEFAULT_SETTINGS
blacklistUrls: [
  '*.paypal.com',
  '*.alipay.com',
  '*bank*',
  '*.stripe.com',
  '*.venmo.com',
  'pay.google.com',
]
```

### File Structure

**Files to Create:**
```
src/
  shared/
    utils/
      urlMatcher.ts           # URL pattern matching utilities
      urlMatcher.test.ts      # Unit tests for URL matching
  popup/
    components/
      BlacklistSection.tsx    # Blacklist management UI
      PatternInput.tsx        # Pattern input with validation
      PatternList.tsx         # Display list of patterns
  public/
    icons/
      icon-disabled.png       # Grayed out icon for blacklist
```

**Files to Modify:**
```
src/shared/types/settings.ts  # Already has blacklistUrls
src/content/index.ts          # Add blacklist check
src/background/index.ts       # Handle icon state changes
```

### Key Code Patterns

#### BlacklistSection Component
```typescript
// src/popup/components/BlacklistSection.tsx
export function BlacklistSection() {
  const { settings, updateSetting } = useSettings();
  const [newPattern, setNewPattern] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async () => {
    setError(null);

    if (!isValidPattern(newPattern)) {
      setError('Invalid pattern. Use wildcards like *.domain.com or *keyword*');
      return;
    }

    if (settings.blacklistUrls.includes(newPattern.toLowerCase())) {
      setError('This pattern already exists');
      return;
    }

    const updated = [...settings.blacklistUrls, newPattern.toLowerCase()];
    await updateSetting('blacklistUrls', updated);
    setNewPattern('');
  };

  const handleRemove = async (pattern: string) => {
    const updated = settings.blacklistUrls.filter(p => p !== pattern);
    await updateSetting('blacklistUrls', updated);
  };

  const handleResetDefaults = async () => {
    await updateSetting('blacklistUrls', DEFAULT_SETTINGS.blacklistUrls);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Website Blacklist</h2>
      <p className="text-sm text-gray-500">
        The extension will be disabled on these websites to protect your privacy.
      </p>

      {/* Add Pattern Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newPattern}
          onChange={(e) => setNewPattern(e.target.value)}
          placeholder="*.example.com or *keyword*"
          className="flex-1 px-3 py-2 border rounded-md"
        />
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-blue-500 text-white rounded-md"
        >
          Add
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Pattern List */}
      <ul className="space-y-2">
        {settings.blacklistUrls.map(pattern => (
          <li key={pattern} className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <code className="text-sm">{pattern}</code>
            <button
              onClick={() => handleRemove(pattern)}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 size={16} />
            </button>
          </li>
        ))}
      </ul>

      {/* Reset Defaults */}
      <button
        onClick={handleResetDefaults}
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        Reset to defaults
      </button>
    </div>
  );
}
```

#### Content Script Blacklist Check
```typescript
// src/content/index.ts
import { matchesBlacklist } from '@/shared/utils/urlMatcher';

async function initialize() {
  // Load settings
  const result = await chrome.storage.local.get('lingorecall_settings');
  const settings = result.lingorecall_settings || DEFAULT_SETTINGS;

  // Check if current site is blacklisted
  const currentUrl = window.location.href;
  if (matchesBlacklist(currentUrl, settings.blacklistUrls)) {
    console.log('[LingoRecall] Site is blacklisted, extension disabled');

    // Notify service worker to update icon
    chrome.runtime.sendMessage({
      type: 'UPDATE_ICON_STATE',
      payload: { disabled: true, tabId: null }
    });

    return; // Early exit - do not initialize extension features
  }

  // Continue with normal initialization
  initializeSelectionListener();
  initializeFloatingButton();
}

// Run initialization
initialize();
```

#### Service Worker Icon State Handler
```typescript
// src/background/index.ts
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'UPDATE_ICON_STATE') {
    const tabId = sender.tab?.id || message.payload.tabId;

    if (tabId && message.payload.disabled) {
      chrome.action.setIcon({
        tabId,
        path: {
          16: 'icons/icon-disabled-16.png',
          32: 'icons/icon-disabled-32.png',
          48: 'icons/icon-disabled-48.png',
        }
      });

      chrome.action.setTitle({
        tabId,
        title: 'LingoRecall - Disabled on this site'
      });
    }
  }
});

// Reset icon when navigating away from blacklisted site
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const result = await chrome.storage.local.get('lingorecall_settings');
    const settings = result.lingorecall_settings || DEFAULT_SETTINGS;

    const isBlacklisted = matchesBlacklist(tab.url, settings.blacklistUrls);

    if (!isBlacklisted) {
      // Reset to normal icon
      chrome.action.setIcon({
        tabId,
        path: {
          16: 'icons/icon-16.png',
          32: 'icons/icon-32.png',
          48: 'icons/icon-48.png',
        }
      });

      chrome.action.setTitle({
        tabId,
        title: 'LingoRecall AI'
      });
    }
  }
});
```

### URL Pattern Examples
| Pattern | Matches | Does Not Match |
|---------|---------|----------------|
| `*.paypal.com` | `www.paypal.com`, `checkout.paypal.com` | `paypal.com.fake.com` |
| `*bank*` | `www.mybank.com`, `bankofamerica.com` | `prankster.com` |
| `*.alipay.com` | `global.alipay.com` | `alipay.cn` |
| `pay.google.com` | Exact match only | `payments.google.com` |

### Icon Asset Requirements
Create grayed-out versions of extension icons:
- `icon-disabled-16.png`
- `icon-disabled-32.png`
- `icon-disabled-48.png`
- `icon-disabled-128.png`

Use grayscale filter or opacity reduction on original icons.

### References

- Architecture: `/Users/fengyuanchang/Projects_WSL/LearnWordsFromPage/_bmad-output/planning-artifacts/architecture.md` - Content Script initialization
- PRD: `/Users/fengyuanchang/Projects_WSL/LearnWordsFromPage/_bmad-output/planning-artifacts/prd.md` - Section "5.3 Security Requirements"
- Epics: `/Users/fengyuanchang/Projects_WSL/LearnWordsFromPage/_bmad-output/planning-artifacts/epics.md` - Story 4.3
- Project Context: `/Users/fengyuanchang/Projects_WSL/LearnWordsFromPage/_bmad-output/planning-artifacts/project-context.md` - Security Rules
