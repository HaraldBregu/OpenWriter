import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { WorkspaceMetadataService } from '../../../../src/main/services/workspace-metadata'
import type { WorkspaceService } from '../../../../src/main/services/workspace'
import type { EventBus } from '../../../../src/main/core/EventBus'

describe('WorkspaceMetadataService - Workspace Isolation', () => {
  let tempDir: string
  let workspaceA: string
  let workspaceB: string
  let service: WorkspaceMetadataService
  let mockWorkspaceService: jest.Mocked<WorkspaceService>
  let mockEventBus: jest.Mocked<EventBus>

  beforeEach(() => {
    // Create temporary test directories
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-metadata-test-'))
    workspaceA = path.join(tempDir, 'workspace-a')
    workspaceB = path.join(tempDir, 'workspace-b')
    fs.mkdirSync(workspaceA, { recursive: true })
    fs.mkdirSync(workspaceB, { recursive: true })

    // Create mock services
    let currentWorkspace: string | null = null

    mockWorkspaceService = {
      getCurrent: jest.fn(() => currentWorkspace),
      setCurrent: jest.fn((path: string) => {
        currentWorkspace = path
      }),
      getState: jest.fn(),
      clear: jest.fn(),
      getRecent: jest.fn(),
      hasWorkspace: jest.fn(),
      destroy: jest.fn(),
      initialize: jest.fn()
    } as any

    mockEventBus = {
      broadcast: jest.fn(),
      sendTo: jest.fn(),
      emit: jest.fn(),
      on: jest.fn(() => jest.fn()),
      off: jest.fn(),
      clearAllListeners: jest.fn()
    } as any

    service = new WorkspaceMetadataService(mockWorkspaceService, mockEventBus)
  })

  afterEach(() => {
    // Destroy service to flush pending writes and clear timers
    service.destroy()

    // Clean up temp directories
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  describe('Bug Fix: Workspace Isolation During Debounced Writes', () => {
    it('should write pending changes to the correct workspace when switching workspaces', async () => {
      // Setup: Start in workspace A
      mockWorkspaceService.setCurrent(workspaceA)

      // Add a directory to workspace A
      const testDirA = path.join(tempDir, 'test-dir-a')
      fs.mkdirSync(testDirA)

      service.addDirectory(testDirA)

      // Immediately switch to workspace B before debounce timer fires
      // This simulates the critical bug scenario where:
      // 1. User adds directories to workspace A
      // 2. Debounced write is scheduled (800ms delay)
      // 3. User switches to workspace B BEFORE the timer fires
      // 4. The pending write should go to workspace A, not B
      mockWorkspaceService.setCurrent(workspaceB)

      // Force flush of pending writes
      service.flush()

      // Verify: Workspace A should have the directory
      const metadataFileA = path.join(workspaceA, 'workspace.tsrct')
      expect(fs.existsSync(metadataFileA)).toBe(true)

      const dataA = JSON.parse(fs.readFileSync(metadataFileA, 'utf-8'))
      expect(dataA.settings.directories).toHaveLength(1)
      expect(dataA.settings.directories[0].path).toBe(testDirA)

      // Verify: Workspace B should be empty (no file or empty file)
      const metadataFileB = path.join(workspaceB, 'workspace.tsrct')
      if (fs.existsSync(metadataFileB)) {
        const dataB = JSON.parse(fs.readFileSync(metadataFileB, 'utf-8'))
        expect(dataB.settings.directories).toHaveLength(0)
      }
    })

    it('should maintain workspace isolation when rapidly switching workspaces', async () => {
      // Create test directories
      const testDirA = path.join(tempDir, 'test-dir-a')
      const testDirB = path.join(tempDir, 'test-dir-b')
      fs.mkdirSync(testDirA)
      fs.mkdirSync(testDirB)

      // Add directory to workspace A
      mockWorkspaceService.setCurrent(workspaceA)
      service.addDirectory(testDirA)

      // Switch to workspace B
      mockWorkspaceService.setCurrent(workspaceB)
      service.flush()

      // Add directory to workspace B
      service.addDirectory(testDirB)

      // Switch back to workspace A
      mockWorkspaceService.setCurrent(workspaceA)
      service.flush()

      // Verify workspace A has only its directory
      const metadataFileA = path.join(workspaceA, 'workspace.tsrct')
      const dataA = JSON.parse(fs.readFileSync(metadataFileA, 'utf-8'))
      expect(dataA.settings.directories).toHaveLength(1)
      expect(dataA.settings.directories[0].path).toBe(testDirA)

      // Verify workspace B has only its directory
      const metadataFileB = path.join(workspaceB, 'workspace.tsrct')
      const dataB = JSON.parse(fs.readFileSync(metadataFileB, 'utf-8'))
      expect(dataB.settings.directories).toHaveLength(1)
      expect(dataB.settings.directories[0].path).toBe(testDirB)
    })

    it('should flush pending writes to correct workspace during workspace:changed event', () => {
      // Initialize service to register event handlers
      mockWorkspaceService.setCurrent(workspaceA)
      service.initialize()

      // Setup: Add directory to workspace A
      const testDirA = path.join(tempDir, 'test-dir-a')
      fs.mkdirSync(testDirA)

      service.addDirectory(testDirA)

      // Simulate workspace change event (like what happens in production)
      mockWorkspaceService.setCurrent(workspaceB)

      // Get the workspace:changed event handler that was registered
      const onCall = (mockEventBus.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'workspace:changed'
      )
      expect(onCall).toBeDefined()

      const handler = onCall[1]

      // Trigger the handler with workspace change
      handler({
        type: 'workspace:changed',
        payload: { currentPath: workspaceB, previousPath: workspaceA },
        timestamp: Date.now()
      })

      // Verify workspace A has the directory (not workspace B)
      const metadataFileA = path.join(workspaceA, 'workspace.tsrct')
      expect(fs.existsSync(metadataFileA)).toBe(true)

      const dataA = JSON.parse(fs.readFileSync(metadataFileA, 'utf-8'))
      expect(dataA.settings.directories).toHaveLength(1)
      expect(dataA.settings.directories[0].path).toBe(testDirA)
    })
  })

  describe('getDirectories', () => {
    it('should return empty array when no workspace is set', () => {
      const dirs = service.getDirectories()
      expect(dirs).toEqual([])
    })

    it('should read directories from the current workspace', () => {
      const testDir = path.join(tempDir, 'test-dir')
      fs.mkdirSync(testDir)

      mockWorkspaceService.setCurrent(workspaceA)
      const added = service.addDirectory(testDir)
      service.flush()

      const dirs = service.getDirectories()
      expect(dirs).toHaveLength(1)
      expect(dirs[0].id).toBe(added.id)
      expect(dirs[0].path).toBe(testDir)
    })
  })

  describe('addDirectory', () => {
    it('should add a valid directory', () => {
      const testDir = path.join(tempDir, 'test-dir')
      fs.mkdirSync(testDir)

      mockWorkspaceService.setCurrent(workspaceA)
      const entry = service.addDirectory(testDir)

      expect(entry.id).toBeDefined()
      expect(entry.path).toBe(testDir)
      expect(entry.isIndexed).toBe(false)
      expect(entry.addedAt).toBeLessThanOrEqual(Date.now())
    })

    it('should throw error when no workspace is set', () => {
      const testDir = path.join(tempDir, 'test-dir')
      fs.mkdirSync(testDir)

      expect(() => service.addDirectory(testDir)).toThrow('No workspace is currently set')
    })

    it('should throw error for non-existent directory', () => {
      mockWorkspaceService.setCurrent(workspaceA)

      const nonExistentDir = path.join(tempDir, 'does-not-exist')
      expect(() => service.addDirectory(nonExistentDir)).toThrow('does not exist')
    })

    it('should throw error for duplicate directory', () => {
      const testDir = path.join(tempDir, 'test-dir')
      fs.mkdirSync(testDir)

      mockWorkspaceService.setCurrent(workspaceA)
      service.addDirectory(testDir)

      expect(() => service.addDirectory(testDir)).toThrow('already tracked')
    })
  })

  describe('removeDirectory', () => {
    it('should remove a directory by id', () => {
      const testDir = path.join(tempDir, 'test-dir')
      fs.mkdirSync(testDir)

      mockWorkspaceService.setCurrent(workspaceA)
      const entry = service.addDirectory(testDir)

      const removed = service.removeDirectory(entry.id)
      expect(removed).toBe(true)

      const dirs = service.getDirectories()
      expect(dirs).toHaveLength(0)
    })

    it('should return false for non-existent id', () => {
      mockWorkspaceService.setCurrent(workspaceA)
      const removed = service.removeDirectory('non-existent-id')
      expect(removed).toBe(false)
    })
  })
})
