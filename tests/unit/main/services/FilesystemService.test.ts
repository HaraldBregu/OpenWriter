/**
 * Tests for FilesystemService.
 * Validates file read/write, dialog operations, and directory watching.
 */
import { dialog, BrowserWindow } from 'electron'
import { FilesystemService } from '../../../../src/main/services/filesystem'

// Mock node:fs
jest.mock('node:fs', () => {
  const mockWatcher = {
    on: jest.fn(),
    close: jest.fn()
  }
  return {
    promises: {
      readFile: jest.fn().mockResolvedValue('file content'),
      stat: jest.fn().mockResolvedValue({ size: 100, mtimeMs: 1000 }),
      writeFile: jest.fn().mockResolvedValue(undefined)
    },
    existsSync: jest.fn().mockReturnValue(true),
    statSync: jest.fn().mockReturnValue({ isDirectory: () => true }),
    watch: jest.fn().mockReturnValue(mockWatcher)
  }
})

import fs from 'node:fs'

describe('FilesystemService', () => {
  let service: FilesystemService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new FilesystemService()
  })

  afterEach(() => {
    service.destroy()
  })

  describe('readFile', () => {
    it('should read file content and return FileInfo', async () => {
      const result = await service.readFile('/fake/test.txt')
      expect(fs.promises.readFile).toHaveBeenCalledWith('/fake/test.txt', 'utf-8')
      expect(fs.promises.stat).toHaveBeenCalledWith('/fake/test.txt')
      expect(result).toEqual({
        filePath: '/fake/test.txt',
        fileName: 'test.txt',
        content: 'file content',
        size: 100,
        lastModified: 1000
      })
    })
  })

  describe('writeFile', () => {
    it('should write content and return success', async () => {
      const result = await service.writeFile('/fake/out.txt', 'data')
      expect(fs.promises.writeFile).toHaveBeenCalledWith('/fake/out.txt', 'data', 'utf-8')
      expect(result).toEqual({ success: true, filePath: '/fake/out.txt' })
    })
  })

  describe('openFileDialog', () => {
    it('should show dialog and return file info when not canceled', async () => {
      ;(dialog.showOpenDialog as jest.Mock).mockResolvedValueOnce({
        canceled: false,
        filePaths: ['/fake/selected.txt']
      })
      const result = await service.openFileDialog()
      expect(result).not.toBeNull()
      expect(result!.filePath).toBe('/fake/selected.txt')
    })

    it('should return null when dialog is canceled', async () => {
      ;(dialog.showOpenDialog as jest.Mock).mockResolvedValueOnce({
        canceled: true,
        filePaths: []
      })
      const result = await service.openFileDialog()
      expect(result).toBeNull()
    })
  })

  describe('saveFileDialog', () => {
    it('should save file when path selected', async () => {
      ;(dialog.showSaveDialog as jest.Mock).mockResolvedValueOnce({
        canceled: false,
        filePath: '/fake/saved.txt'
      })
      const result = await service.saveFileDialog('untitled.txt', 'hello')
      expect(result).toEqual({ success: true, filePath: '/fake/saved.txt' })
      expect(fs.promises.writeFile).toHaveBeenCalledWith('/fake/saved.txt', 'hello', 'utf-8')
    })

    it('should return success=false when canceled', async () => {
      ;(dialog.showSaveDialog as jest.Mock).mockResolvedValueOnce({
        canceled: true,
        filePath: undefined
      })
      const result = await service.saveFileDialog('untitled.txt', 'hello')
      expect(result).toEqual({ success: false, filePath: null })
    })
  })

  describe('selectDirectory', () => {
    it('should return directory path when selected', async () => {
      ;(dialog.showOpenDialog as jest.Mock).mockResolvedValueOnce({
        canceled: false,
        filePaths: ['/fake/dir']
      })
      const result = await service.selectDirectory()
      expect(result).toBe('/fake/dir')
    })

    it('should return null when canceled', async () => {
      ;(dialog.showOpenDialog as jest.Mock).mockResolvedValueOnce({
        canceled: true,
        filePaths: []
      })
      const result = await service.selectDirectory()
      expect(result).toBeNull()
    })
  })

  describe('watchDirectory', () => {
    it('should start watching a directory and return true', () => {
      const result = service.watchDirectory('/fake/dir')
      expect(result).toBe(true)
      expect(fs.watch).toHaveBeenCalledWith('/fake/dir', { recursive: false }, expect.any(Function))
    })

    it('should return false if directory is already watched', () => {
      service.watchDirectory('/fake/dir')
      const result = service.watchDirectory('/fake/dir')
      expect(result).toBe(false)
    })

    it('should return false if path does not exist', () => {
      ;(fs.existsSync as jest.Mock).mockReturnValueOnce(false)
      const result = service.watchDirectory('/nonexistent')
      expect(result).toBe(false)
    })

    it('should return false if path is not a directory', () => {
      ;(fs.statSync as jest.Mock).mockReturnValueOnce({ isDirectory: () => false })
      const result = service.watchDirectory('/fake/file.txt')
      expect(result).toBe(false)
    })
  })

  describe('unwatchDirectory', () => {
    it('should close watcher and return true', () => {
      service.watchDirectory('/fake/dir')
      const result = service.unwatchDirectory('/fake/dir')
      expect(result).toBe(true)
    })

    it('should return false for unwatched directory', () => {
      expect(service.unwatchDirectory('/not/watched')).toBe(false)
    })
  })

  describe('getWatchedDirectories', () => {
    it('should return list of watched directories', () => {
      service.watchDirectory('/fake/dir1')
      service.watchDirectory('/fake/dir2')
      const dirs = service.getWatchedDirectories()
      expect(dirs).toContain('/fake/dir1')
      expect(dirs).toContain('/fake/dir2')
    })
  })

  describe('onWatchEvent', () => {
    it('should call callback when watch event fires', () => {
      const callback = jest.fn()
      service.onWatchEvent(callback)
      service.watchDirectory('/fake/dir')

      // Trigger the fs.watch callback
      const watchCallback = (fs.watch as jest.Mock).mock.calls[0][2]
      watchCallback('rename', 'file.txt')

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'rename',
          filename: 'file.txt',
          directory: '/fake/dir'
        })
      )
    })
  })

  describe('destroy', () => {
    it('should close all watchers', () => {
      service.watchDirectory('/fake/dir1')
      service.watchDirectory('/fake/dir2')
      service.destroy()
      expect(service.getWatchedDirectories()).toEqual([])
    })
  })
})
