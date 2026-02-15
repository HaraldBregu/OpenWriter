import { ElectronAPI } from '@electron-toolkit/preload'

type MediaPermissionStatus = 'granted' | 'denied' | 'not-determined' | 'restricted'
type NetworkConnectionStatus = 'online' | 'offline' | 'unknown'

interface MediaDeviceInfo {
  deviceId: string
  kind: 'audioinput' | 'videoinput' | 'audiooutput'
  label: string
  groupId: string
}

interface NetworkInterfaceInfo {
  name: string
  family: 'IPv4' | 'IPv6'
  address: string
  netmask: string
  mac: string
  internal: boolean
  cidr: string | null
}

interface NetworkInfo {
  platform: string
  supported: boolean
  isOnline: boolean
  interfaceCount: number
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
      // Network
      networkIsSupported: () => Promise<boolean>
      networkGetConnectionStatus: () => Promise<NetworkConnectionStatus>
      networkGetInterfaces: () => Promise<NetworkInterfaceInfo[]>
      networkGetInfo: () => Promise<NetworkInfo>
      onNetworkStatusChange: (callback: (status: NetworkConnectionStatus) => void) => () => void
    }
  }
}
