/**
 * Tests for ContextMenuIpc.
 * Verifies context-menu IPC handler registrations and that they build and
 * pop up the correct native menus.
 */
import { ipcMain, BrowserWindow, Menu } from 'electron'
import { ContextMenuIpc } from '../../../../src/main/ipc/ContextMenuIpc'
import { ServiceContainer } from '../../../../src/main/core/ServiceContainer'
import { EventBus } from '../../../../src/main/core/EventBus'

// The electron mock returns a shared mockBrowserWindowInstance for BrowserWindow.fromWebContents.
// We need a popup mock on the menu returned by Menu.buildFromTemplate.
const mockMenuPopup = jest.fn()

describe('ContextMenuIpc', () => {
  let module: ContextMenuIpc
  let container: ServiceContainer
  let eventBus: EventBus

  const EXPECTED_CHANNELS = ['context-menu:writing', 'context-menu:post']

  beforeEach(() => {
    jest.clearAllMocks()

    // Make Menu.buildFromTemplate return an object with a popup mock
    ;(Menu.buildFromTemplate as jest.Mock).mockReturnValue({ popup: mockMenuPopup })

    container = new ServiceContainer()
    eventBus = new EventBus()
    module = new ContextMenuIpc()
  })

  it('should have name "context-menu"', () => {
    expect(module.name).toBe('context-menu')
  })

  it('should register 2 ipcMain handlers', () => {
    module.register(container, eventBus)
    expect((ipcMain.handle as jest.Mock).mock.calls).toHaveLength(2)
  })

  it('should register all context-menu channels', () => {
    module.register(container, eventBus)
    const channels = (ipcMain.handle as jest.Mock).mock.calls.map((c: unknown[]) => c[0])
    for (const channel of EXPECTED_CHANNELS) {
      expect(channels).toContain(channel)
    }
  })

  describe('context-menu:writing handler', () => {
    it('should build a menu and call popup when a window is found', () => {
      module.register(container, eventBus)
      const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'context-menu:writing'
      )?.[1]
      expect(handler).toBeDefined()

      const mockSender = { send: jest.fn() }
      const mockEvent = { sender: mockSender }

      handler(mockEvent, 'writing-123', 'My Writing')

      expect(Menu.buildFromTemplate).toHaveBeenCalledTimes(1)
      expect(mockMenuPopup).toHaveBeenCalledTimes(1)
    })

    it('should include Open, Duplicate, Rename, and Move to Trash items in the menu template', () => {
      module.register(container, eventBus)
      const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'context-menu:writing'
      )?.[1]

      const mockEvent = { sender: { send: jest.fn() } }
      handler(mockEvent, 'writing-abc', 'Title')

      const template = (Menu.buildFromTemplate as jest.Mock).mock.calls[0][0]
      const labels = template.filter((item: { label?: string }) => item.label).map((item: { label: string }) => item.label)
      expect(labels).toEqual(expect.arrayContaining(['Open', 'Duplicate', 'Rename', 'Move to Trash']))
    })

    it('should send writing-action event with action "open" when Open is clicked', () => {
      module.register(container, eventBus)
      const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'context-menu:writing'
      )?.[1]

      const mockSend = jest.fn()
      const mockEvent = { sender: { send: mockSend } }
      const writingId = 'writing-id-open'

      handler(mockEvent, writingId, 'Some Title')

      const template = (Menu.buildFromTemplate as jest.Mock).mock.calls[0][0]
      const openItem = template.find((item: { label?: string }) => item.label === 'Open')
      openItem.click()

      expect(mockSend).toHaveBeenCalledWith('context-menu:writing-action', { action: 'open', writingId })
    })

    it('should send writing-action event with action "delete" when Move to Trash is clicked', () => {
      module.register(container, eventBus)
      const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'context-menu:writing'
      )?.[1]

      const mockSend = jest.fn()
      const mockEvent = { sender: { send: mockSend } }
      const writingId = 'writing-id-delete'

      handler(mockEvent, writingId, 'Some Title')

      const template = (Menu.buildFromTemplate as jest.Mock).mock.calls[0][0]
      const trashItem = template.find((item: { label?: string }) => item.label === 'Move to Trash')
      trashItem.click()

      expect(mockSend).toHaveBeenCalledWith('context-menu:writing-action', { action: 'delete', writingId })
    })

    it('should return early without building a menu when no window is found', () => {
      ;(BrowserWindow.fromWebContents as jest.Mock).mockReturnValueOnce(null)

      module.register(container, eventBus)
      const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'context-menu:writing'
      )?.[1]

      const mockEvent = { sender: { send: jest.fn() } }
      handler(mockEvent, 'writing-x', 'Title')

      expect(Menu.buildFromTemplate).not.toHaveBeenCalled()
      expect(mockMenuPopup).not.toHaveBeenCalled()
    })
  })

  describe('context-menu:post handler', () => {
    it('should build a menu and call popup when a window is found', () => {
      module.register(container, eventBus)
      const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'context-menu:post'
      )?.[1]
      expect(handler).toBeDefined()

      const mockEvent = { sender: { send: jest.fn() } }
      handler(mockEvent, 'post-456', 'My Post')

      expect(Menu.buildFromTemplate).toHaveBeenCalledTimes(1)
      expect(mockMenuPopup).toHaveBeenCalledTimes(1)
    })

    it('should include Open, Duplicate, Rename, and Move to Trash items in the menu template', () => {
      module.register(container, eventBus)
      const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'context-menu:post'
      )?.[1]

      const mockEvent = { sender: { send: jest.fn() } }
      handler(mockEvent, 'post-abc', 'Title')

      const template = (Menu.buildFromTemplate as jest.Mock).mock.calls[0][0]
      const labels = template.filter((item: { label?: string }) => item.label).map((item: { label: string }) => item.label)
      expect(labels).toEqual(expect.arrayContaining(['Open', 'Duplicate', 'Rename', 'Move to Trash']))
    })

    it('should send post-action event with action "open" when Open is clicked', () => {
      module.register(container, eventBus)
      const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'context-menu:post'
      )?.[1]

      const mockSend = jest.fn()
      const mockEvent = { sender: { send: mockSend } }
      const postId = 'post-id-open'

      handler(mockEvent, postId, 'Post Title')

      const template = (Menu.buildFromTemplate as jest.Mock).mock.calls[0][0]
      const openItem = template.find((item: { label?: string }) => item.label === 'Open')
      openItem.click()

      expect(mockSend).toHaveBeenCalledWith('context-menu:post-action', { action: 'open', postId })
    })

    it('should send post-action event with action "duplicate" when Duplicate is clicked', () => {
      module.register(container, eventBus)
      const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'context-menu:post'
      )?.[1]

      const mockSend = jest.fn()
      const mockEvent = { sender: { send: mockSend } }
      const postId = 'post-id-dup'

      handler(mockEvent, postId, 'Post Title')

      const template = (Menu.buildFromTemplate as jest.Mock).mock.calls[0][0]
      const dupItem = template.find((item: { label?: string }) => item.label === 'Duplicate')
      dupItem.click()

      expect(mockSend).toHaveBeenCalledWith('context-menu:post-action', { action: 'duplicate', postId })
    })

    it('should return early without building a menu when no window is found', () => {
      ;(BrowserWindow.fromWebContents as jest.Mock).mockReturnValueOnce(null)

      module.register(container, eventBus)
      const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'context-menu:post'
      )?.[1]

      const mockEvent = { sender: { send: jest.fn() } }
      handler(mockEvent, 'post-y', 'Title')

      expect(Menu.buildFromTemplate).not.toHaveBeenCalled()
      expect(mockMenuPopup).not.toHaveBeenCalled()
    })
  })
})
