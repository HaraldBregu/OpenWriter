export type NetworkConnectionStatus = 'online' | 'offline' | 'unknown'

export interface NetworkInterfaceInfo {
  name: string // Interface name (e.g., 'eth0', 'Wi-Fi')
  family: 'IPv4' | 'IPv6'
  address: string // IP address
  netmask: string // Subnet mask
  mac: string // MAC address
  internal: boolean // Is loopback/internal
  cidr: string | null // CIDR notation
}

export interface NetworkInfo {
  platform: string
  supported: boolean
  isOnline: boolean
  interfaceCount: number
}
