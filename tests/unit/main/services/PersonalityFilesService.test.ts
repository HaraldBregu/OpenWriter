/**
 * Tests for PersonalityFilesService.
 *
 * Strategy:
 *   - Mock node:fs/promises and chokidar to avoid real I/O.
 *   - Mock gray-matter (used for legacy .md parsing) so no real parsing occurs.
 *   - Test save(), loadAll(), loadOne(), delete(), loadSectionConfig(),
 *     saveSectionConfig(), and destroy().
 *   - Validate the 3-layer metadata fallback chain:
 *     caller input → section config → app defaults.
 *   - Validate that loadOne() tries the new folder format first and falls
 *     back to the legacy .md format.
 *   - Validate that delete() handles both new folder and legacy .md formats.
 *   - Test watcher lifecycle via EventBus workspace:changed events.
 */

jest.mock('node:fs/promises', () => ({
  access: jest.fn(),
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn(),
  readdir: jest.fn().mockResolvedValue([]),
  stat: jest.fn(),
  rm: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('gray-matter', () =>
  jest.fn().mockReturnValue({
    data: { title: 'Legacy', provider: 'openai', model: 'gpt-4o' },
    content: '## Legacy content',
  })
)

const mockWatcherInstance = {
  on: jest.fn().mockReturnThis(),
  close: jest.fn().mockResolvedValue(undefined),
}
jest.mock('chokidar', () => ({
  watch: jest.fn().mockReturnValue(mockWatcherInstance),
}))

import fs from 'node:fs/promises'
import chokidar from 'chokidar'
import { PersonalityFilesService } from '../../../../src/main/services/personality-files'
import { EventBus } from '../../../../src/main/core/EventBus'

const mockAccess = fs.access as jest.Mock
const mockMkdir = fs.mkdir as jest.Mock
const mockWriteFile = fs.writeFile as jest.Mock
const mockReadFile = fs.readFile as jest.Mock
const mockReaddir = fs.readdir as jest.Mock
const mockStat = fs.stat as jest.Mock
const mockRm = fs.rm as jest.Mock
const mockUnlink = fs.unlink as jest.Mock
const mockChokidarWatch = chokidar.watch as jest.Mock

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WORKSPACE = '/fake/workspace'
const SECTION_ID = 'consciousness'
const DATE_FOLDER = '2024-03-10_090000'

function makeWorkspaceService(currentPath: string | null = WORKSPACE) {
  return { getCurrent: jest.fn().mockReturnValue(currentPath) }
}

function makeDirent(name: string, isDir: boolean) {
  return { name, isDirectory: () => isDir, isFile: () => !isDir }
}

const SECTION_DIR = `${WORKSPACE}/personality/${SECTION_ID}`
const FOLDER_PATH = `${SECTION_DIR}/${DATE_FOLDER}`

const SAMPLE_METADATA = {
  title: 'Consciousness',
  provider: 'openai',
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 2048,
  reasoning: false,
  createdAt: '2024-03-10T09:00:00.000Z',
}

const SAMPLE_SECTION_CONFIG = {
  schemaVersion: 1,
  provider: 'openai',
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 2048,
  reasoning: false,
  createdAt: '2024-03-10T09:00:00.000Z',
  updatedAt: '2024-03-10T09:00:00.000Z',
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('PersonalityFilesService', () => {
  let service: PersonalityFilesService
  let eventBus: EventBus
  let mockWorkspace: ReturnType<typeof makeWorkspaceService>

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()

    mockChokidarWatch.mockReturnValue(mockWatcherInstance)
    mockWatcherInstance.on.mockReturnThis()

    eventBus = new EventBus()
    mockWorkspace = makeWorkspaceService()
    service = new PersonalityFilesService(mockWorkspace as any, eventBus)
  })

  afterEach(() => {
    service.destroy()
    jest.useRealTimers()
  })

  // -------------------------------------------------------------------------
  // save()
  // -------------------------------------------------------------------------

  describe('save()', () => {
    const VALID_INPUT = {
      sectionId: SECTION_ID,
      content: '## Reflections',
      metadata: { title: 'Reflection', provider: 'openai', model: 'gpt-4o' },
    }

    beforeEach(() => {
      // Section config not yet created
      mockAccess.mockRejectedValue(Object.assign(new Error(), { code: 'ENOENT' }))
      // loadSectionConfig returns null (no existing config)
      mockReadFile.mockRejectedValue(Object.assign(new Error(), { code: 'ENOENT' }))
    })

    it('should return an id matching the date-folder naming pattern', async () => {
      const result = await service.save(VALID_INPUT)
      expect(result.id).toMatch(/^\d{4}-\d{2}-\d{2}_\d{6}$/)
    })

    it('should return a path containing the section ID', async () => {
      const result = await service.save(VALID_INPUT)
      expect(result.path).toContain(SECTION_ID)
    })

    it('should write config.json and DATA.md', async () => {
      await service.save(VALID_INPUT)
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('config.json'),
        expect.any(String),
        'utf-8'
      )
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('DATA.md'),
        '## Reflections',
        'utf-8'
      )
    })

    it('should embed title from caller input in config.json', async () => {
      await service.save(VALID_INPUT)
      const configWrite = (mockWriteFile as jest.Mock).mock.calls.find(
        (c: unknown[]) => (c[0] as string).endsWith('config.json')
      )
      const config = JSON.parse(configWrite![1] as string)
      expect(config.title).toBe('Reflection')
    })

    it('should throw when no workspace is selected', async () => {
      mockWorkspace.getCurrent.mockReturnValue(null)
      await expect(service.save(VALID_INPUT)).rejects.toThrow('No workspace selected')
    })

    it('should use caller provider/model when supplied', async () => {
      await service.save({ ...VALID_INPUT, metadata: { provider: 'anthropic', model: 'claude-3' } })
      const configWrite = (mockWriteFile as jest.Mock).mock.calls.find(
        (c: unknown[]) => (c[0] as string).endsWith('config.json')
      )
      const config = JSON.parse(configWrite![1] as string)
      expect(config.provider).toBe('anthropic')
      expect(config.model).toBe('claude-3')
    })

    it('should fall back to app defaults when no caller metadata and no section config', async () => {
      await service.save({ sectionId: SECTION_ID, content: 'body' })
      const configWrite = (mockWriteFile as jest.Mock).mock.calls.find(
        (c: unknown[]) => (c[0] as string).endsWith('config.json')
      )
      const config = JSON.parse(configWrite![1] as string)
      expect(config.provider).toBe('openai')
      expect(config.model).toBe('gpt-4o')
    })

    it('should use section config values as tier-2 fallback', async () => {
      // loadSectionConfig will return a section config
      const sectionCfg = { ...SAMPLE_SECTION_CONFIG, provider: 'anthropic', model: 'claude-3-sonnet' }
      mockReadFile.mockResolvedValueOnce(JSON.stringify(sectionCfg))

      await service.save({ sectionId: SECTION_ID, content: 'body' })
      const configWrite = (mockWriteFile as jest.Mock).mock.calls.find(
        (c: unknown[]) => (c[0] as string).endsWith('config.json')
      )
      const config = JSON.parse(configWrite![1] as string)
      expect(config.provider).toBe('anthropic')
      expect(config.model).toBe('claude-3-sonnet')
    })
  })

  // -------------------------------------------------------------------------
  // loadAll()
  // -------------------------------------------------------------------------

  describe('loadAll()', () => {
    it('should return empty array when no workspace is selected', async () => {
      mockWorkspace.getCurrent.mockReturnValue(null)
      const result = await service.loadAll()
      expect(result).toEqual([])
    })

    it('should return empty array when personality directory does not exist', async () => {
      mockAccess.mockRejectedValue(Object.assign(new Error(), { code: 'ENOENT' }))
      const result = await service.loadAll()
      expect(result).toEqual([])
    })

    it('should load files from all section subdirectories', async () => {
      // personality dir exists
      mockAccess.mockResolvedValue(undefined)
      // personality dir readdir returns one section folder
      mockReaddir
        .mockResolvedValueOnce([makeDirent(SECTION_ID, true)])  // section dirs
        .mockResolvedValueOnce([makeDirent(DATE_FOLDER, true)]) // files in section

      // loadFolder reads config.json, DATA.md, and stat
      mockReadFile
        .mockResolvedValueOnce(JSON.stringify(SAMPLE_METADATA))
        .mockResolvedValueOnce('## Content')
      mockStat.mockResolvedValue({ mtimeMs: 1710064800000 })

      const result = await service.loadAll()
      expect(result).toHaveLength(1)
      expect(result[0].sectionId).toBe(SECTION_ID)
    })

    it('should skip hidden section directories', async () => {
      mockAccess.mockResolvedValue(undefined)
      mockReaddir.mockResolvedValueOnce([
        makeDirent('.hidden', true),
        makeDirent(SECTION_ID, true),
      ])
      // consciousness section has no files
      mockReaddir.mockResolvedValueOnce([])

      const result = await service.loadAll()
      expect(result).toEqual([])
    })
  })

  // -------------------------------------------------------------------------
  // loadOne()
  // -------------------------------------------------------------------------

  describe('loadOne()', () => {
    it('should throw when no workspace is selected', async () => {
      mockWorkspace.getCurrent.mockReturnValue(null)
      await expect(service.loadOne(SECTION_ID, DATE_FOLDER)).rejects.toThrow('No workspace selected')
    })

    it('should return null when neither folder nor legacy file exists', async () => {
      mockStat.mockRejectedValue(Object.assign(new Error(), { code: 'ENOENT' }))
      mockReadFile.mockRejectedValue(Object.assign(new Error(), { code: 'ENOENT' }))
      const result = await service.loadOne(SECTION_ID, DATE_FOLDER)
      expect(result).toBeNull()
    })

    it('should load from new folder format when folder exists', async () => {
      // stat returns a directory
      mockStat.mockResolvedValue({ isDirectory: () => true, mtimeMs: 1710064800000 })
      mockReadFile
        .mockResolvedValueOnce(JSON.stringify(SAMPLE_METADATA))
        .mockResolvedValueOnce('## Folder content')
      // stat called again inside loadFolder
      mockStat.mockResolvedValue({ mtimeMs: 1710064800000, isDirectory: () => true })

      const result = await service.loadOne(SECTION_ID, DATE_FOLDER)
      expect(result).not.toBeNull()
      expect(result!.id).toBe(DATE_FOLDER)
      expect(result!.content).toBe('## Folder content')
    })

    it('should fall back to legacy .md format when folder does not exist', async () => {
      // First stat throws ENOENT (no folder)
      mockStat.mockRejectedValueOnce(Object.assign(new Error(), { code: 'ENOENT' }))
      // readFile of legacy .md succeeds
      mockReadFile.mockResolvedValueOnce('---\ntitle: Legacy\n---\n## Legacy body')
      // stat for legacy file mtime
      mockStat.mockResolvedValue({ mtimeMs: 1710064800000 })

      const result = await service.loadOne(SECTION_ID, 'legacy-timestamp')
      expect(result).not.toBeNull()
      // gray-matter mock provides the metadata
      expect(result!.metadata.title).toBe('Legacy')
    })
  })

  // -------------------------------------------------------------------------
  // delete()
  // -------------------------------------------------------------------------

  describe('delete()', () => {
    it('should throw when no workspace is selected', async () => {
      mockWorkspace.getCurrent.mockReturnValue(null)
      await expect(service.delete(SECTION_ID, DATE_FOLDER)).rejects.toThrow('No workspace selected')
    })

    it('should call fs.rm recursively when folder exists', async () => {
      mockStat.mockResolvedValue({ isDirectory: () => true })
      await service.delete(SECTION_ID, DATE_FOLDER)
      expect(mockRm).toHaveBeenCalledWith(
        expect.stringContaining(DATE_FOLDER),
        { recursive: true }
      )
    })

    it('should fall back to unlinking legacy .md file when folder not found', async () => {
      mockStat.mockRejectedValue(Object.assign(new Error(), { code: 'ENOENT' }))
      await service.delete(SECTION_ID, 'legacy-id')
      expect(mockUnlink).toHaveBeenCalledWith(
        expect.stringContaining('legacy-id.md')
      )
    })

    it('should succeed silently when legacy file also does not exist', async () => {
      mockStat.mockRejectedValue(Object.assign(new Error(), { code: 'ENOENT' }))
      mockUnlink.mockRejectedValue(Object.assign(new Error(), { code: 'ENOENT' }))
      await expect(service.delete(SECTION_ID, 'ghost-id')).resolves.not.toThrow()
    })
  })

  // -------------------------------------------------------------------------
  // loadSectionConfig()
  // -------------------------------------------------------------------------

  describe('loadSectionConfig()', () => {
    it('should throw when no workspace is selected', async () => {
      mockWorkspace.getCurrent.mockReturnValue(null)
      await expect(service.loadSectionConfig(SECTION_ID)).rejects.toThrow('No workspace selected')
    })

    it('should return null when config file does not exist', async () => {
      mockReadFile.mockRejectedValue(Object.assign(new Error(), { code: 'ENOENT' }))
      const result = await service.loadSectionConfig(SECTION_ID)
      expect(result).toBeNull()
    })

    it('should return parsed config when file exists', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify(SAMPLE_SECTION_CONFIG))
      const result = await service.loadSectionConfig(SECTION_ID)
      expect(result).not.toBeNull()
      expect(result!.provider).toBe('openai')
      expect(result!.model).toBe('gpt-4o')
    })

    it('should throw for unexpected read errors', async () => {
      mockReadFile.mockRejectedValue(Object.assign(new Error('Permission denied'), { code: 'EACCES' }))
      await expect(service.loadSectionConfig(SECTION_ID)).rejects.toThrow(
        'Failed to load section config'
      )
    })
  })

  // -------------------------------------------------------------------------
  // saveSectionConfig()
  // -------------------------------------------------------------------------

  describe('saveSectionConfig()', () => {
    it('should throw when no workspace is selected', async () => {
      mockWorkspace.getCurrent.mockReturnValue(null)
      await expect(
        service.saveSectionConfig(SECTION_ID, { provider: 'openai' })
      ).rejects.toThrow('No workspace selected')
    })

    it('should write config.json for the section', async () => {
      // Directory and existing file don't exist
      mockAccess.mockRejectedValue(Object.assign(new Error(), { code: 'ENOENT' }))
      mockReadFile.mockRejectedValue(Object.assign(new Error(), { code: 'ENOENT' }))

      await service.saveSectionConfig(SECTION_ID, { provider: 'anthropic', model: 'claude-3' })

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('config.json'),
        expect.any(String),
        'utf-8'
      )
    })

    it('should merge update onto existing config and preserve createdAt', async () => {
      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue(JSON.stringify(SAMPLE_SECTION_CONFIG))

      const result = await service.saveSectionConfig(SECTION_ID, { model: 'claude-3-sonnet' })

      expect(result.model).toBe('claude-3-sonnet')
      expect(result.provider).toBe('openai')  // preserved from existing
      expect(result.createdAt).toBe(SAMPLE_SECTION_CONFIG.createdAt) // preserved
    })

    it('should update updatedAt to the current time', async () => {
      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue(JSON.stringify(SAMPLE_SECTION_CONFIG))

      const before = new Date().toISOString()
      const result = await service.saveSectionConfig(SECTION_ID, {})

      expect(new Date(result.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(before).getTime()
      )
    })

    it('should set schemaVersion to 1', async () => {
      mockAccess.mockRejectedValue(Object.assign(new Error(), { code: 'ENOENT' }))
      mockReadFile.mockRejectedValue(Object.assign(new Error(), { code: 'ENOENT' }))

      const result = await service.saveSectionConfig(SECTION_ID, {})
      expect(result.schemaVersion).toBe(1)
    })

    it('should broadcast "personality:section-config-changed" after saving', async () => {
      mockAccess.mockRejectedValue(Object.assign(new Error(), { code: 'ENOENT' }))
      mockReadFile.mockRejectedValue(Object.assign(new Error(), { code: 'ENOENT' }))

      const broadcastSpy = jest.spyOn(eventBus, 'broadcast')
      await service.saveSectionConfig(SECTION_ID, { provider: 'openai' })

      expect(broadcastSpy).toHaveBeenCalledWith(
        'personality:section-config-changed',
        expect.objectContaining({ sectionId: SECTION_ID })
      )
    })

    it('should use app defaults when creating a new config with no existing file', async () => {
      mockAccess.mockRejectedValue(Object.assign(new Error(), { code: 'ENOENT' }))
      mockReadFile.mockRejectedValue(Object.assign(new Error(), { code: 'ENOENT' }))

      const result = await service.saveSectionConfig(SECTION_ID, {})
      expect(result.provider).toBe('openai')
      expect(result.model).toBe('gpt-4o')
      expect(result.temperature).toBe(0.7)
    })
  })

  // -------------------------------------------------------------------------
  // initialize() and watcher
  // -------------------------------------------------------------------------

  describe('initialize()', () => {
    it('should start watching when a workspace is active', async () => {
      await service.initialize()
      expect(mockChokidarWatch).toHaveBeenCalled()
    })

    it('should not watch when workspace is null', async () => {
      mockWorkspace.getCurrent.mockReturnValue(null)
      await service.initialize()
      expect(mockChokidarWatch).not.toHaveBeenCalled()
    })

    it('should start watching when workspace:changed fires with a new path', async () => {
      await service.initialize()
      mockChokidarWatch.mockClear()

      eventBus.emit('workspace:changed', { currentPath: '/new/workspace', previousPath: null })
      // Flush the async chain: event handler → startWatching → fs.mkdir → chokidar.watch
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()

      expect(mockChokidarWatch).toHaveBeenCalled()
    })

    it('should stop watching when workspace:changed fires with null', async () => {
      await service.initialize()
      eventBus.emit('workspace:changed', { currentPath: null, previousPath: WORKSPACE })
      await Promise.resolve()
      expect(mockWatcherInstance.close).toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // destroy()
  // -------------------------------------------------------------------------

  describe('destroy()', () => {
    it('should close the watcher on destroy', async () => {
      await service.initialize()
      service.destroy()
      await Promise.resolve()
      expect(mockWatcherInstance.close).toHaveBeenCalled()
    })

    it('should unsubscribe from workspace:changed on destroy', async () => {
      await service.initialize()
      service.destroy()

      mockChokidarWatch.mockClear()
      eventBus.emit('workspace:changed', { currentPath: '/another', previousPath: null })
      await Promise.resolve()

      // No new watch started after destroy
      expect(mockChokidarWatch).not.toHaveBeenCalled()
    })
  })
})
