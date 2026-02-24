/**
 * Tests for PersonalityFilesService.
 *
 * NOTE: This file was originally generated as brain-files.test.ts referencing
 * a service that no longer exists. It has been updated to test
 * PersonalityFilesService, which manages personality conversation files stored
 * in the workspace using a folder-based format (config.json + DATA.md).
 *
 * Covers:
 *  - save(): creates folders, writes config.json and DATA.md
 *  - save(): throws when no workspace is selected
 *  - loadAll(): returns empty array when personality dir does not exist
 *  - loadAll(): reads section subdirectories and date-folder entries
 *  - loadOne(sectionId, fileId): loads a file by sectionId + id
 *  - loadOne(sectionId, fileId): returns null when file not found
 *  - delete(sectionId, fileId): removes the personality folder
 *  - delete(sectionId, fileId): tolerates ENOENT
 */
import * as fs from 'fs/promises'
import * as path from 'path'
import { PersonalityFilesService } from '../../../../src/main/services/personality-files'
import { EventBus } from '../../../../src/main/core/EventBus'

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

jest.mock('fs/promises')
const mockFs = fs as jest.Mocked<typeof fs>

jest.mock('chokidar', () => ({
  watch: jest.fn().mockReturnValue({
    on: jest.fn().mockReturnThis(),
    close: jest.fn().mockResolvedValue(undefined)
  })
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WORKSPACE = '/test/workspace'
const SECTION = 'emotional-depth'

function makeWorkspaceService(workspacePath: string | null = WORKSPACE) {
  return {
    getCurrent: jest.fn().mockReturnValue(workspacePath),
    setCurrent: jest.fn(),
    getRecent: jest.fn().mockReturnValue([]),
    clear: jest.fn(),
    removeRecent: jest.fn(),
    addRecent: jest.fn()
  }
}

function buildConfigJson(overrides?: Record<string, unknown>): string {
  return JSON.stringify({
    title: 'Test Conversation',
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 2048,
    reasoning: false,
    createdAt: new Date().toISOString(),
    ...overrides
  }, null, 2)
}

/** Create a mock Dirent-like object for readdir({ withFileTypes: true }) */
function makeDirent(name: string, isDir = true) {
  return {
    name,
    isDirectory: () => isDir,
    isFile: () => !isDir,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    isSymbolicLink: () => false
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PersonalityFilesService', () => {
  let service: PersonalityFilesService
  let eventBus: EventBus
  let mockWorkspace: ReturnType<typeof makeWorkspaceService>

  beforeEach(() => {
    jest.clearAllMocks()
    eventBus = new EventBus()
    mockWorkspace = makeWorkspaceService()
    service = new PersonalityFilesService(mockWorkspace as any, eventBus)

    // Default happy-path stubs
    mockFs.access.mockResolvedValue(undefined as any)
    mockFs.mkdir.mockResolvedValue(undefined as any)
    mockFs.writeFile.mockResolvedValue(undefined as any)
    mockFs.readFile.mockResolvedValue(buildConfigJson() as any)
    mockFs.readdir.mockResolvedValue([] as any)
    mockFs.unlink.mockResolvedValue(undefined as any)
    mockFs.rm.mockResolvedValue(undefined as any)
    mockFs.stat.mockResolvedValue({ isDirectory: () => true, isFile: () => false, mtimeMs: Date.now() } as any)
  })

  afterEach(async () => {
    await service.destroy?.()
  })

  // ---- save ----------------------------------------------------------------

  describe('save', () => {
    it('should write config.json and DATA.md inside a date-named folder', async () => {
      const result = await service.save({
        sectionId: SECTION,
        content: 'Personality content',
        metadata: { title: 'My Conv', provider: 'openai', model: 'gpt-4o' }
      })

      expect(result.id).toBeDefined()
      expect(result.path).toContain(path.join('personality', SECTION))
      expect(result.savedAt).toBeDefined()
      // Should have called writeFile twice (config.json + DATA.md)
      expect(mockFs.writeFile).toHaveBeenCalledTimes(2)

      const dataMdCall = (mockFs.writeFile as jest.Mock).mock.calls.find(
        (c: unknown[]) => (c[0] as string).endsWith('DATA.md')
      )
      expect(dataMdCall).toBeDefined()
      expect(dataMdCall![1]).toBe('Personality content')

      const configCall = (mockFs.writeFile as jest.Mock).mock.calls.find(
        (c: unknown[]) => (c[0] as string).endsWith('config.json')
      )
      expect(configCall).toBeDefined()
      const configData = JSON.parse(configCall![1] as string)
      expect(configData.title).toBe('My Conv')
    })

    it('should throw when no workspace is selected', async () => {
      mockWorkspace.getCurrent.mockReturnValue(null)

      await expect(
        service.save({ sectionId: SECTION, content: 'test', metadata: {} })
      ).rejects.toThrow(/No workspace/)
    })

    it('should include a createdAt ISO timestamp in config.json', async () => {
      await service.save({
        sectionId: SECTION,
        content: 'test',
        metadata: { title: 'T', provider: 'x', model: 'y' }
      })

      const configCall = (mockFs.writeFile as jest.Mock).mock.calls.find(
        (c: unknown[]) => (c[0] as string).endsWith('config.json')
      )
      const config = JSON.parse(configCall![1] as string)
      expect(config.createdAt).toBeDefined()
      expect(new Date(config.createdAt).getTime()).not.toBeNaN()
    })

    it('should use the date-folder name as the returned id', async () => {
      // The folder name format is YYYY-MM-DD_HHmmss
      const result = await service.save({
        sectionId: SECTION,
        content: 'c',
        metadata: { title: 'T', provider: 'x', model: 'y' }
      })

      // id should match the date folder pattern
      expect(result.id).toMatch(/^\d{4}-\d{2}-\d{2}_\d{6}$/)
    })
  })

  // ---- loadAll -------------------------------------------------------------

  describe('loadAll', () => {
    it('should return an empty array when the personality directory does not exist', async () => {
      mockFs.access.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))

      const files = await service.loadAll()

      expect(files).toEqual([])
    })

    it('should return an empty array when there are no section subdirectories', async () => {
      // access() resolves (dir exists), readdir returns no subdirs
      mockFs.access.mockResolvedValue(undefined as any)
      mockFs.readdir.mockResolvedValue([] as any)

      const files = await service.loadAll()

      expect(files).toEqual([])
    })

    it('should load files from date-folder entries inside a section dir', async () => {
      const folderName = '2024-01-15_120000'

      // readdir for personality dir returns one section entry
      mockFs.readdir.mockImplementation((dirPath: any, options?: any) => {
        const pathStr = String(dirPath)
        // Personality root → returns the section dir
        if (pathStr === path.join(WORKSPACE, 'personality')) {
          return Promise.resolve([makeDirent(SECTION, true)] as any)
        }
        // Section dir → returns one date folder
        if (pathStr === path.join(WORKSPACE, 'personality', SECTION)) {
          return Promise.resolve([makeDirent(folderName, true)] as any)
        }
        return Promise.resolve([] as any)
      })

      // stat for the date folder returns isDirectory=true
      mockFs.stat.mockResolvedValue({ isDirectory: () => true, isFile: () => false, mtimeMs: Date.now() } as any)

      // readFile for config.json / DATA.md
      mockFs.readFile.mockImplementation((filePath: any) => {
        const p = String(filePath)
        if (p.endsWith('config.json')) {
          return Promise.resolve(buildConfigJson({ title: 'Loaded Conversation' }) as any)
        }
        return Promise.resolve('Loaded markdown content' as any)
      })

      const files = await service.loadAll()

      expect(files.length).toBeGreaterThanOrEqual(1)
      const found = files.find((f) => f.sectionId === SECTION && f.id === folderName)
      expect(found).toBeDefined()
      if (found) {
        expect(found.metadata.title).toBe('Loaded Conversation')
        expect(found.content).toBe('Loaded markdown content')
      }
    })
  })

  // ---- loadOne -------------------------------------------------------------

  describe('loadOne', () => {
    it('should return null when neither folder nor legacy file exist', async () => {
      // stat throws ENOENT for folder, readFile throws ENOENT for legacy .md
      mockFs.stat.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))
      mockFs.readFile.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))

      const result = await service.loadOne(SECTION, 'nonexistent-folder')

      expect(result).toBeNull()
    })

    it('should load a single file from a date-named folder', async () => {
      const id = '2024-02-20_095500'

      mockFs.stat.mockResolvedValue({ isDirectory: () => true, isFile: () => false, mtimeMs: Date.now() } as any)
      mockFs.readFile.mockImplementation((filePath: any) => {
        const p = String(filePath)
        if (p.endsWith('config.json')) {
          return Promise.resolve(buildConfigJson({ title: 'Specific File' }) as any)
        }
        return Promise.resolve('Specific content' as any)
      })

      const file = await service.loadOne(SECTION, id)

      expect(file).not.toBeNull()
      if (file) {
        expect(file.id).toBe(id)
        expect(file.sectionId).toBe(SECTION)
        expect(file.metadata.title).toBe('Specific File')
        expect(file.content).toBe('Specific content')
      }
    })
  })

  // ---- delete --------------------------------------------------------------

  describe('delete', () => {
    it('should remove the personality folder via fs.rm', async () => {
      const id = '2024-01-10_083000'
      const expectedPath = path.join(WORKSPACE, 'personality', SECTION, id)

      // stat returns a directory
      mockFs.stat.mockResolvedValue({ isDirectory: () => true, isFile: () => false, mtimeMs: Date.now() } as any)

      await service.delete(SECTION, id)

      expect(mockFs.rm).toHaveBeenCalledWith(expectedPath, expect.objectContaining({ recursive: true }))
    })

    it('should not throw when neither folder nor legacy file exist (ENOENT)', async () => {
      mockFs.stat.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))
      mockFs.unlink.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))

      await expect(
        service.delete(SECTION, 'missing-folder')
      ).resolves.not.toThrow()
    })

    it('should throw when deletion fails with a non-ENOENT error', async () => {
      mockFs.stat.mockResolvedValue({ isDirectory: () => true, isFile: () => false, mtimeMs: Date.now() } as any)
      mockFs.rm.mockRejectedValue(new Error('Permission denied'))

      await expect(
        service.delete(SECTION, 'locked-folder')
      ).rejects.toThrow('Permission denied')
    })
  })

  // ---- workspace not set ---------------------------------------------------

  describe('missing workspace', () => {
    it('should throw from loadOne when no workspace is selected', async () => {
      mockWorkspace.getCurrent.mockReturnValue(null)

      await expect(
        service.loadOne(SECTION, 'some-id')
      ).rejects.toThrow(/No workspace/)
    })

    it('should return empty array from loadAll when no workspace is selected', async () => {
      mockWorkspace.getCurrent.mockReturnValue(null)

      const files = await service.loadAll()
      expect(files).toEqual([])
    })
  })
})
