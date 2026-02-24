/**
 * Tests for DocumentsIpc.
 * Verifies document management IPC handler registrations and that each handler
 * interacts correctly with WorkspaceService, dialog, and the file system.
 *
 * DocumentsIpc uses wrapIpcHandler (IpcResult envelope) and window-scoped
 * services (getWindowService → windowContextManager chain).
 */
import { ipcMain, dialog } from 'electron'
import fs from 'node:fs/promises'
import { DocumentsIpc } from '../../../../src/main/ipc/DocumentsIpc'
import { ServiceContainer } from '../../../../src/main/core/ServiceContainer'
import { EventBus } from '../../../../src/main/core/EventBus'

// Mock fs/promises so no real I/O occurs
jest.mock('node:fs/promises')
const mockFs = fs as jest.Mocked<typeof fs>

// Mock file-type-validator utilities used inside the handlers
jest.mock('../../../../src/main/utils/file-type-validator', () => ({
  validateTextFiles: jest.fn((paths: string[]) => ({ validFiles: paths, invalidFiles: [] })),
  getAllTextExtensions: jest.fn(() => ['.txt', '.md']),
  getSupportedFileTypesDescription: jest.fn(() => 'Text files only')
}))

import { validateTextFiles } from '../../../../src/main/utils/file-type-validator'

describe('DocumentsIpc', () => {
  let module: DocumentsIpc
  let container: ServiceContainer
  let eventBus: EventBus
  let mockWorkspace: { getCurrent: jest.Mock }

  // All channels registered by DocumentsIpc
  const EXPECTED_CHANNELS = [
    'documents:import-files',
    'documents:import-by-paths',
    'documents:download-from-url',
    'documents:load-all',
    'documents:delete-file'
  ]

  // Shared mock IPC event — wired through windowContextManager chain.
  // BrowserWindow.fromWebContents returns mock with id=1, so
  // windowContextManager.get(1) → mockWindowContext → getService() → mockWorkspace.
  let mockEvent: { sender: { id: number } }

  const FAKE_WORKSPACE = '/fake/workspace'
  const FAKE_DOCS_DIR = `${FAKE_WORKSPACE}/documents`

  beforeEach(() => {
    jest.clearAllMocks()

    mockWorkspace = {
      getCurrent: jest.fn().mockReturnValue(FAKE_WORKSPACE)
    }

    const mockWindowContext = {
      // getService is called with either 'workspace' or 'documentsWatcher'.
      // Return mockWorkspace for 'workspace' and throw for 'documentsWatcher'
      // so tryGetWindowService returns null (optional service not registered).
      getService: jest.fn().mockImplementation((key: string) => {
        if (key === 'workspace') return mockWorkspace
        throw new Error(`Service not found: ${key}`)
      })
    }

    const mockWindowContextManager = {
      get: jest.fn().mockReturnValue(mockWindowContext)
    }

    container = new ServiceContainer()
    container.register('workspace', mockWorkspace)
    container.register('windowContextManager', mockWindowContextManager)

    eventBus = new EventBus()
    module = new DocumentsIpc()

    mockEvent = { sender: { id: 1 } }

    // Default fs stubs — directory already exists (access resolves), etc.
    mockFs.access.mockResolvedValue(undefined)
    mockFs.readdir.mockResolvedValue([])
    mockFs.copyFile.mockResolvedValue(undefined)
    mockFs.stat.mockResolvedValue({ size: 100, mtimeMs: 1000, isDirectory: () => false } as unknown as Awaited<ReturnType<typeof fs.stat>>)
    mockFs.mkdir.mockResolvedValue(undefined)
    mockFs.unlink.mockResolvedValue(undefined)
  })

  it('should have name "documents"', () => {
    expect(module.name).toBe('documents')
  })

  it(`should register ${EXPECTED_CHANNELS.length} ipcMain handlers`, () => {
    module.register(container, eventBus)
    expect((ipcMain.handle as jest.Mock).mock.calls).toHaveLength(EXPECTED_CHANNELS.length)
  })

  it('should register all documents channels', () => {
    module.register(container, eventBus)
    const channels = (ipcMain.handle as jest.Mock).mock.calls.map((c: unknown[]) => c[0])
    for (const channel of EXPECTED_CHANNELS) {
      expect(channels).toContain(channel)
    }
  })

  // ---------------------------------------------------------------------------
  // documents:import-files
  // ---------------------------------------------------------------------------

  describe('documents:import-files handler', () => {
    it('should return an empty array when the file dialog is canceled', async () => {
      ;(dialog.showOpenDialog as jest.Mock).mockResolvedValueOnce({
        canceled: true,
        filePaths: []
      })

      module.register(container, eventBus)
      const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'documents:import-files'
      )?.[1]
      expect(handler).toBeDefined()

      const result = await handler(mockEvent)

      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
    })

    it('should return success:false when no workspace is selected', async () => {
      mockWorkspace.getCurrent.mockReturnValue(null)

      module.register(container, eventBus)
      const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'documents:import-files'
      )?.[1]

      const result = await handler(mockEvent)

      expect(result.success).toBe(false)
      expect((result as { success: false; error: { message: string } }).error.message).toContain(
        'No workspace selected'
      )
    })

    it('should open a dialog and import selected files when the workspace exists', async () => {
      ;(dialog.showOpenDialog as jest.Mock).mockResolvedValueOnce({
        canceled: false,
        filePaths: ['/source/file.txt']
      })
      // Simulate destination path does not exist (throws on access), so copyFile is used
      mockFs.access
        .mockResolvedValueOnce(undefined)   // docsDir exists
        .mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' })) // unique path check — file doesn't exist

      module.register(container, eventBus)
      const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'documents:import-files'
      )?.[1]

      const result = await handler(mockEvent)

      expect(result.success).toBe(true)
      expect(mockFs.copyFile).toHaveBeenCalledWith('/source/file.txt', expect.stringContaining('file.txt'))
    })

    it('should return an empty array when all selected files are invalid', async () => {
      ;(dialog.showOpenDialog as jest.Mock).mockResolvedValueOnce({
        canceled: false,
        filePaths: ['/source/bad.exe']
      })
      ;(validateTextFiles as jest.Mock).mockReturnValueOnce({
        validFiles: [],
        invalidFiles: [{ path: '/source/bad.exe', reason: 'Unsupported type' }]
      })

      module.register(container, eventBus)
      const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'documents:import-files'
      )?.[1]

      const result = await handler(mockEvent)

      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
      // Warning dialog should have been shown
      expect(dialog.showMessageBox).toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------------------------------
  // documents:import-by-paths
  // ---------------------------------------------------------------------------

  describe('documents:import-by-paths handler', () => {
    it('should return success:false when no workspace is selected', async () => {
      mockWorkspace.getCurrent.mockReturnValue(null)

      module.register(container, eventBus)
      const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'documents:import-by-paths'
      )?.[1]

      const result = await handler(mockEvent, ['/some/file.txt'])

      expect(result.success).toBe(false)
      expect((result as { success: false; error: { message: string } }).error.message).toContain(
        'No workspace selected'
      )
    })

    it('should return success:false when all paths are invalid file types', async () => {
      ;(validateTextFiles as jest.Mock).mockReturnValueOnce({
        validFiles: [],
        invalidFiles: [{ path: '/file.bin', reason: 'Binary file' }]
      })

      module.register(container, eventBus)
      const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'documents:import-by-paths'
      )?.[1]

      const result = await handler(mockEvent, ['/file.bin'])

      expect(result.success).toBe(false)
      expect((result as { success: false; error: { message: string } }).error.message).toContain(
        'rejected'
      )
    })

    it('should copy valid files into the documents directory', async () => {
      ;(validateTextFiles as jest.Mock).mockReturnValueOnce({
        validFiles: ['/source/notes.md'],
        invalidFiles: []
      })
      // First access call: docsDir exists. Second: unique path check fails (ENOENT → use path as-is)
      mockFs.access
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))

      module.register(container, eventBus)
      const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'documents:import-by-paths'
      )?.[1]

      const result = await handler(mockEvent, ['/source/notes.md'])

      expect(result.success).toBe(true)
      expect(mockFs.copyFile).toHaveBeenCalledWith(
        '/source/notes.md',
        expect.stringContaining('notes.md')
      )
    })
  })

  // ---------------------------------------------------------------------------
  // documents:load-all
  // ---------------------------------------------------------------------------

  describe('documents:load-all handler', () => {
    it('should return success:false when no workspace is selected', async () => {
      mockWorkspace.getCurrent.mockReturnValue(null)

      module.register(container, eventBus)
      const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'documents:load-all'
      )?.[1]

      const result = await handler(mockEvent)

      expect(result.success).toBe(false)
      expect((result as { success: false; error: { message: string } }).error.message).toContain(
        'No workspace selected'
      )
    })

    it('should return an empty array when the documents directory does not exist', async () => {
      mockFs.access.mockRejectedValueOnce(new Error('ENOENT'))

      module.register(container, eventBus)
      const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'documents:load-all'
      )?.[1]

      const result = await handler(mockEvent)

      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
    })

    it('should return metadata for files found in the documents directory', async () => {
      mockFs.access.mockResolvedValueOnce(undefined) // docsDir accessible
      mockFs.readdir.mockResolvedValueOnce(['report.txt'] as unknown as Awaited<ReturnType<typeof fs.readdir>>)
      mockFs.stat.mockResolvedValueOnce({
        size: 512,
        mtimeMs: 1700000000000,
        isDirectory: () => false
      } as unknown as Awaited<ReturnType<typeof fs.stat>>)

      module.register(container, eventBus)
      const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'documents:load-all'
      )?.[1]

      const result = await handler(mockEvent)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toMatchObject({
        id: 'report.txt',
        name: 'report.txt',
        path: `${FAKE_DOCS_DIR}/report.txt`,
        size: 512
      })
    })

    it('should skip hidden files (names starting with ".")', async () => {
      mockFs.access.mockResolvedValueOnce(undefined)
      mockFs.readdir.mockResolvedValueOnce(['.DS_Store', 'visible.txt'] as unknown as Awaited<ReturnType<typeof fs.readdir>>)
      // stat only called for visible.txt (one call)
      mockFs.stat.mockResolvedValueOnce({
        size: 100,
        mtimeMs: 1000,
        isDirectory: () => false
      } as unknown as Awaited<ReturnType<typeof fs.stat>>)

      module.register(container, eventBus)
      const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'documents:load-all'
      )?.[1]

      const result = await handler(mockEvent)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data[0].id).toBe('visible.txt')
    })

    it('should skip directory entries inside the documents folder', async () => {
      mockFs.access.mockResolvedValueOnce(undefined)
      mockFs.readdir.mockResolvedValueOnce(['subdir', 'file.md'] as unknown as Awaited<ReturnType<typeof fs.readdir>>)
      mockFs.stat
        .mockResolvedValueOnce({ size: 0, mtimeMs: 0, isDirectory: () => true } as unknown as Awaited<ReturnType<typeof fs.stat>>)  // subdir
        .mockResolvedValueOnce({ size: 200, mtimeMs: 2000, isDirectory: () => false } as unknown as Awaited<ReturnType<typeof fs.stat>>) // file.md

      module.register(container, eventBus)
      const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'documents:load-all'
      )?.[1]

      const result = await handler(mockEvent)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data[0].id).toBe('file.md')
    })
  })

  // ---------------------------------------------------------------------------
  // documents:delete-file
  // ---------------------------------------------------------------------------

  describe('documents:delete-file handler', () => {
    it('should return success:false when no workspace is selected', async () => {
      mockWorkspace.getCurrent.mockReturnValue(null)

      module.register(container, eventBus)
      const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'documents:delete-file'
      )?.[1]

      const result = await handler(mockEvent, 'file.txt')

      expect(result.success).toBe(false)
      expect((result as { success: false; error: { message: string } }).error.message).toContain(
        'No workspace selected'
      )
    })

    it('should call fs.unlink with the correct file path', async () => {
      module.register(container, eventBus)
      const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'documents:delete-file'
      )?.[1]

      const result = await handler(mockEvent, 'notes.txt')

      expect(result.success).toBe(true)
      expect(mockFs.unlink).toHaveBeenCalledWith(`${FAKE_DOCS_DIR}/notes.txt`)
    })

    it('should return success:true and not throw when the file is already deleted (ENOENT)', async () => {
      mockFs.unlink.mockRejectedValueOnce(
        Object.assign(new Error('ENOENT: no such file or directory'), { code: 'ENOENT' })
      )

      module.register(container, eventBus)
      const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'documents:delete-file'
      )?.[1]

      const result = await handler(mockEvent, 'missing.txt')

      // ENOENT is treated as idempotent — handler does NOT throw
      expect(result.success).toBe(true)
    })

    it('should return success:false when unlink fails with a non-ENOENT error', async () => {
      mockFs.unlink.mockRejectedValueOnce(
        Object.assign(new Error('Permission denied'), { code: 'EACCES' })
      )

      module.register(container, eventBus)
      const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'documents:delete-file'
      )?.[1]

      const result = await handler(mockEvent, 'locked.txt')

      expect(result.success).toBe(false)
      expect((result as { success: false; error: { message: string } }).error.message).toContain(
        'Failed to delete document'
      )
    })
  })
})
