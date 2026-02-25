/**
 * IPC Bridge availability and safety tests.
 *
 * Tests that every window namespace installed by the preload script is
 * accessible and can be used with optional-chaining without throwing.
 *
 * Testing strategy:
 *   - The global window namespaces (window.api, window.win, window.app,
 *     window.task, window.personality, window.store, etc.) are installed by
 *     tests/setup/renderer.ts with jest.fn() stubs.
 *   - The "preload present" suite verifies that every bridge is accessible and
 *     that its methods can be called without error.
 *   - The "preload absent" suite verifies that optional-chaining (`?.`) access
 *     on an undefined namespace returns `undefined` rather than throwing.
 *   - This suite does NOT test the Electron main-process IPC handlers.
 *     It tests the renderer-side contract: "what happens when the bridge is
 *     present / absent from the renderer's window object".
 *
 * Namespaces under test:
 *   window.api       — flat legacy bridge (installed by installMockApi)
 *   window.win       — window controls (minimize/maximize/close)
 *   window.app       — app-level actions (popupMenu, setTheme, etc.)
 *   window.task      — AI task lifecycle (submit/cancel/onEvent)
 *   window.personality — personality file storage
 *   window.store     — model settings persistence
 *   window.workspace — workspace folder selection/management
 *   window.output    — output file storage
 *   window.posts     — posts/writings sync
 *   window.notification — desktop notifications
 *   window.clipboard — clipboard read/write
 *   window.fs        — filesystem operations
 *   window.dialog    — native dialog boxes
 *   window.agent     — agent sessions
 *   window.ai        — inference pipeline
 *   window.directories — RAG directory index
 *   window.documents — document import/management
 *   window.electron  — raw ipcRenderer bridge
 */

// ---------------------------------------------------------------------------
// Type helpers for window bridge type assertions
// ---------------------------------------------------------------------------

type AnyFn = (...args: unknown[]) => unknown

// ---------------------------------------------------------------------------
// Suite 1: All bridges present and callable (standard test environment)
// ---------------------------------------------------------------------------

describe('IPC Bridge — window.win (window controls)', () => {
  it('window.win is defined', () => {
    expect(window.win).toBeDefined()
  })

  it('window.win.minimize is callable', () => {
    expect(() => window.win.minimize()).not.toThrow()
  })

  it('window.win.maximize is callable', () => {
    expect(() => window.win.maximize()).not.toThrow()
  })

  it('window.win.close is callable', () => {
    expect(() => window.win.close()).not.toThrow()
  })

  it('window.win.isMaximized returns a Promise', () => {
    const result = window.win.isMaximized()
    expect(result).toBeInstanceOf(Promise)
  })

  it('window.win.isFullScreen returns a Promise', () => {
    const result = window.win.isFullScreen()
    expect(result).toBeInstanceOf(Promise)
  })

  it('window.win.onMaximizeChange returns an unsubscribe function', () => {
    const unsub = window.win.onMaximizeChange(jest.fn())
    expect(typeof unsub).toBe('function')
  })

  it('window.win.onFullScreenChange returns an unsubscribe function', () => {
    const unsub = window.win.onFullScreenChange(jest.fn())
    expect(typeof unsub).toBe('function')
  })
})

describe('IPC Bridge — window.app', () => {
  it('window.app is defined', () => {
    expect(window.app).toBeDefined()
  })

  it('window.app.popupMenu is callable', () => {
    expect(() => (window.app.popupMenu as AnyFn)()).not.toThrow()
  })

  it('window.app.onLanguageChange returns an unsubscribe function', () => {
    const unsub = window.app.onLanguageChange(jest.fn())
    expect(typeof unsub).toBe('function')
  })

  it('window.app.onThemeChange returns an unsubscribe function', () => {
    const unsub = window.app.onThemeChange(jest.fn())
    expect(typeof unsub).toBe('function')
  })
})

describe('IPC Bridge — window.task (AI task lifecycle)', () => {
  it('window.task is defined', () => {
    expect(window.task).toBeDefined()
  })

  it('window.task.submit returns a Promise', () => {
    const result = window.task.submit('ai-chat', {})
    expect(result).toBeInstanceOf(Promise)
  })

  it('window.task.cancel is callable without throwing', () => {
    expect(() => window.task.cancel('task-id')).not.toThrow()
  })

  it('window.task.onEvent returns an unsubscribe function', () => {
    const unsub = window.task.onEvent(jest.fn())
    expect(typeof unsub).toBe('function')
  })
})

describe('IPC Bridge — window.personality', () => {
  it('window.personality is defined', () => {
    expect(window.personality).toBeDefined()
  })

  it('window.personality.save returns a Promise', () => {
    const result = (window.personality.save as AnyFn)({})
    expect(result).toBeInstanceOf(Promise)
  })

  it('window.personality.loadAll returns a Promise', () => {
    const result = window.personality.loadAll()
    expect(result).toBeInstanceOf(Promise)
  })

  it('window.personality.delete is callable', () => {
    expect(() => (window.personality.delete as AnyFn)('section', 'file-id')).not.toThrow()
  })
})

describe('IPC Bridge — window.store (model settings)', () => {
  it('window.store is defined', () => {
    expect(window.store).toBeDefined()
  })

  it('window.store.getModelSettings returns a Promise', () => {
    const result = window.store.getModelSettings('openai')
    expect(result).toBeInstanceOf(Promise)
  })

  it('window.store.setSelectedModel returns a Promise', () => {
    const result = window.store.setSelectedModel('openai', 'gpt-4o')
    expect(result).toBeInstanceOf(Promise)
  })
})

describe('IPC Bridge — window.workspace', () => {
  it('window.workspace is defined', () => {
    expect(window.workspace).toBeDefined()
  })

  it('window.workspace.getCurrent returns a Promise', () => {
    const result = window.workspace.getCurrent()
    expect(result).toBeInstanceOf(Promise)
  })

  it('window.workspace.getRecent returns a Promise', () => {
    const result = window.workspace.getRecent()
    expect(result).toBeInstanceOf(Promise)
  })
})

describe('IPC Bridge — window.output', () => {
  it('window.output is defined', () => {
    expect(window.output).toBeDefined()
  })

  it('window.output.loadAll returns a Promise', () => {
    const result = window.output.loadAll()
    expect(result).toBeInstanceOf(Promise)
  })
})

describe('IPC Bridge — window.notification', () => {
  it('window.notification is defined', () => {
    expect(window.notification).toBeDefined()
  })

  it('window.notification.show returns a Promise', () => {
    const result = window.notification.show({ title: 'test', body: 'body' })
    expect(result).toBeInstanceOf(Promise)
  })

  it('window.notification.onEvent returns an unsubscribe function', () => {
    const unsub = window.notification.onEvent(jest.fn())
    expect(typeof unsub).toBe('function')
  })
})

describe('IPC Bridge — window.clipboard', () => {
  it('window.clipboard is defined', () => {
    expect(window.clipboard).toBeDefined()
  })

  it('window.clipboard.writeText returns a Promise', () => {
    const result = window.clipboard.writeText('hello')
    expect(result).toBeInstanceOf(Promise)
  })

  it('window.clipboard.readText returns a Promise', () => {
    const result = window.clipboard.readText()
    expect(result).toBeInstanceOf(Promise)
  })
})

describe('IPC Bridge — window.fs (filesystem)', () => {
  it('window.fs is defined', () => {
    expect(window.fs).toBeDefined()
  })

  it('window.fs.openFile returns a Promise', () => {
    const result = window.fs.openFile()
    expect(result).toBeInstanceOf(Promise)
  })

  it('window.fs.saveFile returns a Promise', () => {
    const result = (window.fs.saveFile as AnyFn)({ path: '/test', content: '' })
    expect(result).toBeInstanceOf(Promise)
  })

  it('window.fs.onWatchEvent returns an unsubscribe function', () => {
    const unsub = window.fs.onWatchEvent(jest.fn())
    expect(typeof unsub).toBe('function')
  })
})

describe('IPC Bridge — window.ai (inference pipeline)', () => {
  it('window.ai is defined', () => {
    expect(window.ai).toBeDefined()
  })

  it('window.ai.inference returns a Promise', () => {
    const result = (window.ai.inference as AnyFn)({})
    expect(result).toBeInstanceOf(Promise)
  })

  it('window.ai.onEvent returns an unsubscribe function', () => {
    const unsub = window.ai.onEvent(jest.fn())
    expect(typeof unsub).toBe('function')
  })
})

describe('IPC Bridge — window.electron (raw ipcRenderer)', () => {
  it('window.electron is defined', () => {
    expect(window.electron).toBeDefined()
  })

  it('window.electron.ipcRenderer is defined', () => {
    expect(window.electron.ipcRenderer).toBeDefined()
  })

  it('window.electron.ipcRenderer.invoke is callable', () => {
    expect(typeof window.electron.ipcRenderer.invoke).toBe('function')
  })

  it('window.electron.ipcRenderer.on is callable', () => {
    expect(typeof window.electron.ipcRenderer.on).toBe('function')
  })

  it('window.electron.process.platform is available', () => {
    expect(window.electron.process.platform).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// Suite 2: Optional-chaining safety when bridges are absent
//
// This suite simulates the scenario where the preload script was NOT loaded
// (e.g., a plain browser window, an iframe, or a missing contextBridge config).
// In that environment, window.task, window.personality, etc. are undefined.
//
// The Electron security model requires using optional chaining (?.) whenever
// accessing these bridges to prevent TypeErrors from crashing the renderer.
// ---------------------------------------------------------------------------

describe('IPC Bridge — optional-chaining safety when bridges are absent', () => {
  // Store originals for cleanup
  const originals: Record<string, unknown> = {}
  const bridgeNames = ['task', 'personality', 'store', 'output', 'notification', 'ai'] as const

  beforeEach(() => {
    for (const name of bridgeNames) {
      originals[name] = (window as Record<string, unknown>)[name]
      Object.defineProperty(window, name, {
        value: undefined,
        writable: true,
        configurable: true
      })
    }
  })

  afterEach(() => {
    for (const name of bridgeNames) {
      Object.defineProperty(window, name, {
        value: originals[name],
        writable: true,
        configurable: true
      })
    }
  })

  it('window.task?.submit does not throw when window.task is undefined', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => (window.task as any)?.submit?.('ai-chat', {})).not.toThrow()
  })

  it('window.task?.onEvent does not throw when window.task is undefined', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => (window.task as any)?.onEvent?.(jest.fn())).not.toThrow()
  })

  it('window.task?.cancel does not throw when window.task is undefined', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => (window.task as any)?.cancel?.('id')).not.toThrow()
  })

  it('window.personality?.save does not throw when window.personality is undefined', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => (window.personality as any)?.save?.({})).not.toThrow()
  })

  it('window.personality?.loadAll does not throw when window.personality is undefined', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => (window.personality as any)?.loadAll?.()).not.toThrow()
  })

  it('window.store?.getModelSettings does not throw when window.store is undefined', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => (window.store as any)?.getModelSettings?.('openai')).not.toThrow()
  })

  it('window.output?.loadAll does not throw when window.output is undefined', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => (window.output as any)?.loadAll?.()).not.toThrow()
  })

  it('window.notification?.show does not throw when window.notification is undefined', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => (window.notification as any)?.show?.({})).not.toThrow()
  })

  it('window.ai?.inference does not throw when window.ai is undefined', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => (window.ai as any)?.inference?.({})).not.toThrow()
  })

  it('optional-chaining returns undefined for all absent bridge methods', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((window.task as any)?.submit?.('ai-chat', {})).toBeUndefined()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((window.personality as any)?.save?.({})).toBeUndefined()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((window.store as any)?.getModelSettings?.('openai')).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Suite 3: Bridge mock default return values match expected shapes
//
// Ensures the test mocks installed by renderer.ts return values that
// match what real Electron bridges would return, so tests that depend on
// these shapes don't silently pass against incorrect stubs.
// ---------------------------------------------------------------------------

describe('IPC Bridge — mock default return value shapes', () => {
  it('window.task.submit resolves to { success, data.taskId }', async () => {
    const result = await window.task.submit('ai-chat', {})
    expect(result).toMatchObject({ success: true, data: { taskId: expect.any(String) } })
  })

  it('window.win.isMaximized resolves to a boolean', async () => {
    const result = await window.win.isMaximized()
    expect(typeof result).toBe('boolean')
  })

  it('window.win.isFullScreen resolves to a boolean', async () => {
    const result = await window.win.isFullScreen()
    expect(typeof result).toBe('boolean')
  })

  it('window.personality.save resolves to an object with an id', async () => {
    const result = await (window.personality.save as AnyFn)({})
    expect(result).toHaveProperty('id')
  })

  it('window.personality.loadAll resolves to an array', async () => {
    const result = await window.personality.loadAll()
    expect(Array.isArray(result)).toBe(true)
  })

  it('window.store.getModelSettings resolves to null by default', async () => {
    const result = await window.store.getModelSettings('openai')
    expect(result).toBeNull()
  })

  it('window.notification.show resolves to a string notification ID', async () => {
    const result = await window.notification.show({ title: 'T', body: 'B' })
    expect(typeof result).toBe('string')
  })

  it('window.workspace.getCurrent resolves to null by default', async () => {
    const result = await window.workspace.getCurrent()
    expect(result).toBeNull()
  })

  it('window.workspace.getRecent resolves to an empty array by default', async () => {
    const result = await window.workspace.getRecent()
    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(0)
  })
})
