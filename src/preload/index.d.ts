import { ElectronAPI } from '@electron-toolkit/preload'

type MediaPermissionStatus = 'granted' | 'denied' | 'not-determined' | 'restricted'

interface MediaDeviceInfo {
  deviceId: string
  kind: 'audioinput' | 'videoinput' | 'audiooutput'
  label: string
  groupId: string
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      playSound: () => void
      onLanguageChange: (callback: (lng: string) => void) => () => void
      onThemeChange: (callback: (theme: string) => void) => () => void
      // Media permissions
      requestMicrophonePermission: () => Promise<MediaPermissionStatus>
      requestCameraPermission: () => Promise<MediaPermissionStatus>
      getMicrophonePermissionStatus: () => Promise<MediaPermissionStatus>
      getCameraPermissionStatus: () => Promise<MediaPermissionStatus>
      getMediaDevices: (type: 'audioinput' | 'videoinput') => Promise<MediaDeviceInfo[]>
      // Bluetooth
      bluetoothIsSupported: () => Promise<boolean>
      bluetoothGetPermissionStatus: () => Promise<string>
      bluetoothGetInfo: () => Promise<{ platform: string; supported: boolean; apiAvailable: boolean }>
    }
  }
}
