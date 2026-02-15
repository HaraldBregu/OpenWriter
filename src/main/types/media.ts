/**
 * Media permission status values
 */
export type MediaPermissionStatus = 'granted' | 'denied' | 'not-determined' | 'restricted'

/**
 * Media device information
 */
export interface MediaDeviceInfo {
  deviceId: string
  kind: 'audioinput' | 'videoinput' | 'audiooutput'
  label: string
  groupId: string
}

/**
 * Media type for permission requests
 */
export type MediaType = 'microphone' | 'camera'
