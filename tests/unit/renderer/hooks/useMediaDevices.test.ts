/**
 * Tests for useMediaDevices hook.
 * Enumerates available media devices using the Web API.
 */
import { renderHook, act, waitFor } from '@testing-library/react'
import { useMediaDevices } from '../../../../src/renderer/src/hooks/useMediaDevices'

describe('useMediaDevices', () => {
  const mockEnumerateDevices = jest.fn()

  beforeEach(() => {
    // Set up navigator.mediaDevices mock
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        enumerateDevices: mockEnumerateDevices,
        getUserMedia: jest.fn()
      },
      writable: true,
      configurable: true
    })
    mockEnumerateDevices.mockClear()
  })

  it('should enumerate audio input devices on mount', async () => {
    mockEnumerateDevices.mockResolvedValue([
      { deviceId: 'mic-1', kind: 'audioinput', label: 'Mic 1', groupId: 'g1' },
      { deviceId: 'cam-1', kind: 'videoinput', label: 'Camera 1', groupId: 'g2' },
      { deviceId: 'mic-2', kind: 'audioinput', label: 'Mic 2', groupId: 'g3' }
    ])

    const { result } = renderHook(() => useMediaDevices('audioinput'))

    await waitFor(() => {
      expect(result.current.devices).toHaveLength(2)
    })

    expect(result.current.devices[0].deviceId).toBe('mic-1')
    expect(result.current.devices[1].deviceId).toBe('mic-2')
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should enumerate video input devices on mount', async () => {
    mockEnumerateDevices.mockResolvedValue([
      { deviceId: 'mic-1', kind: 'audioinput', label: 'Mic 1', groupId: 'g1' },
      { deviceId: 'cam-1', kind: 'videoinput', label: 'Camera 1', groupId: 'g2' }
    ])

    const { result } = renderHook(() => useMediaDevices('videoinput'))

    await waitFor(() => {
      expect(result.current.devices).toHaveLength(1)
    })

    expect(result.current.devices[0].deviceId).toBe('cam-1')
  })

  it('should provide fallback label when device label is empty', async () => {
    mockEnumerateDevices.mockResolvedValue([
      { deviceId: 'mic-12345678-more', kind: 'audioinput', label: '', groupId: 'g1' }
    ])

    const { result } = renderHook(() => useMediaDevices('audioinput'))

    await waitFor(() => {
      expect(result.current.devices).toHaveLength(1)
    })

    expect(result.current.devices[0].label).toContain('Microphone')
  })

  it('should set error when mediaDevices API is not available', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: undefined,
      writable: true,
      configurable: true
    })

    const { result } = renderHook(() => useMediaDevices('audioinput'))

    await waitFor(() => {
      expect(result.current.error).toBe('Media devices API not available')
    })

    expect(result.current.isLoading).toBe(false)
  })

  it('should set error when enumeration fails', async () => {
    mockEnumerateDevices.mockRejectedValue(new Error('enum fail'))

    const { result } = renderHook(() => useMediaDevices('audioinput'))

    await waitFor(() => {
      expect(result.current.error).toBe('enum fail')
    })

    expect(result.current.isLoading).toBe(false)
  })

  describe('refreshDevices', () => {
    it('should re-enumerate devices', async () => {
      mockEnumerateDevices
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { deviceId: 'mic-1', kind: 'audioinput', label: 'Mic 1', groupId: 'g1' }
        ])

      const { result } = renderHook(() => useMediaDevices('audioinput'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.devices).toHaveLength(0)

      await act(async () => {
        await result.current.refreshDevices()
      })

      expect(result.current.devices).toHaveLength(1)
    })
  })
})
