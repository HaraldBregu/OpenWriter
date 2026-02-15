import { useState, useEffect, useCallback } from 'react'

interface MediaDeviceInfo {
  deviceId: string
  kind: 'audioinput' | 'videoinput' | 'audiooutput'
  label: string
  groupId: string
}

interface UseMediaDevicesReturn {
  devices: MediaDeviceInfo[]
  isLoading: boolean
  error: string | null
  refreshDevices: () => Promise<void>
}

/**
 * React hook for enumerating available media devices
 * @param type - Type of devices to enumerate ('audioinput' or 'videoinput')
 */
export function useMediaDevices(
  type: 'audioinput' | 'videoinput'
): UseMediaDevicesReturn {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch and enumerate media devices using the native Web API
   */
  const refreshDevices = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Use the native navigator.mediaDevices API for device enumeration
      // This is more reliable than going through the main process
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        throw new Error('Media devices API not available')
      }

      const allDevices = await navigator.mediaDevices.enumerateDevices()
      const filteredDevices = allDevices
        .filter(device => device.kind === type)
        .map(device => ({
          deviceId: device.deviceId,
          kind: device.kind as 'audioinput' | 'videoinput' | 'audiooutput',
          label: device.label || `${type === 'audioinput' ? 'Microphone' : 'Camera'} ${device.deviceId.slice(0, 8)}`,
          groupId: device.groupId
        }))

      setDevices(filteredDevices)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to enumerate devices'
      setError(errorMessage)
      console.error('Error enumerating devices:', err)
    } finally {
      setIsLoading(false)
    }
  }, [type])

  // Fetch devices on mount and when type changes
  useEffect(() => {
    refreshDevices()
  }, [refreshDevices])

  return {
    devices,
    isLoading,
    error,
    refreshDevices
  }
}
