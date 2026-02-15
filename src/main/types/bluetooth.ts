/**
 * Bluetooth device information
 */
export interface BluetoothDeviceInfo {
  id: string
  name: string
  connected: boolean
  paired: boolean
  type?: string
  rssi?: number
}

/**
 * Bluetooth scan result
 */
export interface BluetoothScanResult {
  devices: BluetoothDeviceInfo[]
  isScanning: boolean
}

/**
 * Bluetooth connection status
 */
export type BluetoothConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error'

/**
 * Bluetooth permission status
 */
export type BluetoothPermissionStatus = 'granted' | 'denied' | 'prompt' | 'not-supported'
