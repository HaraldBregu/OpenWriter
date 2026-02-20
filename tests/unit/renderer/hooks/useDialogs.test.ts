/**
 * Tests for useDialogs hook.
 * Manages open/save/message/error dialogs with a log of results.
 */
import { renderHook, act } from '@testing-library/react'
import { useDialogs } from '../../../../src/renderer/src/hooks/useDialogs'

describe('useDialogs', () => {
  it('should initialize with empty log and no error', () => {
    const { result } = renderHook(() => useDialogs())
    expect(result.current.log).toEqual([])
    expect(result.current.error).toBeNull()
  })

  describe('showOpenDialog', () => {
    it('should call dialogOpen and push result to log', async () => {
      const mockResult = { type: 'open', timestamp: 1000, data: { filePaths: ['/a.txt'] } }
      ;(window.api.dialogOpen as jest.Mock).mockResolvedValue(mockResult)

      const { result } = renderHook(() => useDialogs())

      await act(async () => {
        await result.current.showOpenDialog()
      })

      expect(window.api.dialogOpen).toHaveBeenCalled()
      expect(result.current.log).toHaveLength(1)
      expect(result.current.log[0]).toEqual(mockResult)
    })

    it('should set error on failure', async () => {
      ;(window.api.dialogOpen as jest.Mock).mockRejectedValue(new Error('dialog failed'))

      const { result } = renderHook(() => useDialogs())

      await act(async () => {
        await result.current.showOpenDialog()
      })

      expect(result.current.error).toBe('dialog failed')
    })
  })

  describe('showSaveDialog', () => {
    it('should call dialogSave and push result to log', async () => {
      const mockResult = { type: 'save', timestamp: 2000, data: { filePath: '/b.txt' } }
      ;(window.api.dialogSave as jest.Mock).mockResolvedValue(mockResult)

      const { result } = renderHook(() => useDialogs())

      await act(async () => {
        await result.current.showSaveDialog()
      })

      expect(result.current.log).toHaveLength(1)
      expect(result.current.log[0].type).toBe('save')
    })
  })

  describe('showMessageBox', () => {
    it('should call dialogMessage with arguments', async () => {
      const mockResult = { type: 'message', timestamp: 3000, data: { response: 0 } }
      ;(window.api.dialogMessage as jest.Mock).mockResolvedValue(mockResult)

      const { result } = renderHook(() => useDialogs())

      await act(async () => {
        await result.current.showMessageBox('Title', 'Detail', ['OK', 'Cancel'])
      })

      expect(window.api.dialogMessage).toHaveBeenCalledWith('Title', 'Detail', ['OK', 'Cancel'])
      expect(result.current.log).toHaveLength(1)
    })
  })

  describe('showErrorDialog', () => {
    it('should call dialogError with title and content', async () => {
      const mockResult = { type: 'error', timestamp: 4000, data: {} }
      ;(window.api.dialogError as jest.Mock).mockResolvedValue(mockResult)

      const { result } = renderHook(() => useDialogs())

      await act(async () => {
        await result.current.showErrorDialog('Error Title', 'Error content')
      })

      expect(window.api.dialogError).toHaveBeenCalledWith('Error Title', 'Error content')
      expect(result.current.log).toHaveLength(1)
    })
  })

  describe('clearLog', () => {
    it('should clear the log', async () => {
      const mockResult = { type: 'open', timestamp: 1000, data: {} }
      ;(window.api.dialogOpen as jest.Mock).mockResolvedValue(mockResult)

      const { result } = renderHook(() => useDialogs())

      await act(async () => {
        await result.current.showOpenDialog()
      })
      expect(result.current.log).toHaveLength(1)

      act(() => {
        result.current.clearLog()
      })
      expect(result.current.log).toEqual([])
    })
  })

  describe('log limit', () => {
    it('should keep at most 50 entries', async () => {
      const mockResult = { type: 'open', timestamp: 1000, data: {} }
      ;(window.api.dialogOpen as jest.Mock).mockResolvedValue(mockResult)

      const { result } = renderHook(() => useDialogs())

      for (let i = 0; i < 55; i++) {
        await act(async () => {
          await result.current.showOpenDialog()
        })
      }

      expect(result.current.log.length).toBeLessThanOrEqual(50)
    })
  })
})
