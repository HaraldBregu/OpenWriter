/**
 * Tests for BrainFilesService.
 * Handles saving and loading brain conversation files to workspace.
 */
import * as fs from 'fs/promises'
import * as path from 'path'
import { BrainFilesService } from '../../../../src/main/services/brain-files'
import { EventBus } from '../../../../src/main/core/EventBus'

// Mock fs/promises
jest.mock('fs/promises')
const mockFs = fs as jest.Mocked<typeof fs>

// Mock chokidar
jest.mock('chokidar', () => ({
  watch: jest.fn().mockReturnValue({
    on: jest.fn().mockReturnThis(),
    close: jest.fn().mockResolvedValue(undefined)
  })
}))

describe('BrainFilesService', () => {
  let service: BrainFilesService
  let eventBus: EventBus
  const mockWorkspacePath = '/test/workspace'
  const mockWindowId = 1

  beforeEach(() => {
    jest.clearAllMocks()
    eventBus = new EventBus()
    service = new BrainFilesService(eventBus, mockWindowId)
    service.setWorkspace(mockWorkspacePath)

    // Default mock implementations
    mockFs.mkdir.mockResolvedValue(undefined)
    mockFs.writeFile.mockResolvedValue(undefined)
    mockFs.readFile.mockResolvedValue('')
    mockFs.readdir.mockResolvedValue([])
    mockFs.unlink.mockResolvedValue(undefined)
    mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any)
  })

  afterEach(async () => {
    await service.destroy()
  })

  describe('save', () => {
    it('should save a brain file with metadata', async () => {
      const input = {
        sectionId: 'principles',
        content: 'Test conversation content',
        metadata: {
          title: 'Test Conversation',
          tags: ['ai', 'test']
        }
      }

      const result = await service.save(input)

      expect(result.id).toBeDefined()
      expect(result.path).toContain('brain/principles')
      expect(result.path).toEndWith('.md')
      expect(result.savedAt).toBeDefined()

      expect(mockFs.mkdir).toHaveBeenCalled()
      expect(mockFs.writeFile).toHaveBeenCalled()

      // Check the written content includes frontmatter
      const writeCall = (mockFs.writeFile as jest.Mock).mock.calls[0]
      const content = writeCall[1] as string
      expect(content).toContain('---')
      expect(content).toContain('sectionId: principles')
      expect(content).toContain('title: Test Conversation')
      expect(content).toContain('Test conversation content')
    })

    it('should create brain directory if it does not exist', async () => {
      mockFs.stat.mockRejectedValueOnce({ code: 'ENOENT' } as any)

      await service.save({
        sectionId: 'principles',
        content: 'Test',
        metadata: {}
      })

      expect(mockFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('brain/principles'),
        { recursive: true }
      )
    })

    it('should throw error if workspace is not set', async () => {
      const serviceWithoutWorkspace = new BrainFilesService(eventBus, mockWindowId)

      await expect(
        serviceWithoutWorkspace.save({
          sectionId: 'principles',
          content: 'Test',
          metadata: {}
        })
      ).rejects.toThrow('No workspace path set')
    })

    it('should include timestamps in metadata', async () => {
      await service.save({
        sectionId: 'principles',
        content: 'Test',
        metadata: {}
      })

      const writeCall = (mockFs.writeFile as jest.Mock).mock.calls[0]
      const content = writeCall[1] as string

      expect(content).toContain('createdAt:')
      expect(content).toContain('updatedAt:')
    })
  })

  describe('loadAll', () => {
    it('should load all brain files from all sections', async () => {
      const sections = ['principles', 'consciousness', 'memory', 'reasoning', 'perception']

      // Mock directory structure
      mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any)
      mockFs.readdir.mockImplementation((dirPath: any) => {
        if (dirPath.includes('principles')) {
          return Promise.resolve(['123.md', '456.md'] as any)
        }
        return Promise.resolve([] as any)
      })

      // Mock file content with frontmatter
      mockFs.readFile.mockResolvedValue(`---
sectionId: principles
title: Test File
createdAt: 1708709000000
updatedAt: 1708709000000
---

# Test Content

This is a test conversation.
`)

      const files = await service.loadAll()

      expect(files).toHaveLength(2)
      expect(files[0].sectionId).toBe('principles')
      expect(files[0].metadata.title).toBe('Test File')
      expect(files[0].content).toContain('Test Content')
    })

    it('should handle empty brain directory', async () => {
      mockFs.stat.mockRejectedValue({ code: 'ENOENT' } as any)

      const files = await service.loadAll()

      expect(files).toEqual([])
    })

    it('should skip non-markdown files', async () => {
      mockFs.readdir.mockResolvedValue(['test.md', 'test.txt', '.DS_Store'] as any)

      mockFs.readFile.mockResolvedValue(`---
sectionId: principles
---
Content`)

      const files = await service.loadAll()

      expect(files).toHaveLength(1)
    })

    it('should handle files with invalid frontmatter', async () => {
      mockFs.readdir.mockResolvedValue(['123.md'] as any)
      mockFs.readFile.mockResolvedValue('Invalid content without frontmatter')

      const files = await service.loadAll()

      // Should still return the file with default metadata
      expect(files).toHaveLength(1)
      expect(files[0].metadata).toBeDefined()
    })
  })

  describe('loadOne', () => {
    it('should load a specific brain file', async () => {
      mockFs.readFile.mockResolvedValue(`---
sectionId: principles
title: Specific File
createdAt: 1708709000000
updatedAt: 1708709000000
---

Content here`)

      const file = await service.loadOne({
        sectionId: 'principles',
        id: '123'
      })

      expect(file).not.toBeNull()
      expect(file!.id).toBe('123')
      expect(file!.sectionId).toBe('principles')
      expect(file!.metadata.title).toBe('Specific File')
      expect(file!.content).toContain('Content here')
    })

    it('should return null if file does not exist', async () => {
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' } as any)

      const file = await service.loadOne({
        sectionId: 'principles',
        id: 'nonexistent'
      })

      expect(file).toBeNull()
    })
  })

  describe('delete', () => {
    it('should delete a brain file', async () => {
      await service.delete({
        sectionId: 'principles',
        id: '123'
      })

      expect(mockFs.unlink).toHaveBeenCalledWith(
        expect.stringContaining('brain/principles/123.md')
      )
    })

    it('should not throw error if file does not exist', async () => {
      mockFs.unlink.mockRejectedValue({ code: 'ENOENT' } as any)

      await expect(
        service.delete({
          sectionId: 'principles',
          id: 'nonexistent'
        })
      ).resolves.not.toThrow()
    })

    it('should throw error for other file system errors', async () => {
      mockFs.unlink.mockRejectedValue(new Error('Permission denied'))

      await expect(
        service.delete({
          sectionId: 'principles',
          id: '123'
        })
      ).rejects.toThrow('Permission denied')
    })
  })

  describe('workspace management', () => {
    it('should handle workspace change', async () => {
      const newWorkspace = '/new/workspace'

      await service.setWorkspace(newWorkspace)

      // Save should use new workspace
      await service.save({
        sectionId: 'principles',
        content: 'Test',
        metadata: {}
      })

      const writeCall = (mockFs.writeFile as jest.Mock).mock.calls[0]
      const filePath = writeCall[0] as string
      expect(filePath).toContain(newWorkspace)
    })

    it('should clear workspace', async () => {
      service.setWorkspace('')

      await expect(
        service.save({
          sectionId: 'principles',
          content: 'Test',
          metadata: {}
        })
      ).rejects.toThrow('No workspace path set')
    })
  })

  describe('file watching', () => {
    it('should start watching on setWorkspace', async () => {
      const chokidar = require('chokidar')

      await service.setWorkspace(mockWorkspacePath)

      expect(chokidar.watch).toHaveBeenCalledWith(
        expect.stringContaining('brain'),
        expect.objectContaining({
          persistent: true,
          ignoreInitial: true
        })
      )
    })
  })

  describe('section validation', () => {
    it('should accept valid section IDs', async () => {
      const validSections = ['principles', 'consciousness', 'memory', 'reasoning', 'perception']

      for (const sectionId of validSections) {
        await expect(
          service.save({
            sectionId,
            content: 'Test',
            metadata: {}
          })
        ).resolves.toBeDefined()
      }
    })
  })

  describe('edge cases', () => {
    it('should handle very long content', async () => {
      const longContent = 'x'.repeat(100000)

      await service.save({
        sectionId: 'principles',
        content: longContent,
        metadata: {}
      })

      const writeCall = (mockFs.writeFile as jest.Mock).mock.calls[0]
      const content = writeCall[1] as string
      expect(content).toContain(longContent)
    })

    it('should handle special characters in metadata', async () => {
      await service.save({
        sectionId: 'principles',
        content: 'Test',
        metadata: {
          title: 'Test: "quotes" & special <chars>',
          tags: ['tag-with-dash', 'tag_with_underscore']
        }
      })

      const writeCall = (mockFs.writeFile as jest.Mock).mock.calls[0]
      const content = writeCall[1] as string
      expect(content).toContain('title:')
    })

    it('should handle concurrent saves', async () => {
      const promises = []
      for (let i = 0; i < 10; i++) {
        promises.push(
          service.save({
            sectionId: 'principles',
            content: `Test ${i}`,
            metadata: {}
          })
        )
      }

      const results = await Promise.all(promises)

      // All should succeed with unique IDs
      const ids = results.map((r) => r.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(10)
    })
  })
})
