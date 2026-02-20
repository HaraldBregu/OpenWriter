/**
 * Tests for useMediaStream hook.
 * Manages media stream capture from camera/microphone.
 */
import { renderHook, act } from '@testing-library/react'
import { useMediaStream } from '../../../../src/renderer/src/hooks/useMediaStream'

describe('useMediaStream', () => {
  const mockGetUserMedia = jest.fn()
  const mockStop = jest.fn()

  beforeEach(() => {
    mockGetUserMedia.mockClear()
    mockStop.mockClear()

    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: mockGetUserMedia,
        enumerateDevices: jest.fn().mockResolvedValue([])
      },
      writable: true,
      configurable: true
    })
  })

  it('should initialize with no stream', () => {
    const { result } = renderHook(() => useMediaStream())

    expect(result.current.stream).toBeNull()
    expect(result.current.isStreaming).toBe(false)
    expect(result.current.error).toBeNull()
  })

  describe('startStream', () => {
    it('should start a media stream', async () => {
      const mockStream = {
        getTracks: () => [{ stop: mockStop }]
      }
      mockGetUserMedia.mockResolvedValue(mockStream)

      const { result } = renderHook(() => useMediaStream())

      await act(async () => {
        await result.current.startStream({ audio: true })
      })

      expect(result.current.stream).toBe(mockStream)
      expect(result.current.isStreaming).toBe(true)
      expect(result.current.error).toBeNull()
    })

    it('should set permission denied error', async () => {
      const permError = new Error('Permission denied')
      permError.name = 'NotAllowedError'
      mockGetUserMedia.mockRejectedValue(permError)

      const { result } = renderHook(() => useMediaStream())

      await act(async () => {
        await result.current.startStream()
      })

      expect(result.current.error).toBe('Permission denied. Please grant camera/microphone access.')
      expect(result.current.isStreaming).toBe(false)
    })

    it('should set not found error', async () => {
      const notFoundError = new Error('No device')
      notFoundError.name = 'NotFoundError'
      mockGetUserMedia.mockRejectedValue(notFoundError)

      const { result } = renderHook(() => useMediaStream())

      await act(async () => {
        await result.current.startStream()
      })

      expect(result.current.error).toBe('No camera or microphone found.')
    })

    it('should set device in use error', async () => {
      const readableError = new Error('In use')
      readableError.name = 'NotReadableError'
      mockGetUserMedia.mockRejectedValue(readableError)

      const { result } = renderHook(() => useMediaStream())

      await act(async () => {
        await result.current.startStream()
      })

      expect(result.current.error).toBe('Device is already in use by another application.')
    })

    it('should set overconstrained error', async () => {
      const constraintError = new Error('Bad constraints')
      constraintError.name = 'OverconstrainedError'
      mockGetUserMedia.mockRejectedValue(constraintError)

      const { result } = renderHook(() => useMediaStream())

      await act(async () => {
        await result.current.startStream()
      })

      expect(result.current.error).toBe('Requested media constraints cannot be satisfied.')
    })

    it('should set type error for invalid constraints', async () => {
      const typeError = new Error('Invalid')
      typeError.name = 'TypeError'
      mockGetUserMedia.mockRejectedValue(typeError)

      const { result } = renderHook(() => useMediaStream())

      await act(async () => {
        await result.current.startStream()
      })

      expect(result.current.error).toBe('Invalid media constraints.')
    })

    it('should set generic error message for unknown errors', async () => {
      mockGetUserMedia.mockRejectedValue('unknown error')

      const { result } = renderHook(() => useMediaStream())

      await act(async () => {
        await result.current.startStream()
      })

      expect(result.current.error).toBe('Failed to access media devices')
    })
  })

  describe('stopStream', () => {
    it('should stop all tracks and clear stream', async () => {
      const mockStream = {
        getTracks: () => [{ stop: mockStop }, { stop: mockStop }]
      }
      mockGetUserMedia.mockResolvedValue(mockStream)

      const { result } = renderHook(() => useMediaStream())

      await act(async () => {
        await result.current.startStream()
      })

      expect(result.current.isStreaming).toBe(true)

      act(() => {
        result.current.stopStream()
      })

      expect(mockStop).toHaveBeenCalledTimes(2)
      expect(result.current.stream).toBeNull()
      expect(result.current.isStreaming).toBe(false)
    })

    it('should be a no-op when no stream is active', () => {
      const { result } = renderHook(() => useMediaStream())

      act(() => {
        result.current.stopStream()
      })

      expect(result.current.stream).toBeNull()
    })
  })

  it('should clean up stream on unmount', async () => {
    const mockStream = {
      getTracks: () => [{ stop: mockStop }]
    }
    mockGetUserMedia.mockResolvedValue(mockStream)

    const { result, unmount } = renderHook(() => useMediaStream())

    await act(async () => {
      await result.current.startStream()
    })

    unmount()
    expect(mockStop).toHaveBeenCalled()
  })
})
