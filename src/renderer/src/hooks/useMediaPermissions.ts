import { useState, useEffect, useCallback } from 'react'

type MediaPermissionStatus = 'granted' | 'denied' | 'not-determined' | 'restricted'

interface UseMediaPermissionsReturn {
  microphoneStatus: MediaPermissionStatus
  cameraStatus: MediaPermissionStatus
  isLoading: boolean
  error: string | null
  requestMicrophone: () => Promise<void>
  requestCamera: () => Promise<void>
  checkPermissionStatus: () => Promise<void>
}

/**
 * React hook for managing media permissions (microphone and camera)
 * Provides status checking and permission request functionality
 */
export function useMediaPermissions(): UseMediaPermissionsReturn {
  const [microphoneStatus, setMicrophoneStatus] = useState<MediaPermissionStatus>('not-determined')
  const [cameraStatus, setCameraStatus] = useState<MediaPermissionStatus>('not-determined')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Check the current status of both microphone and camera permissions
   */
  const checkPermissionStatus = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [micStatus, camStatus] = await Promise.all([
        window.api.getMicrophonePermissionStatus(),
        window.api.getCameraPermissionStatus()
      ])

      setMicrophoneStatus(micStatus)
      setCameraStatus(camStatus)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check permission status'
      setError(errorMessage)
      console.error('Error checking permission status:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Request microphone permission from the user
   */
  const requestMicrophone = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const status = await window.api.requestMicrophonePermission()
      setMicrophoneStatus(status)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to request microphone permission'
      setError(errorMessage)
      console.error('Error requesting microphone permission:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Request camera permission from the user
   */
  const requestCamera = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const status = await window.api.requestCameraPermission()
      setCameraStatus(status)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to request camera permission'
      setError(errorMessage)
      console.error('Error requesting camera permission:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Check permission status on mount
  useEffect(() => {
    checkPermissionStatus()
  }, [checkPermissionStatus])

  return {
    microphoneStatus,
    cameraStatus,
    isLoading,
    error,
    requestMicrophone,
    requestCamera,
    checkPermissionStatus
  }
}
