/**
 * Tests for useMediaRecorder hook.
 * Handles MediaRecorder API for recording audio/video streams.
 */
import { renderHook, act } from '@testing-library/react'
import { useMediaRecorder, formatRecordingTime } from '../../../../src/renderer/src/hooks/useMediaRecorder'

describe('useMediaRecorder', () => {
  beforeEach(() => {
    // Provide a minimal MediaRecorder mock
    const MockMediaRecorder = jest.fn().mockImplementation(function (this: Record<string, unknown>) {
      this.state = 'inactive'
      this.start = jest.fn().mockImplementation(() => {
        this.state = 'recording'
      })
      this.stop = jest.fn().mockImplementation(() => {
        this.state = 'inactive'
        if (typeof this.onstop === 'function') {
          ;(this.onstop as () => void)()
        }
      })
      this.pause = jest.fn().mockImplementation(() => {
        this.state = 'paused'
      })
      this.resume = jest.fn().mockImplementation(() => {
        this.state = 'recording'
      })
      this.ondataavailable = null
      this.onstop = null
      this.onerror = null
      this.stream = { getTracks: () => [{ stop: jest.fn() }] }
      return this
    }) as unknown as typeof MediaRecorder

    // @ts-expect-error - mock isTypeSupported
    MockMediaRecorder.isTypeSupported = jest.fn().mockReturnValue(true)

    global.MediaRecorder = MockMediaRecorder
  })

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useMediaRecorder())

    expect(result.current.isRecording).toBe(false)
    expect(result.current.isPaused).toBe(false)
    expect(result.current.recordingTime).toBe(0)
    expect(result.current.recordedChunks).toEqual([])
    expect(result.current.recordedBlob).toBeNull()
    expect(result.current.error).toBeNull()
  })

  describe('startRecording', () => {
    it('should start recording from a stream', () => {
      const mockStream = {
        getTracks: () => [{ stop: jest.fn() }]
      } as unknown as MediaStream

      const { result } = renderHook(() => useMediaRecorder())

      act(() => {
        result.current.startRecording(mockStream)
      })

      expect(result.current.isRecording).toBe(true)
      expect(result.current.error).toBeNull()
    })

    it('should set error when no MIME type is supported', () => {
      // @ts-expect-error - mock
      MediaRecorder.isTypeSupported = jest.fn().mockReturnValue(false)

      const mockStream = {
        getTracks: () => [{ stop: jest.fn() }]
      } as unknown as MediaStream

      const { result } = renderHook(() => useMediaRecorder())

      act(() => {
        result.current.startRecording(mockStream)
      })

      expect(result.current.error).toBe('No supported MIME type found for recording')
    })
  })

  describe('clearRecording', () => {
    it('should reset all recording state', () => {
      const { result } = renderHook(() => useMediaRecorder())

      act(() => {
        result.current.clearRecording()
      })

      expect(result.current.recordedChunks).toEqual([])
      expect(result.current.recordedBlob).toBeNull()
      expect(result.current.recordingTime).toBe(0)
      expect(result.current.error).toBeNull()
    })
  })

  describe('downloadRecording', () => {
    it('should set error when no recording is available', () => {
      const { result } = renderHook(() => useMediaRecorder())

      act(() => {
        result.current.downloadRecording('test.webm')
      })

      expect(result.current.error).toBe('No recording available to download')
    })
  })
})

describe('formatRecordingTime', () => {
  it('should format 0 seconds', () => {
    expect(formatRecordingTime(0)).toBe('00:00')
  })

  it('should format seconds only', () => {
    expect(formatRecordingTime(45)).toBe('00:45')
  })

  it('should format minutes and seconds', () => {
    expect(formatRecordingTime(125)).toBe('02:05')
  })

  it('should format large values', () => {
    expect(formatRecordingTime(3661)).toBe('61:01')
  })
})
