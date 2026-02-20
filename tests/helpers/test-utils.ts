/**
 * Shared test utilities for Tesseract AI tests.
 */

/**
 * Wait for a specified number of milliseconds.
 * Useful for tests that need to wait for async operations.
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Creates a mock IPC event object, as would be passed by Electron's
 * ipcMain.handle() to its handler.
 */
export function createMockIpcEvent(senderId = 1) {
  return {
    sender: {
      id: senderId,
      send: jest.fn()
    },
    frameId: 1,
    processId: 1,
    returnValue: undefined,
    defaultPrevented: false,
    preventDefault: jest.fn()
  }
}

/**
 * Helper to flush all pending promises and microtasks.
 * Useful after dispatching actions or triggering async operations.
 */
export function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve))
}

/**
 * Creates a mock chat thread for testing.
 */
export function createMockThread(overrides: Record<string, unknown> = {}) {
  return {
    id: 'thread-1',
    title: 'Test Thread',
    messages: [],
    providerId: 'openai',
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    ...overrides
  }
}

/**
 * Creates a mock chat message for testing.
 */
export function createMockMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: 'msg-1',
    role: 'user' as const,
    content: 'Hello, AI!',
    timestamp: 1700000000000,
    ...overrides
  }
}
