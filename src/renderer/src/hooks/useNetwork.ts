import { useState, useEffect } from 'react'

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

type NetworkConnectionStatus = 'online' | 'offline' | 'unknown'

interface UseNetworkReturn {
  isSupported: boolean
  isOnline: boolean
  connectionStatus: NetworkConnectionStatus
  interfaces: NetworkInterfaceInfo[]
  networkInfo: NetworkInfo | null
  error: string | null
  refreshInterfaces: () => Promise<void>
  refreshStatus: () => Promise<void>
}

export function useNetwork(): UseNetworkReturn {
  const [isSupported, setIsSupported] = useState(false)
  const [isOnline, setIsOnline] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<NetworkConnectionStatus>('unknown')
  const [interfaces, setInterfaces] = useState<NetworkInterfaceInfo[]>([])
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refreshInterfaces = async (): Promise<void> => {
    try {
      setError(null)
      const data = await window.network.getInterfaces()
      setInterfaces(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch network interfaces'
      setError(message)
      console.error('Error fetching network interfaces:', err)
    }
  }

  const refreshStatus = async (): Promise<void> => {
    try {
      setError(null)
      const status = await window.api.networkGetConnectionStatus()
      setConnectionStatus(status)
      setIsOnline(status === 'online')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch connection status'
      setError(message)
      console.error('Error fetching connection status:', err)
    }
  }

  useEffect(() => {
    let isMounted = true

    const initialize = async (): Promise<void> => {
      try {
        // Check if network is supported
        const supported = await window.api.networkIsSupported()
        if (isMounted) {
          setIsSupported(supported)
        }

        if (!supported) {
          return
        }

        // Get network info
        const info = await window.api.networkGetInfo()
        if (isMounted) {
          setNetworkInfo(info)
          setIsOnline(info.isOnline)
        }

        // Get connection status
        const status = await window.api.networkGetConnectionStatus()
        if (isMounted) {
          setConnectionStatus(status)
        }

        // Get network interfaces
        const interfaceData = await window.api.networkGetInterfaces()
        if (isMounted) {
          setInterfaces(interfaceData)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to initialize network'
        if (isMounted) {
          setError(message)
        }
        console.error('Error initializing network:', err)
      }
    }

    initialize()

    // Set up event listener for status changes
    const cleanup = window.api.onNetworkStatusChange((status) => {
      if (isMounted) {
        setConnectionStatus(status)
        setIsOnline(status === 'online')
      }
    })

    return () => {
      isMounted = false
      cleanup()
    }
  }, [])

  return {
    isSupported,
    isOnline,
    connectionStatus,
    interfaces,
    networkInfo,
    error,
    refreshInterfaces,
    refreshStatus
  }
}
