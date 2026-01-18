/**
 * Vitest Setup File
 * Provides global test utilities and mocks
 */

import type React from 'react';
import { vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';

// Mock react-i18next with English translations
vi.mock('react-i18next', async () => {
  const enTranslations = await import('../i18n/locales/en.json');

  // Resolve nested translation key from translations object
  const resolveTranslation = (key: string, translations: Record<string, unknown>): string => {
    const parts = key.split('.');
    let result: unknown = translations;

    for (const part of parts) {
      if (result && typeof result === 'object' && part in (result as Record<string, unknown>)) {
        result = (result as Record<string, unknown>)[part];
      } else {
        return key;
      }
    }

    return typeof result === 'string' ? result : key;
  };

  // Create a t function that resolves translations
  const mockT = (key: string, options?: Record<string, unknown>) => {
    let translation = resolveTranslation(key, enTranslations.default);

    // Handle interpolation like {{count}} or {{name}}
    if (options && typeof translation === 'string') {
      Object.entries(options).forEach(([k, v]) => {
        translation = translation.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
      });
    }

    return translation;
  };

  return {
    useTranslation: () => ({
      t: mockT,
      i18n: {
        language: 'en',
        changeLanguage: vi.fn(),
      },
    }),
    Trans: ({ children }: { children: React.ReactNode }) => children,
    I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
    initReactI18next: {
      type: '3rdParty',
      init: vi.fn(),
    },
  };
});

// Mock i18next
vi.mock('i18next', async () => {
  const enTranslations = await import('../i18n/locales/en.json');

  const resolveTranslation = (key: string, translations: Record<string, unknown>): string => {
    const parts = key.split('.');
    let result: unknown = translations;

    for (const part of parts) {
      if (result && typeof result === 'object' && part in (result as Record<string, unknown>)) {
        result = (result as Record<string, unknown>)[part];
      } else {
        return key;
      }
    }

    return typeof result === 'string' ? result : key;
  };

  const mockT = (key: string, options?: Record<string, unknown>) => {
    let translation = resolveTranslation(key, enTranslations.default);

    if (options && typeof translation === 'string') {
      Object.entries(options).forEach(([k, v]) => {
        translation = translation.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
      });
    }

    return translation;
  };

  return {
    default: {
      t: mockT,
      language: 'en',
      changeLanguage: vi.fn(),
      use: vi.fn().mockReturnThis(),
      init: vi.fn(),
      on: vi.fn(),
      services: {
        languageDetector: {
          addDetector: vi.fn(),
        },
      },
    },
  };
});

// Mock chrome API for extension tests
const chromeMock = {
  runtime: {
    sendMessage: vi.fn().mockResolvedValue({ success: true }),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    connect: vi.fn(() => ({
      onMessage: { addListener: vi.fn() },
      onDisconnect: { addListener: vi.fn() },
      postMessage: vi.fn(),
    })),
    getURL: vi.fn((path: string) => `chrome-extension://mock-id/${path}`),
    id: 'mock-extension-id',
  },
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
    },
    sync: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
    },
  },
  tabs: {
    query: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ id: 1, url: '' }),
    update: vi.fn().mockResolvedValue({}),
    sendMessage: vi.fn().mockResolvedValue({}),
    onUpdated: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  windows: {
    getCurrent: vi.fn().mockResolvedValue({ id: 1 }),
    update: vi.fn().mockResolvedValue({}),
  },
  alarms: {
    create: vi.fn(),
    clear: vi.fn().mockResolvedValue(true),
    get: vi.fn().mockResolvedValue(null),
    onAlarm: {
      addListener: vi.fn(),
    },
  },
  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
  },
};

// @ts-expect-error Mock chrome global
globalThis.chrome = chromeMock;

// Mock window.getSelection for content script tests
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'getSelection', {
    value: vi.fn(() => ({
      toString: () => '',
      isCollapsed: true,
      getRangeAt: vi.fn(),
      rangeCount: 0,
    })),
    writable: true,
  });
}

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});
