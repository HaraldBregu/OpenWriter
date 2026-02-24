/**
 * Tests for useClipboard hook.
 * Wraps window.clipboard operations with loading/error state management.
 */
import { renderHook, act, waitFor } from '@testing-library/react'
import { useClipboard } from '../../../../src/renderer/src/hooks/useClipboard'

// window.clipboard is mocked globally via tests/setup/renderer.ts

describe('useClipboard', () => {
  it('should initialize with null content, no error, and not loading', () => {
    const { result } = renderHook(() => useClipboard())
    expect(result.current.content).toBeNull()
    expect(result.current.error).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  describe('writeText', () => {
    it('should write text and update content on success', async () => {
      ;(window.clipboard.writeText as jest.Mock).mockResolvedValue(true)
      const { result } = renderHook(() => useClipboard())

      let success: boolean = false
      await act(async () => {
        success = await result.current.writeText('hello')
      })

      expect(success).toBe(true)
      expect(window.clipboard.writeText).toHaveBeenCalledWith('hello')
      expect(result.current.content?.type).toBe('text')
      expect(result.current.content?.text).toBe('hello')
      expect(result.current.loading).toBe(false)
    })

    it('should set error on failure', async () => {
      ;(window.clipboard.writeText as jest.Mock).mockRejectedValue(new Error('denied'))
      const { result } = renderHook(() => useClipboard())

      let success: boolean = true
      await act(async () => {
        success = await result.current.writeText('fail')
      })

      expect(success).toBe(false)
      expect(result.current.error).toBe('denied')
      expect(result.current.loading).toBe(false)
    })
  })

  describe('readText', () => {
    it('should return text from clipboard', async () => {
      ;(window.clipboard.readText as jest.Mock).mockResolvedValue('clipboard text')
      const { result } = renderHook(() => useClipboard())

      let text = ''
      await act(async () => {
        text = await result.current.readText()
      })

      expect(text).toBe('clipboard text')
      expect(result.current.loading).toBe(false)
    })

    it('should return empty string and set error on failure', async () => {
      ;(window.clipboard.readText as jest.Mock).mockRejectedValue(new Error('read fail'))
      const { result } = renderHook(() => useClipboard())

      let text = 'not-empty'
      await act(async () => {
        text = await result.current.readText()
      })

      expect(text).toBe('')
      expect(result.current.error).toBe('read fail')
    })
  })

  describe('writeHTML', () => {
    it('should write HTML and update content on success', async () => {
      ;(window.clipboard.writeHTML as jest.Mock).mockResolvedValue(true)
      const { result } = renderHook(() => useClipboard())

      await act(async () => {
        await result.current.writeHTML('<b>bold</b>')
      })

      expect(result.current.content?.type).toBe('html')
      expect(result.current.content?.html).toBe('<b>bold</b>')
    })
  })

  describe('readHTML', () => {
    it('should return HTML from clipboard', async () => {
      ;(window.clipboard.readHTML as jest.Mock).mockResolvedValue('<p>test</p>')
      const { result } = renderHook(() => useClipboard())

      let html = ''
      await act(async () => {
        html = await result.current.readHTML()
      })

      expect(html).toBe('<p>test</p>')
    })
  })

  describe('clear', () => {
    it('should clear clipboard and reset content', async () => {
      ;(window.clipboard.writeText as jest.Mock).mockResolvedValue(true)
      ;(window.clipboard.clear as jest.Mock).mockResolvedValue(true)
      const { result } = renderHook(() => useClipboard())

      await act(async () => {
        await result.current.writeText('something')
      })
      expect(result.current.content).not.toBeNull()

      await act(async () => {
        await result.current.clear()
      })
      expect(result.current.content).toBeNull()
    })
  })

  describe('getContent', () => {
    it('should fetch and set clipboard content', async () => {
      const mockContent = { type: 'text' as const, text: 'fetched', timestamp: Date.now() }
      ;(window.clipboard.getContent as jest.Mock).mockResolvedValue(mockContent)
      const { result } = renderHook(() => useClipboard())

      await act(async () => {
        await result.current.getContent()
      })

      expect(result.current.content).toEqual(mockContent)
    })
  })

  describe('hasText / hasImage / hasHTML', () => {
    it('should delegate to window.clipboard', async () => {
      ;(window.clipboard.hasText as jest.Mock).mockResolvedValue(true)
      ;(window.clipboard.hasImage as jest.Mock).mockResolvedValue(false)
      ;(window.clipboard.hasHTML as jest.Mock).mockResolvedValue(true)

      const { result } = renderHook(() => useClipboard())

      let hasText = false, hasImage = true, hasHTML = false
      await act(async () => {
        hasText = await result.current.hasText()
        hasImage = await result.current.hasImage()
        hasHTML = await result.current.hasHTML()
      })

      expect(hasText).toBe(true)
      expect(hasImage).toBe(false)
      expect(hasHTML).toBe(true)
    })
  })
})
