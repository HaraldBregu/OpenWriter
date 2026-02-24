/**
 * Tests for useFilesystem hook.
 * File open/save/watch operations with loading/error state.
 * The hook delegates to window.fs.* namespace.
 */
import { renderHook, act, waitFor } from '@testing-library/react'
import { useFilesystem } from '../../../../src/renderer/src/hooks/useFilesystem'

describe('useFilesystem', () => {
  it('should initialize and load watched directories', async () => {
    ;(window.fs.getWatched as jest.Mock).mockResolvedValue(['/watched/dir'])

    const { result } = renderHook(() => useFilesystem())

    await waitFor(() => {
      expect(result.current.watchedDirs).toEqual(['/watched/dir'])
    })

    expect(result.current.currentFile).toBeNull()
    expect(result.current.error).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  describe('openFile', () => {
    it('should open a file and set currentFile', async () => {
      ;(window.fs.getWatched as jest.Mock).mockResolvedValue([])
      const mockFile = {
        filePath: '/test/doc.txt',
        fileName: 'doc.txt',
        content: 'hello world',
        size: 11,
        lastModified: Date.now()
      }
      ;(window.fs.openFile as jest.Mock).mockResolvedValue(mockFile)

      const { result } = renderHook(() => useFilesystem())

      await act(async () => {
        await result.current.openFile()
      })

      expect(result.current.currentFile).toEqual(mockFile)
      expect(result.current.loading).toBe(false)
    })

    it('should not set currentFile when dialog is cancelled', async () => {
      ;(window.fs.getWatched as jest.Mock).mockResolvedValue([])
      ;(window.fs.openFile as jest.Mock).mockResolvedValue(null)

      const { result } = renderHook(() => useFilesystem())

      await act(async () => {
        await result.current.openFile()
      })

      expect(result.current.currentFile).toBeNull()
    })

    it('should set error on failure', async () => {
      ;(window.fs.getWatched as jest.Mock).mockResolvedValue([])
      ;(window.fs.openFile as jest.Mock).mockRejectedValue(new Error('open failed'))

      const { result } = renderHook(() => useFilesystem())

      await act(async () => {
        await result.current.openFile()
      })

      expect(result.current.error).toBe('open failed')
      expect(result.current.loading).toBe(false)
    })
  })

  describe('saveFile', () => {
    it('should save a file and return true on success', async () => {
      ;(window.fs.getWatched as jest.Mock).mockResolvedValue([])
      ;(window.fs.saveFile as jest.Mock).mockResolvedValue({ success: true, filePath: '/save/path.txt' })

      const { result } = renderHook(() => useFilesystem())

      let success = false
      await act(async () => {
        success = await result.current.saveFile('file.txt', 'content')
      })

      expect(success).toBe(true)
      expect(window.fs.saveFile).toHaveBeenCalledWith('file.txt', 'content')
    })

    it('should return false on failure', async () => {
      ;(window.fs.getWatched as jest.Mock).mockResolvedValue([])
      ;(window.fs.saveFile as jest.Mock).mockRejectedValue(new Error('save failed'))

      const { result } = renderHook(() => useFilesystem())

      let success = true
      await act(async () => {
        success = await result.current.saveFile('file.txt', 'content')
      })

      expect(success).toBe(false)
      expect(result.current.error).toBe('save failed')
    })
  })

  describe('writeFile', () => {
    it('should write to a specific path', async () => {
      ;(window.fs.getWatched as jest.Mock).mockResolvedValue([])
      ;(window.fs.writeFile as jest.Mock).mockResolvedValue({ success: true, filePath: '/a.txt' })

      const { result } = renderHook(() => useFilesystem())

      let success = false
      await act(async () => {
        success = await result.current.writeFile('/a.txt', 'data')
      })

      expect(success).toBe(true)
      expect(window.fs.writeFile).toHaveBeenCalledWith('/a.txt', 'data')
    })
  })

  describe('clearFile', () => {
    it('should reset currentFile to null', async () => {
      ;(window.fs.getWatched as jest.Mock).mockResolvedValue([])
      ;(window.fs.openFile as jest.Mock).mockResolvedValue({
        filePath: '/x', fileName: 'x', content: 'x', size: 1, lastModified: 0
      })

      const { result } = renderHook(() => useFilesystem())

      await act(async () => {
        await result.current.openFile()
      })
      expect(result.current.currentFile).not.toBeNull()

      act(() => {
        result.current.clearFile()
      })
      expect(result.current.currentFile).toBeNull()
    })
  })

  describe('clearEvents', () => {
    it('should reset watch events to empty array', () => {
      ;(window.fs.getWatched as jest.Mock).mockResolvedValue([])

      const { result } = renderHook(() => useFilesystem())

      act(() => {
        result.current.clearEvents()
      })
      expect(result.current.watchEvents).toEqual([])
    })
  })

  it('should clean up fs event listener on unmount', async () => {
    const unsubscribe = jest.fn()
    ;(window.fs.getWatched as jest.Mock).mockResolvedValue([])
    ;(window.fs.onWatchEvent as jest.Mock).mockReturnValue(unsubscribe)

    const { unmount } = renderHook(() => useFilesystem())

    await waitFor(() => {
      expect(window.fs.onWatchEvent).toHaveBeenCalled()
    })

    unmount()
    expect(unsubscribe).toHaveBeenCalled()
  })
})
