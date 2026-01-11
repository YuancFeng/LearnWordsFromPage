/**
 * Vitest Setup File
 * Provides global test utilities and mocks
 */

import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';

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
