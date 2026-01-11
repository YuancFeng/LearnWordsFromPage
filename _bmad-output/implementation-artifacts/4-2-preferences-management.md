# Story 4.2: Preferences Management

Status: ready-for-dev

## Story

As a LingoRecall user,
I want to customize the extension's interaction methods and appearance,
so that the extension behavior matches my usage habits.

## Acceptance Criteria

### AC1: Toggle Double-Click Word Lookup
**Given** the user opens the "Preferences" section of the settings page
**When** the user toggles the "Double-click to look up" switch
**Then** the `enableDoubleClick` setting takes effect immediately
**And** the setting is automatically saved to `chrome.storage.local`

### AC2: Toggle Hover Icon Display
**Given** the user is on the settings page
**When** the user toggles the "Show hover icon" switch
**Then** the `enableHoverIcon` setting takes effect immediately

### AC3: Theme Selection
**Given** the user is on the settings page
**When** the user selects 'light' / 'dark' / 'system' from the theme dropdown
**Then** the extension UI theme changes immediately
**And** the setting is saved to storage

### AC4: Default Settings
**Given** the user installs the extension for the first time
**When** the user opens the settings page
**Then** default values are displayed:
- `enableDoubleClick`: true
- `enableHoverIcon`: true
- `reviewReminder`: true
- `theme`: 'system'

## Tasks / Subtasks

- [ ] Task 1: Define Settings interface and defaults (AC: #4)
  - [ ] 1.1: Create `src/shared/types/settings.ts` with Settings interface
  - [ ] 1.2: Define `DEFAULT_SETTINGS` constant
  - [ ] 1.3: Export type definitions for use across modules

- [ ] Task 2: Implement settings storage layer (AC: #1, #2, #3, #4)
  - [ ] 2.1: Add `getSettings()` function to `src/shared/storage/config.ts`
  - [ ] 2.2: Add `saveSettings(settings: Partial<Settings>)` function
  - [ ] 2.3: Implement settings initialization on first load
  - [ ] 2.4: Handle settings migration for future updates

- [ ] Task 3: Create useSettings hook (AC: #1, #2, #3, #4)
  - [ ] 3.1: Create `src/hooks/useSettings.ts`
  - [ ] 3.2: Implement real-time settings sync with storage
  - [ ] 3.3: Add individual setting update methods
  - [ ] 3.4: Handle loading and error states

- [ ] Task 4: Create PreferencesSection component (AC: #1, #2, #3)
  - [ ] 4.1: Create `src/popup/components/PreferencesSection.tsx`
  - [ ] 4.2: Implement toggle switch for `enableDoubleClick`
  - [ ] 4.3: Implement toggle switch for `enableHoverIcon`
  - [ ] 4.4: Implement toggle switch for `reviewReminder`
  - [ ] 4.5: Implement dropdown for theme selection

- [ ] Task 5: Implement theme switching (AC: #3)
  - [ ] 5.1: Create theme CSS variables in popup styles
  - [ ] 5.2: Implement `useTheme` hook for theme detection and application
  - [ ] 5.3: Handle 'system' theme preference (prefers-color-scheme)
  - [ ] 5.4: Apply theme class to root element

- [ ] Task 6: Broadcast settings changes (AC: #1, #2)
  - [ ] 6.1: Send `SETTINGS_CHANGED` message to Content Script
  - [ ] 6.2: Content Script listens and updates behavior accordingly
  - [ ] 6.3: Implement debounced settings sync

- [ ] Task 7: Write unit tests
  - [ ] 7.1: Test default settings initialization
  - [ ] 7.2: Test settings persistence
  - [ ] 7.3: Test theme switching
  - [ ] 7.4: Test settings broadcast to Content Script

## Dev Notes

### Technical Requirements

#### Settings Interface
```typescript
// src/shared/types/settings.ts
export interface Settings {
  enableDoubleClick: boolean;    // Double-click to look up words
  enableHoverIcon: boolean;      // Show floating icon on text selection
  reviewReminder: boolean;       // Enable review notifications
  theme: 'light' | 'dark' | 'system';
  blacklistUrls: string[];       // Handled in Story 4.3
}

export const DEFAULT_SETTINGS: Settings = {
  enableDoubleClick: true,
  enableHoverIcon: true,
  reviewReminder: true,
  theme: 'system',
  blacklistUrls: ['*.paypal.com', '*.alipay.com', '*bank*'],
};
```

#### Storage Functions
```typescript
// src/shared/storage/config.ts
const SETTINGS_KEY = 'lingorecall_settings';

export async function getSettings(): Promise<Response<Settings>> {
  try {
    const result = await chrome.storage.local.get(SETTINGS_KEY);
    const settings = result[SETTINGS_KEY] || DEFAULT_SETTINGS;
    return { success: true, data: { ...DEFAULT_SETTINGS, ...settings } };
  } catch (error) {
    return {
      success: false,
      error: { code: 'STORAGE_ERROR', message: error.message }
    };
  }
}

export async function saveSettings(
  partialSettings: Partial<Settings>
): Promise<Response<void>> {
  try {
    const current = await getSettings();
    const updated = { ...current.data, ...partialSettings };
    await chrome.storage.local.set({ [SETTINGS_KEY]: updated });

    // Broadcast to content scripts
    await broadcastSettingsChange(updated);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: { code: 'STORAGE_ERROR', message: error.message }
    };
  }
}

async function broadcastSettingsChange(settings: Settings): Promise<void> {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'SETTINGS_CHANGED',
          payload: settings,
        });
      } catch {
        // Tab might not have content script loaded
      }
    }
  }
}
```

### File Structure

**Files to Create:**
```
src/
  shared/
    types/
      settings.ts             # Settings interface and defaults
  hooks/
    useSettings.ts            # Settings state management hook
    useTheme.ts               # Theme detection and application
  popup/
    components/
      PreferencesSection.tsx  # Preferences UI component
      ToggleSwitch.tsx        # Reusable toggle switch component
      ThemeSelect.tsx         # Theme dropdown component
```

**Files to Modify:**
```
src/shared/storage/config.ts  # Add settings functions
src/popup/App.tsx             # Apply theme class
src/content/index.ts          # Listen for settings changes
```

### Key Code Patterns

#### useSettings Hook
```typescript
// src/hooks/useSettings.ts
export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();

    // Listen for storage changes from other contexts
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes[SETTINGS_KEY]) {
        setSettings(changes[SETTINGS_KEY].newValue);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    const result = await getSettings();
    if (result.success && result.data) {
      setSettings(result.data);
    } else {
      setError(result.error?.message || 'Failed to load settings');
    }
    setIsLoading(false);
  };

  const updateSetting = async <K extends keyof Settings>(
    key: K,
    value: Settings[K]
  ): Promise<Response<void>> => {
    const result = await saveSettings({ [key]: value });
    if (result.success) {
      setSettings(prev => ({ ...prev, [key]: value }));
    }
    return result;
  };

  return {
    settings,
    isLoading,
    error,
    updateSetting,
    reloadSettings: loadSettings,
  };
}
```

#### useTheme Hook
```typescript
// src/hooks/useTheme.ts
export function useTheme() {
  const { settings, updateSetting } = useSettings();
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateResolvedTheme = () => {
      if (settings.theme === 'system') {
        setResolvedTheme(mediaQuery.matches ? 'dark' : 'light');
      } else {
        setResolvedTheme(settings.theme);
      }
    };

    updateResolvedTheme();
    mediaQuery.addEventListener('change', updateResolvedTheme);
    return () => mediaQuery.removeEventListener('change', updateResolvedTheme);
  }, [settings.theme]);

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = (theme: Settings['theme']) => updateSetting('theme', theme);

  return {
    theme: settings.theme,
    resolvedTheme,
    setTheme,
  };
}
```

#### PreferencesSection Component
```typescript
// src/popup/components/PreferencesSection.tsx
export function PreferencesSection() {
  const { settings, updateSetting, isLoading } = useSettings();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Preferences</h2>

      <div className="space-y-4">
        <ToggleSwitch
          label="Double-click to look up"
          description="Enable word lookup by double-clicking text"
          checked={settings.enableDoubleClick}
          onChange={(checked) => updateSetting('enableDoubleClick', checked)}
        />

        <ToggleSwitch
          label="Show hover icon"
          description="Display floating icon when selecting text"
          checked={settings.enableHoverIcon}
          onChange={(checked) => updateSetting('enableHoverIcon', checked)}
        />

        <ToggleSwitch
          label="Review reminders"
          description="Show badge count for pending reviews"
          checked={settings.reviewReminder}
          onChange={(checked) => updateSetting('reviewReminder', checked)}
        />

        <ThemeSelect
          value={settings.theme}
          onChange={(theme) => updateSetting('theme', theme)}
        />
      </div>
    </div>
  );
}
```

#### ToggleSwitch Component
```typescript
// src/popup/components/ToggleSwitch.tsx
interface ToggleSwitchProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function ToggleSwitch({
  label,
  description,
  checked,
  onChange,
  disabled
}: ToggleSwitchProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="font-medium">{label}</div>
        {description && (
          <div className="text-sm text-gray-500">{description}</div>
        )}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full
          transition-colors duration-200
          ${checked ? 'bg-blue-500' : 'bg-gray-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white
            transition-transform duration-200
            ${checked ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
    </div>
  );
}
```

### Theme CSS Variables
```css
/* In popup styles */
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f3f4f6;
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --border-color: #e5e7eb;
}

:root.dark {
  --bg-primary: #1f2937;
  --bg-secondary: #374151;
  --text-primary: #f9fafb;
  --text-secondary: #9ca3af;
  --border-color: #4b5563;
}

body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}
```

### Content Script Settings Listener
```typescript
// In src/content/index.ts
let currentSettings: Settings = DEFAULT_SETTINGS;

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SETTINGS_CHANGED') {
    currentSettings = message.payload;
    applySettings(currentSettings);
  }
});

function applySettings(settings: Settings) {
  // Update floating button behavior
  if (settings.enableHoverIcon) {
    enableFloatingButton();
  } else {
    disableFloatingButton();
  }

  // Update double-click handler
  if (settings.enableDoubleClick) {
    enableDoubleClickLookup();
  } else {
    disableDoubleClickLookup();
  }
}
```

### References

- Architecture: `/Users/fengyuanchang/Projects_WSL/LearnWordsFromPage/_bmad-output/planning-artifacts/architecture.md` - Section "Decision 1.1: Storage Scheme"
- PRD: `/Users/fengyuanchang/Projects_WSL/LearnWordsFromPage/_bmad-output/planning-artifacts/prd.md` - Section "6.3 Settings"
- Epics: `/Users/fengyuanchang/Projects_WSL/LearnWordsFromPage/_bmad-output/planning-artifacts/epics.md` - Story 4.2
- Project Context: `/Users/fengyuanchang/Projects_WSL/LearnWordsFromPage/_bmad-output/planning-artifacts/project-context.md` - Storage Layer Rules
