/**
 * Tests for useMediaPermissions hook.
 * Manages microphone/camera permission status and request flows.
 */
import { renderHook, act, waitFor } from '@testing-library/react'
import { useMediaPermissions } from '../../../../src/renderer/src/hooks/useMediaPermissions'

describe('useMediaPermissions', () => {
  it('should check permission status on mount', async () => {
    ;(window.api.getMicrophonePermissionStatus as jest.Mock).mockResolvedValue('granted')
    ;(window.api.getCameraPermissionStatus as jest.Mock).mockResolvedValue('denied')

    const { result } = renderHook(() => useMediaPermissions())

    await waitFor(() => {
      expect(result.current.microphoneStatus).toBe('granted')
    })

    expect(result.current.cameraStatus).toBe('denied')
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should set error when status check fails', async () => {
    ;(window.api.getMicrophonePermissionStatus as jest.Mock).mockRejectedValue(new Error('check fail'))

    const { result } = renderHook(() => useMediaPermissions())

    await waitFor(() => {
      expect(result.current.error).toBe('check fail')
    })

    expect(result.current.isLoading).toBe(false)
  })

  describe('requestMicrophone', () => {
    it('should request and update microphone status', async () => {
      ;(window.api.getMicrophonePermissionStatus as jest.Mock).mockResolvedValue('not-determined')
      ;(window.api.getCameraPermissionStatus as jest.Mock).mockResolvedValue('not-determined')
      ;(window.api.requestMicrophonePermission as jest.Mock).mockResolvedValue('granted')

      const { result } = renderHook(() => useMediaPermissions())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.requestMicrophone()
      })

      expect(result.current.microphoneStatus).toBe('granted')
      expect(result.current.isLoading).toBe(false)
    })

    it('should set error on request failure', async () => {
      ;(window.api.getMicrophonePermissionStatus as jest.Mock).mockResolvedValue('not-determined')
      ;(window.api.getCameraPermissionStatus as jest.Mock).mockResolvedValue('not-determined')
      ;(window.api.requestMicrophonePermission as jest.Mock).mockRejectedValue(new Error('mic fail'))

      const { result } = renderHook(() => useMediaPermissions())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.requestMicrophone()
      })

      expect(result.current.error).toBe('mic fail')
    })
  })

  describe('requestCamera', () => {
    it('should request and update camera status', async () => {
      ;(window.api.getMicrophonePermissionStatus as jest.Mock).mockResolvedValue('not-determined')
      ;(window.api.getCameraPermissionStatus as jest.Mock).mockResolvedValue('not-determined')
      ;(window.api.requestCameraPermission as jest.Mock).mockResolvedValue('denied')

      const { result } = renderHook(() => useMediaPermissions())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.requestCamera()
      })

      expect(result.current.cameraStatus).toBe('denied')
    })
  })

  describe('checkPermissionStatus', () => {
    it('should re-fetch both permission statuses', async () => {
      ;(window.api.getMicrophonePermissionStatus as jest.Mock).mockResolvedValue('not-determined')
      ;(window.api.getCameraPermissionStatus as jest.Mock).mockResolvedValue('not-determined')

      const { result } = renderHook(() => useMediaPermissions())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      ;(window.api.getMicrophonePermissionStatus as jest.Mock).mockResolvedValue('granted')
      ;(window.api.getCameraPermissionStatus as jest.Mock).mockResolvedValue('granted')

      await act(async () => {
        await result.current.checkPermissionStatus()
      })

      expect(result.current.microphoneStatus).toBe('granted')
      expect(result.current.cameraStatus).toBe('granted')
    })
  })
})
