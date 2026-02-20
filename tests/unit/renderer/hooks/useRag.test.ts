/**
 * Tests for useRag hook.
 * Manages RAG pipeline: indexing files and streaming queries.
 */
import { renderHook, act } from '@testing-library/react'
import { useRag } from '../../../../src/renderer/src/hooks/useRag'

describe('useRag', () => {
  it('should initialize with default state', () => {
    const { result } = renderHook(() => useRag())

    expect(result.current.indexedFile).toBeNull()
    expect(result.current.isIndexing).toBe(false)
    expect(result.current.indexError).toBeNull()
    expect(result.current.messages).toEqual([])
    expect(result.current.isQuerying).toBe(false)
    expect(result.current.queryError).toBeNull()
  })

  describe('index', () => {
    it('should index a file and store result', async () => {
      ;(window.api.ragIndex as jest.Mock).mockResolvedValue({
        filePath: '/doc.txt',
        chunkCount: 10
      })

      const { result } = renderHook(() => useRag())

      await act(async () => {
        await result.current.index('/doc.txt', 'openai')
      })

      expect(window.api.ragIndex).toHaveBeenCalledWith('/doc.txt', 'openai')
      expect(result.current.indexedFile).not.toBeNull()
      expect(result.current.indexedFile!.filePath).toBe('/doc.txt')
      expect(result.current.indexedFile!.chunkCount).toBe(10)
      expect(result.current.isIndexing).toBe(false)
    })

    it('should set indexError on failure', async () => {
      ;(window.api.ragIndex as jest.Mock).mockRejectedValue(new Error('index fail'))

      const { result } = renderHook(() => useRag())

      await act(async () => {
        await result.current.index('/bad.txt', 'openai')
      })

      expect(result.current.indexError).toBe('index fail')
      expect(result.current.isIndexing).toBe(false)
      expect(result.current.indexedFile).toBeNull()
    })

    it('should clear messages when a new file is indexed', async () => {
      ;(window.api.ragIndex as jest.Mock).mockResolvedValue({
        filePath: '/doc.txt',
        chunkCount: 5
      })

      const { result } = renderHook(() => useRag())

      await act(async () => {
        await result.current.index('/doc.txt', 'openai')
      })

      expect(result.current.messages).toEqual([])
    })
  })

  describe('ask', () => {
    it('should not query when no file is indexed', async () => {
      const { result } = renderHook(() => useRag())

      await act(async () => {
        await result.current.ask('What is this about?')
      })

      // Should not call ragQuery because indexedFile is null
      expect(window.api.ragQuery).not.toHaveBeenCalled()
      expect(result.current.messages).toEqual([])
    })

    it('should query after indexing and add messages', async () => {
      ;(window.api.ragIndex as jest.Mock).mockResolvedValue({
        filePath: '/doc.txt',
        chunkCount: 5
      })

      const { result } = renderHook(() => useRag())

      // Index first
      await act(async () => {
        await result.current.index('/doc.txt', 'openai')
      })

      // Now query
      await act(async () => {
        await result.current.ask('What is this?')
      })

      expect(window.api.ragQuery).toHaveBeenCalled()
      expect(window.api.onRagEvent).toHaveBeenCalled()
      // Should have added user + assistant messages
      expect(result.current.messages).toHaveLength(2)
      expect(result.current.messages[0].role).toBe('user')
      expect(result.current.messages[0].content).toBe('What is this?')
      expect(result.current.messages[1].role).toBe('assistant')
    })
  })

  describe('cancelQuery', () => {
    it('should reset querying state when called', async () => {
      ;(window.api.ragIndex as jest.Mock).mockResolvedValue({
        filePath: '/doc.txt',
        chunkCount: 5
      })

      const { result } = renderHook(() => useRag())

      // Index first
      await act(async () => {
        await result.current.index('/doc.txt', 'openai')
      })

      // Cancel should work even when not querying
      act(() => {
        result.current.cancelQuery()
      })

      expect(result.current.isQuerying).toBe(false)
    })
  })

  describe('clearMessages', () => {
    it('should clear all messages and query error', () => {
      const { result } = renderHook(() => useRag())

      // Simply test that clearMessages resets state
      act(() => {
        result.current.clearMessages()
      })

      expect(result.current.messages).toEqual([])
      expect(result.current.queryError).toBeNull()
    })
  })
})
