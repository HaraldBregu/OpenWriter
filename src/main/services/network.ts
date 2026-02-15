import * as os from 'os'
import type {
  NetworkConnectionStatus,
  NetworkInterfaceInfo,
  NetworkInfo
} from '../types/network'

export class NetworkService {
  private statusCallback: ((status: NetworkConnectionStatus) => void) | null = null

  /**
   * Check if network operations are supported on this platform
   */
  isNetworkSupported(): boolean {
    // Network operations are supported on all platforms
    return true
  }

  /**
   * Get current online/offline status
   */
  async getConnectionStatus(): Promise<NetworkConnectionStatus> {
    try {
      // Check if we have any non-loopback network interfaces
      const interfaces = this.getNetworkInterfaces()
      const hasActiveInterfaces = interfaces.some(iface => !iface.internal)
      return hasActiveInterfaces ? 'online' : 'offline'
    } catch (error) {
      console.error('Error getting connection status:', error)
      return 'unknown'
    }
  }

  /**
   * Get all network interfaces with details
   */
  getNetworkInterfaces(): NetworkInterfaceInfo[] {
    try {
      const interfaces = os.networkInterfaces()
      const result: NetworkInterfaceInfo[] = []

      for (const [name, addresses] of Object.entries(interfaces)) {
        if (!addresses) continue

        for (const addr of addresses) {
          result.push({
            name,
            family: addr.family as 'IPv4' | 'IPv6',
            address: addr.address,
            netmask: addr.netmask,
            mac: addr.mac,
            internal: addr.internal,
            cidr: addr.cidr || null
          })
        }
      }

      return result
    } catch (error) {
      console.error('Error getting network interfaces:', error)
      return []
    }
  }

  /**
   * Get platform-specific network info
   */
  getNetworkInfo(): NetworkInfo {
    try {
      const interfaces = this.getNetworkInterfaces()
      // Check if we have any non-loopback interfaces
      const hasActiveInterfaces = interfaces.some(iface => !iface.internal)

      return {
        platform: process.platform,
        supported: this.isNetworkSupported(),
        isOnline: hasActiveInterfaces,
        interfaceCount: interfaces.length
      }
    } catch (error) {
      console.error('Error getting network info:', error)
      return {
        platform: process.platform,
        supported: false,
        isOnline: false,
        interfaceCount: 0
      }
    }
  }

  /**
   * Start monitoring connection changes
   */
  startMonitoring(callback: (status: NetworkConnectionStatus) => void): void {
    this.statusCallback = callback
  }

  /**
   * Stop monitoring connection changes
   */
  stopMonitoring(): void {
    this.statusCallback = null
  }

  /**
   * Notify status change (to be called by event listeners)
   */
  notifyStatusChange(isOnline: boolean): void {
    if (this.statusCallback) {
      this.statusCallback(isOnline ? 'online' : 'offline')
    }
  }
}
