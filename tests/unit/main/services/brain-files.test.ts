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
 *  - loadAll(): reads folders and returns PersonalityFile objects
 *  - loadAll(): handles missing personality directory gracefully
 *  - loadOne(): loads a single file by sectionId + id
 *  - loadOne(): returns null when file/folder doesn't exist
 *  - delete(): removes the personality folder
 *  - delete(): tolerates ENOENT errors
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

/**
 * Build a minimal valid config.json string.
 */
function buildConfigJson(overrides?: Partial<{
  title: string
  provider: string
  model: string
}>) {
  return JSON.stringify({
    title: overrides?.title ?? 'Test Conversation',
    provider: overrides?.provider ?? 'openai',
    model: overrides?.model ?? 'gpt-4o',
    temperature: 0.7,
    maxTokens: 2048,
    reasoning: false,
    createdAt: new Date().toISOString()
  }, null, 2)
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

    // Default fs mocks — happy path
    mockFs.mkdir.mockResolvedValue(undefined as any)
    mockFs.writeFile.mockResolvedValue(undefined as any)
    mockFs.readFile.mockResolvedValue(buildConfigJson() as any)
    mockFs.readdir.mockResolvedValue([] as any)
    mockFs.unlink.mockResolvedValue(undefined as any)
    mockFs.stat.mockResolvedValue({ isDirectory: () => true, isFile: () => false, mtimeMs: Date.now() } as any)
    mockFs.rm.mockResolvedValue(undefined as any)
  })

  afterEach(async () => {
    await service.destroy?.()
  })

  // ---- save ----------------------------------------------------------------

  describe('save', () => {
    it('should create the section directory and write config.json + DATA.md', async () => {
      const result = await service.save({
        sectionId: SECTION,
        content: 'Personality content here',
        metadata: { title: 'My Conv', provider: 'openai', model: 'gpt-4o' }
      })

      expect(result.id).toBeDefined()
      expect(result.path).toContain('personality')
      expect(result.path).toContain(SECTION)
      expect(result.savedAt).toBeDefined()

      // Should have created the folder and written two files
      expect(mockFs.mkdir).toHaveBeenCalled()
      expect(mockFs.writeFile).toHaveBeenCalledTimes(2)

      // DATA.md should contain the raw content
      const dataMdCall = (mockFs.writeFile as jest.Mock).mock.calls.find(
        (c: unknown[]) => (c[0] as string).endsWith('DATA.md')
      )
      expect(dataMdCall).toBeDefined()
      expect(dataMdCall![1]).toBe('Personality content here')

      // config.json should contain the metadata
      const configCall = (mockFs.writeFile as jest.Mock).mock.calls.find(
        (c: unknown[]) => (c[0] as string).endsWith('config.json')
      )
      expect(configCall).toBeDefined()
      const configData = JSON.parse(configCall![1] as string)
      expect(configData.title).toBe('My Conv')
      expect(configData.provider).toBe('openai')
    })

    it('should throw when no workspace is selected', async () => {
      mockWorkspace.getCurrent.mockReturnValue(null)

      await expect(
        service.save({ sectionId: SECTION, content: 'test', metadata: {} })
      ).rejects.toThrow(/No workspace/)
    })

    it('should include a createdAt timestamp in the config', async () => {
      await service.save({ sectionId: SECTION, content: 'test', metadata: { title: 'T', provider: 'x', model: 'y' } })

      const configCall = (mockFs.writeFile as jest.Mock).mock.calls.find(
        (c: unknown[]) => (c[0] as string).endsWith('config.json')
      )
      const config = JSON.parse(configCall![1] as string)
      expect(config.createdAt).toBeDefined()
      expect(new Date(config.createdAt).getTime()).not.toBeNaN()
    })

    it('should generate a unique folder name per save', async () => {
      const r1 = await service.save({ sectionId: SECTION, content: 'c1', metadata: { title: 'A', provider: 'x', model: 'y' } })
      await new Promise((r) => setTimeout(r, 5)) // ensure distinct timestamps
      const r2 = await service.save({ sectionId: SECTION, content: 'c2', metadata: { title: 'B', provider: 'x', model: 'y' } })

      expect(r1.id).not.toBe(r2.id)
    })
  })

  // ---- loadAll -------------------------------------------------------------

  describe('loadAll', () => {
    it('should return an empty array when the personality directory does not exist', async () => {
      mockFs.stat.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))

      const files = await service.loadAll()

      expect(files).toEqual([])
    })

    it('should load files from date-based subfolders', async () => {
      const folderName = '2024-01-15_120000'
      const folderPath = path.join(WORKSPACE, 'personality', SECTION, folderName)

      // stat: first call for personality root dir, then for section dir, then for the folder
      mockFs.stat.mockImplementation((p: unknown) => {
        const pathStr = String(p)
        if (pathStr.endsWith(folderName)) {
          return Promise.resolve({ isDirectory: () => true, isFile: () => false, mtimeMs: Date.now() } as any)
        }
        return Promise.resolve({ isDirectory: () => true, isFile: () => false, mtimeMs: Date.now() } as any)
      })

      // readdir: section listing returns one folder; all others return empty
      mockFs.readdir.mockImplementation((p: unknown) => {
        const pathStr = String(p)
        if (pathStr.includes(SECTION) && !pathStr.includes(folderName)) {
          return Promise.resolve([folderName] as any)
        }
        return Promise.resolve([] as any)
      })

      // readFile: config.json
      mockFs.readFile.mockImplementation((p: unknown) => {
        const pathStr = String(p)
        if (pathStr.endsWith('config.json')) {
          return Promise.resolve(buildConfigJson({ title: 'Loaded' }) as any)
        }
        return Promise.resolve('Markdown content' as any)
      })

      const files = await service.loadAll()

      // We expect at least one file to be found
      const found = files.find((f) => f.sectionId === SECTION && f.id === folderName)
      expect(found).toBeDefined()
      if (found) {
        expect(found.metadata.title).toBe('Loaded')
        expect(found.content).toBe('Markdown content')
      }
    })
  })

  // ---- loadOne -------------------------------------------------------------

  describe('loadOne', () => {
    it('should return null when the folder does not exist', async () => {
      mockFs.stat.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))

      const result = await service.loadOne({ sectionId: SECTION, id: 'nonexistent-folder' })

      expect(result).toBeNull()
    })

    it('should load a single file when folder exists', async () => {
      const id = '2024-02-20_095500'

      mockFs.stat.mockResolvedValue({ isDirectory: () => true, isFile: () => false, mtimeMs: Date.now() } as any)
      mockFs.readFile.mockImplementation((p: unknown) => {
        const pathStr = String(p)
        if (pathStr.endsWith('config.json')) {
          return Promise.resolve(buildConfigJson({ title: 'Specific' }) as any)
        }
        return Promise.resolve('Specific content' as any)
      })

      const file = await service.loadOne({ sectionId: SECTION, id })

      expect(file).not.toBeNull()
      if (file) {
        expect(file.id).toBe(id)
        expect(file.sectionId).toBe(SECTION)
        expect(file.metadata.title).toBe('Specific')
        expect(file.content).toBe('Specific content')
      }
    })
  })

  // ---- delete --------------------------------------------------------------

  describe('delete', () => {
    it('should call fs.rm to remove the personality folder', async () => {
      const id = '2024-01-10_083000'
      const expectedPath = path.join(WORKSPACE, 'personality', SECTION, id)

      await service.delete({ sectionId: SECTION, id })

      expect(mockFs.rm).toHaveBeenCalledWith(expectedPath, { recursive: true, force: true })
    })

    it('should not throw when the folder does not exist (ENOENT)', async () => {
      mockFs.rm.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))

      await expect(
        service.delete({ sectionId: SECTION, id: 'missing-folder' })
      ).resolves.not.toThrow()
    })

    it('should re-throw errors that are not ENOENT', async () => {
      mockFs.rm.mockRejectedValue(new Error('Permission denied'))

      await expect(
        service.delete({ sectionId: SECTION, id: 'locked-folder' })
      ).rejects.toThrow('Permission denied')
    })
  })
})
