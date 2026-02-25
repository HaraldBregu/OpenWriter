/**
 * Tests for OutputFilesService.
 *
 * Strategy:
 *   - Mock node:fs/promises and chokidar to avoid real disk I/O.
 *   - Use a mock WorkspaceService that returns a configurable current path.
 *   - Test public API: save(), loadAll(), loadByType(), loadOne(), update(), delete(), destroy().
 *   - Validate error paths: no workspace selected, invalid output type, missing files.
 *   - Verify folder-naming convention (YYYY-MM-DD_HHmmss) used for saved entries.
 *   - Test watcher lifecycle via EventBus workspace:changed events.
 *   - Verify legacy DATA.md migration: old folders are transparently migrated to
 *     the new per-block format on the first loadFolder() call.
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

const mockWatcherInstance = {
  on: jest.fn().mockReturnThis(),
  close: jest.fn().mockResolvedValue(undefined),
}
jest.mock('chokidar', () => ({
  watch: jest.fn().mockReturnValue(mockWatcherInstance),
}))

import fs from 'node:fs/promises'
import chokidar from 'chokidar'
import 'node:path'
import { OutputFilesService } from '../../../../src/main/services/output-files'
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
const BLOCK_ID = 'block-uuid-0001'

function makeWorkspaceService(currentPath: string | null = WORKSPACE) {
  return { getCurrent: jest.fn().mockReturnValue(currentPath) }
}

/** Create a Dirent-like object for readdir { withFileTypes: true } */
function makeDirent(name: string, isDir: boolean) {
  return { name, isDirectory: () => isDir, isFile: () => !isDir }
}

/** Sample config.json metadata — new format includes `content` array. */
const SAMPLE_METADATA = {
  title: 'My Post',
  type: 'posts' as const,
  category: 'tech',
  tags: ['ai'],
  visibility: 'public',
  provider: 'openai',
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 2048,
  reasoning: false,
  createdAt: '2024-01-15T12:00:00.000Z',
  updatedAt: '2024-01-15T12:00:00.000Z',
  content: [
    {
      type: 'content' as const,
      filetype: 'markdown' as const,
      name: BLOCK_ID,
      createdAt: '2024-01-15T12:00:00.000Z',
      updatedAt: '2024-01-15T12:00:00.000Z',
    },
  ],
}

/** Legacy config.json — no `content` array. */
const LEGACY_METADATA = {
  title: 'Legacy Post',
  type: 'posts' as const,
  category: 'tech',
  tags: [],
  visibility: 'public',
  provider: 'openai',
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 2048,
  reasoning: false,
  createdAt: '2024-01-15T12:00:00.000Z',
  updatedAt: '2024-01-15T12:00:00.000Z',
  // Intentionally missing `content` array
}

/** Valid blocks array for save/update operations. */
const VALID_BLOCKS = [
  { name: BLOCK_ID, content: '# Hello World' },
]

const DATE_FOLDER = '2024-01-15_120000'

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('OutputFilesService', () => {
  let service: OutputFilesService
  let eventBus: EventBus
  let mockWorkspace: ReturnType<typeof makeWorkspaceService>

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()

    mockChokidarWatch.mockReturnValue(mockWatcherInstance)
    mockWatcherInstance.on.mockReturnThis()

    eventBus = new EventBus()
    mockWorkspace = makeWorkspaceService()
    service = new OutputFilesService(mockWorkspace as any, eventBus)
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
      type: 'posts' as const,
      blocks: VALID_BLOCKS,
      metadata: {
        title: 'Hello World',
        category: 'tech',
        tags: ['ai'],
        visibility: 'public',
        provider: 'openai',
        model: 'gpt-4o',
      },
    }

    beforeEach(() => {
      // Directory creation succeeds
      mockAccess.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))
    })

    it('should create directory structure, write block .md file(s), and config.json', async () => {
      const result = await service.save(VALID_INPUT)

      expect(result.id).toBeTruthy()
      expect(result.path).toContain('posts')
      expect(result.savedAt).toBeGreaterThan(0)
      // writeFile is called: once per block + once for config.json
      expect(mockWriteFile).toHaveBeenCalledTimes(2)
    })

    it('should name the folder using the YYYY-MM-DD_HHmmss pattern', async () => {
      const result = await service.save(VALID_INPUT)
      expect(result.id).toMatch(/^\d{4}-\d{2}-\d{2}_\d{6}$/)
    })

    it('should throw when no workspace is selected', async () => {
      mockWorkspace.getCurrent.mockReturnValue(null)
      await expect(service.save(VALID_INPUT)).rejects.toThrow('No workspace selected')
    })

    it('should throw for invalid output type', async () => {
      await expect(
        service.save({ ...VALID_INPUT, type: 'invalid' as any })
      ).rejects.toThrow('Invalid output type')
    })

    it('should throw when blocks array is empty', async () => {
      await expect(
        service.save({ ...VALID_INPUT, blocks: [] })
      ).rejects.toThrow('At least one content block is required')
    })

    it('should write valid JSON to config.json including a content descriptor array', async () => {
      await service.save(VALID_INPUT)
      const configWriteCall = (mockWriteFile as jest.Mock).mock.calls.find(
        (c: unknown[]) => (c[0] as string).endsWith('config.json')
      )
      expect(configWriteCall).toBeDefined()
      const configContent = JSON.parse(configWriteCall![1] as string)
      expect(configContent.type).toBe('posts')
      expect(configContent.title).toBe('Hello World')
      expect(Array.isArray(configContent.content)).toBe(true)
      expect(configContent.content).toHaveLength(1)
      expect(configContent.content[0].name).toBe(BLOCK_ID)
    })

    it('should write the block content to a <name>.md file', async () => {
      await service.save(VALID_INPUT)
      const blockWriteCall = (mockWriteFile as jest.Mock).mock.calls.find(
        (c: unknown[]) => (c[0] as string).endsWith(`${BLOCK_ID}.md`)
      )
      expect(blockWriteCall).toBeDefined()
      expect(blockWriteCall![1]).toBe('# Hello World')
    })

    it('should accept "writings" as a valid output type', async () => {
      await expect(service.save({ ...VALID_INPUT, type: 'writings' })).resolves.not.toThrow()
    })

    it('should handle multiple blocks in a single save', async () => {
      const block2Id = 'block-uuid-0002'
      const multiBlockInput = {
        ...VALID_INPUT,
        blocks: [
          { name: BLOCK_ID, content: '# First' },
          { name: block2Id, content: '## Second' },
        ],
      }

      const result = await service.save(multiBlockInput)
      expect(result.id).toBeTruthy()
      // 2 block files + 1 config.json = 3 writes
      expect(mockWriteFile).toHaveBeenCalledTimes(3)
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

    it('should return empty array when output directory does not exist', async () => {
      mockAccess.mockRejectedValue(Object.assign(new Error(), { code: 'ENOENT' }))
      const result = await service.loadAll()
      expect(result).toEqual([])
    })

    it('should aggregate files from all valid output types', async () => {
      // output dir exists
      mockAccess.mockResolvedValue(undefined)
      // Each type dir exists but has no entries — simplify to avoid real file loading
      mockReaddir.mockResolvedValue([])

      const result = await service.loadAll()
      expect(Array.isArray(result)).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // loadByType()
  // -------------------------------------------------------------------------

  describe('loadByType()', () => {
    it('should return empty array when no workspace is selected', async () => {
      mockWorkspace.getCurrent.mockReturnValue(null)
      const result = await service.loadByType('posts')
      expect(result).toEqual([])
    })

    it('should return empty array when type directory does not exist', async () => {
      mockAccess.mockRejectedValue(Object.assign(new Error(), { code: 'ENOENT' }))
      const result = await service.loadByType('posts')
      expect(result).toEqual([])
    })

    it('should throw for invalid output type', async () => {
      await expect(service.loadByType('notes' as any)).rejects.toThrow('Invalid output type')
    })

    it('should skip entries that are not date-named directories', async () => {
      mockAccess.mockResolvedValue(undefined)
      mockReaddir.mockResolvedValue([
        makeDirent('not-a-date-folder', true),
        makeDirent('.hidden', true),
        makeDirent('some-file.json', false),
      ])

      const result = await service.loadByType('posts')
      expect(result).toEqual([])
    })

    it('should load valid date-named folders (new per-block format)', async () => {
      mockAccess.mockResolvedValue(undefined)
      mockReaddir.mockResolvedValue([makeDirent(DATE_FOLDER, true)])

      // loadFolder reads: config.json (stat happens in parallel with config read)
      // then reads the block file listed in config.content
      mockReadFile
        .mockResolvedValueOnce(JSON.stringify(SAMPLE_METADATA)) // config.json
        .mockResolvedValueOnce('# Content')                     // <block-id>.md
      mockStat.mockResolvedValue({ mtimeMs: 1705320000000 })

      const result = await service.loadByType('posts')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(DATE_FOLDER)
      expect(result[0].type).toBe('posts')
      expect(result[0].blocks).toHaveLength(1)
      expect(result[0].blocks[0].content).toBe('# Content')
      expect(result[0].blocks[0].name).toBe(BLOCK_ID)
    })
  })

  // -------------------------------------------------------------------------
  // loadOne()
  // -------------------------------------------------------------------------

  describe('loadOne()', () => {
    it('should throw when no workspace is selected', async () => {
      mockWorkspace.getCurrent.mockReturnValue(null)
      await expect(service.loadOne('posts', DATE_FOLDER)).rejects.toThrow('No workspace selected')
    })

    it('should return null when folder does not exist', async () => {
      mockStat.mockRejectedValue(Object.assign(new Error(), { code: 'ENOENT' }))
      const result = await service.loadOne('posts', DATE_FOLDER)
      expect(result).toBeNull()
    })

    it('should return the output file when folder exists (new format)', async () => {
      mockStat.mockResolvedValue({ isDirectory: () => true, mtimeMs: 1705320000000 })
      mockReadFile
        .mockResolvedValueOnce(JSON.stringify(SAMPLE_METADATA))
        .mockResolvedValueOnce('# Body')
      mockStat.mockResolvedValue({ mtimeMs: 1705320000000, isDirectory: () => true })

      const result = await service.loadOne('posts', DATE_FOLDER)
      expect(result).not.toBeNull()
      expect(result!.id).toBe(DATE_FOLDER)
      expect(result!.blocks).toHaveLength(1)
      expect(result!.blocks[0].content).toBe('# Body')
    })

    it('should throw for invalid output type', async () => {
      await expect(service.loadOne('unknown' as any, 'abc')).rejects.toThrow('Invalid output type')
    })
  })

  // -------------------------------------------------------------------------
  // Legacy DATA.md migration
  // -------------------------------------------------------------------------

  describe('Legacy DATA.md migration', () => {
    it('should migrate a legacy folder (no content array) on loadFolder', async () => {
      mockAccess.mockResolvedValue(undefined)
      mockReaddir.mockResolvedValue([makeDirent(DATE_FOLDER, true)])
      mockStat.mockResolvedValue({ mtimeMs: 1705320000000, isDirectory: () => true })

      // config.json has no content array (legacy format)
      // DATA.md exists with content
      mockReadFile
        .mockResolvedValueOnce(JSON.stringify(LEGACY_METADATA)) // config.json
        .mockResolvedValueOnce('# Legacy Content')              // DATA.md

      // unlink (removing DATA.md) should succeed
      mockUnlink.mockResolvedValue(undefined)

      const result = await service.loadByType('posts')
      expect(result).toHaveLength(1)
      expect(result[0].blocks).toHaveLength(1)
      expect(result[0].blocks[0].content).toBe('# Legacy Content')

      // The migration should write the new block file and rewrite config.json
      // and then unlink DATA.md
      const blockWrite = (mockWriteFile as jest.Mock).mock.calls.find(
        (c: unknown[]) => (c[0] as string).endsWith('.md') && !(c[0] as string).endsWith('DATA.md')
      )
      expect(blockWrite).toBeDefined()
      expect(blockWrite![1]).toBe('# Legacy Content')

      const configWrite = (mockWriteFile as jest.Mock).mock.calls.find(
        (c: unknown[]) => (c[0] as string).endsWith('config.json')
      )
      expect(configWrite).toBeDefined()
      const written = JSON.parse(configWrite![1] as string)
      expect(Array.isArray(written.content)).toBe(true)
      expect(written.content).toHaveLength(1)
    })

    it('should handle missing DATA.md gracefully (empty blocks) in legacy folders', async () => {
      mockAccess.mockResolvedValue(undefined)
      mockReaddir.mockResolvedValue([makeDirent(DATE_FOLDER, true)])
      mockStat.mockResolvedValue({ mtimeMs: 1705320000000, isDirectory: () => true })

      // config.json has no content array; DATA.md does not exist
      mockReadFile
        .mockResolvedValueOnce(JSON.stringify(LEGACY_METADATA))
        .mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))

      const result = await service.loadByType('posts')
      expect(result).toHaveLength(1)
      expect(result[0].blocks).toHaveLength(1)
      expect(result[0].blocks[0].content).toBe('')
    })
  })

  // -------------------------------------------------------------------------
  // update()
  // -------------------------------------------------------------------------

  describe('update()', () => {
    const VALID_UPDATE_INPUT = {
      blocks: VALID_BLOCKS,
      metadata: {
        title: 'Updated Post',
        category: 'tech',
        tags: ['ai'],
        visibility: 'public',
        provider: 'openai',
        model: 'gpt-4o',
      },
    }

    it('should throw when no workspace is selected', async () => {
      mockWorkspace.getCurrent.mockReturnValue(null)
      await expect(service.update('posts', DATE_FOLDER, VALID_UPDATE_INPUT)).rejects.toThrow('No workspace selected')
    })

    it('should throw when blocks array is empty', async () => {
      await expect(
        service.update('posts', DATE_FOLDER, { ...VALID_UPDATE_INPUT, blocks: [] })
      ).rejects.toThrow('At least one content block is required')
    })

    it('should preserve createdAt from the existing config', async () => {
      const existingConfig = {
        ...SAMPLE_METADATA,
        createdAt: '2024-01-15T12:00:00.000Z',
      }
      mockReadFile.mockResolvedValueOnce(JSON.stringify(existingConfig))

      await service.update('posts', DATE_FOLDER, VALID_UPDATE_INPUT)

      const configWriteCall = (mockWriteFile as jest.Mock).mock.calls.find(
        (c: unknown[]) => (c[0] as string).endsWith('config.json')
      )
      const written = JSON.parse(configWriteCall![1] as string)
      expect(written.createdAt).toBe('2024-01-15T12:00:00.000Z')
    })

    it('should update updatedAt to the current time', async () => {
      const existingConfig = { ...SAMPLE_METADATA }
      mockReadFile.mockResolvedValueOnce(JSON.stringify(existingConfig))

      const beforeUpdate = new Date().toISOString()
      await service.update('posts', DATE_FOLDER, VALID_UPDATE_INPUT)

      const configWriteCall = (mockWriteFile as jest.Mock).mock.calls.find(
        (c: unknown[]) => (c[0] as string).endsWith('config.json')
      )
      const written = JSON.parse(configWriteCall![1] as string)
      expect(new Date(written.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(beforeUpdate).getTime())
    })

    it('should write updated content to the block .md file', async () => {
      mockReadFile.mockResolvedValueOnce(JSON.stringify(SAMPLE_METADATA))

      await service.update('posts', DATE_FOLDER, {
        blocks: [{ name: BLOCK_ID, content: 'Updated markdown' }],
        metadata: VALID_UPDATE_INPUT.metadata,
      })

      const blockWriteCall = (mockWriteFile as jest.Mock).mock.calls.find(
        (c: unknown[]) => (c[0] as string).endsWith(`${BLOCK_ID}.md`)
      )
      expect(blockWriteCall).toBeDefined()
      expect(blockWriteCall![1]).toBe('Updated markdown')
    })

    it('should write the updated content array to config.json', async () => {
      mockReadFile.mockResolvedValueOnce(JSON.stringify(SAMPLE_METADATA))

      await service.update('posts', DATE_FOLDER, VALID_UPDATE_INPUT)

      const configWriteCall = (mockWriteFile as jest.Mock).mock.calls.find(
        (c: unknown[]) => (c[0] as string).endsWith('config.json')
      )
      const written = JSON.parse(configWriteCall![1] as string)
      expect(Array.isArray(written.content)).toBe(true)
      expect(written.content).toHaveLength(1)
      expect(written.content[0].name).toBe(BLOCK_ID)
    })

    it('should delete removed block files when blocks are removed', async () => {
      // Existing config has 2 blocks; update provides only 1
      const twoBlockConfig = {
        ...SAMPLE_METADATA,
        content: [
          ...SAMPLE_METADATA.content,
          { type: 'content', filetype: 'markdown', name: 'block-to-remove', createdAt: '', updatedAt: '' },
        ],
      }
      mockReadFile.mockResolvedValueOnce(JSON.stringify(twoBlockConfig))

      await service.update('posts', DATE_FOLDER, VALID_UPDATE_INPUT)

      // unlink should be called for the removed block
      expect(mockUnlink).toHaveBeenCalledWith(
        expect.stringContaining('block-to-remove.md')
      )
    })
  })

  // -------------------------------------------------------------------------
  // delete()
  // -------------------------------------------------------------------------

  describe('delete()', () => {
    it('should throw when no workspace is selected', async () => {
      mockWorkspace.getCurrent.mockReturnValue(null)
      await expect(service.delete('posts', DATE_FOLDER)).rejects.toThrow('No workspace selected')
    })

    it('should call fs.rm recursively when the folder exists', async () => {
      mockStat.mockResolvedValue({ isDirectory: () => true })
      mockReaddir.mockResolvedValue([])  // no children to iterate
      await service.delete('posts', DATE_FOLDER)
      expect(mockRm).toHaveBeenCalledWith(
        expect.stringContaining(DATE_FOLDER),
        { recursive: true }
      )
    })

    it('should succeed silently when folder does not exist (ENOENT)', async () => {
      mockStat.mockRejectedValue(Object.assign(new Error(), { code: 'ENOENT' }))
      await expect(service.delete('posts', DATE_FOLDER)).resolves.not.toThrow()
    })

    it('should emit a "removed" file-changed event after deletion', async () => {
      mockStat.mockResolvedValue({ isDirectory: () => true })
      mockReaddir.mockResolvedValue([])
      const broadcastSpy = jest.spyOn(eventBus, 'broadcast')

      await service.delete('posts', DATE_FOLDER)
      jest.runAllTimers()

      expect(broadcastSpy).toHaveBeenCalledWith(
        'output:file-changed',
        expect.objectContaining({ type: 'removed' })
      )
    })

    it('should throw for invalid output type', async () => {
      await expect(service.delete('notes' as any, DATE_FOLDER)).rejects.toThrow('Invalid output type')
    })
  })

  // -------------------------------------------------------------------------
  // initialize() and workspace watcher
  // -------------------------------------------------------------------------

  describe('initialize()', () => {
    it('should start watching the current workspace if set', async () => {
      await service.initialize()
      expect(mockChokidarWatch).toHaveBeenCalled()
    })

    it('should not start watching when no workspace is set', async () => {
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
  })

  // -------------------------------------------------------------------------
  // destroy()
  // -------------------------------------------------------------------------

  describe('destroy()', () => {
    it('should stop the watcher on destroy', async () => {
      await service.initialize()
      service.destroy()
      await Promise.resolve()
      expect(mockWatcherInstance.close).toHaveBeenCalled()
    })
  })
})
