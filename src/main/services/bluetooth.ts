import type { BluetoothPermissionStatus } from '../types/bluetooth'

/**
 * Service for managing Bluetooth permissions and device information
 * Note: Actual Bluetooth operations are handled in the renderer using Web Bluetooth API
 */
export class BluetoothService {
  /**
   * Check if Bluetooth is supported on this platform
   */
  isBluetoothSupported(): boolean {
    // Bluetooth is supported on macOS, Windows 10+, and Linux with BlueZ
    const platform = process.platform
    return platform === 'darwin' || platform === 'win32' || platform === 'linux'
  }

  /**
   * Get Bluetooth permission status
   * Note: Actual permission checking is done in renderer via Web Bluetooth API
   */
  async getBluetoothPermissionStatus(): Promise<BluetoothPermissionStatus> {
    try {
      if (!this.isBluetoothSupported()) {
        return 'not-supported'
      }

      // On macOS, we can check system preferences
      if (process.platform === 'darwin') {
        // Note: This would require additional native modules for full functionality
        // For now, we'll rely on Web Bluetooth API in renderer
        return 'prompt'
      }

      // On Windows and Linux, permissions are handled by the browser/Electron
      return 'prompt'
    } catch (error) {
      console.error('Error checking Bluetooth permission:', error)
      return 'not-supported'
    }
  }

  /**
   * Get platform-specific Bluetooth information
   */
  getBluetoothInfo(): {
    platform: string
    supported: boolean
    apiAvailable: boolean
  } {
    return {
      platform: process.platform,
      supported: this.isBluetoothSupported(),
      apiAvailable: true // Web Bluetooth API is available in Electron
    }
  }
}
