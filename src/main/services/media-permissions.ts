import { systemPreferences } from 'electron'
import type { MediaPermissionStatus, MediaDeviceInfo } from '../types/media'

/**
 * Service for managing media permissions (microphone and camera)
 * Handles platform-specific permission requests and device enumeration
 */
export class MediaPermissionsService {
  /**
   * Request microphone access permission
   * @returns Promise resolving to permission status
   */
  async requestMicrophonePermission(): Promise<MediaPermissionStatus> {
    try {
      if (process.platform === 'darwin') {
        // macOS uses systemPreferences API
        const status = systemPreferences.getMediaAccessStatus('microphone')
        if (status === 'not-determined') {
          // This will trigger the native macOS permission dialog
          const granted = await systemPreferences.askForMediaAccess('microphone')
          return granted ? 'granted' : 'denied'
        }
        return status as MediaPermissionStatus
      } else {
        // Windows and Linux use Chromium's permission system
        // Permissions are handled automatically when accessing devices
        return 'granted'
      }
    } catch (error) {
      console.error('Error requesting microphone permission:', error)
      return 'denied'
    }
  }

  /**
   * Request camera access permission
   * @returns Promise resolving to permission status
   */
  async requestCameraPermission(): Promise<MediaPermissionStatus> {
    try {
      if (process.platform === 'darwin') {
        // macOS uses systemPreferences API
        const status = systemPreferences.getMediaAccessStatus('camera')
        if (status === 'not-determined') {
          // This will trigger the native macOS permission dialog
          const granted = await systemPreferences.askForMediaAccess('camera')
          return granted ? 'granted' : 'denied'
        }
        return status as MediaPermissionStatus
      } else {
        // Windows and Linux use Chromium's permission system
        // Permissions are handled automatically when accessing devices
        return 'granted'
      }
    } catch (error) {
      console.error('Error requesting camera permission:', error)
      return 'denied'
    }
  }

  /**
   * Get current microphone permission status without requesting
   * @returns Current permission status
   */
  async getMicrophonePermissionStatus(): Promise<MediaPermissionStatus> {
    try {
      if (process.platform === 'darwin') {
        const status = systemPreferences.getMediaAccessStatus('microphone')
        return status as MediaPermissionStatus
      } else {
        // On Windows/Linux, assume granted (checked at device access time)
        return 'granted'
      }
    } catch (error) {
      console.error('Error getting microphone status:', error)
      return 'not-determined'
    }
  }

  /**
   * Get current camera permission status without requesting
   * @returns Current permission status
   */
  async getCameraPermissionStatus(): Promise<MediaPermissionStatus> {
    try {
      if (process.platform === 'darwin') {
        const status = systemPreferences.getMediaAccessStatus('camera')
        return status as MediaPermissionStatus
      } else {
        // On Windows/Linux, assume granted (checked at device access time)
        return 'granted'
      }
    } catch (error) {
      console.error('Error getting camera status:', error)
      return 'not-determined'
    }
  }

  /**
   * Get available media devices of specified type
   * @param _type - Device type ('audioinput' or 'videoinput')
   * @returns Promise resolving to array of media devices
   */
  async getMediaDevices(_type: 'audioinput' | 'videoinput'): Promise<MediaDeviceInfo[]> {
    try {
      // Note: This requires the renderer process to enumerate devices
      // This method is a placeholder for future implementation
      // In practice, device enumeration should be done in the renderer
      // using navigator.mediaDevices.enumerateDevices()
      return []
    } catch (error) {
      console.error('Error getting media devices:', error)
      return []
    }
  }
}
