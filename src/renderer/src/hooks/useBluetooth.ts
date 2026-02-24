import { useState, useCallback, useEffect } from 'react'

interface BluetoothDevice {
  id: string
  name: string
  connected: boolean
}

interface UseBluetoothReturn {
  isSupported: boolean
  isScanning: boolean
  devices: BluetoothDevice[]
  connectedDevice: BluetoothDevice | null
  error: string | null
  startScan: () => Promise<void>
  stopScan: () => void
  connectDevice: (device: BluetoothDevice) => Promise<void>
  disconnectDevice: () => void
  requestDevice: () => Promise<void>
}

/**
 * React hook for managing Bluetooth devices using Web Bluetooth API
 */
export function useBluetooth(): UseBluetoothReturn {
  const [isSupported, setIsSupported] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [devices, setDevices] = useState<BluetoothDevice[]>([])
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [bluetoothDevice, setBluetoothDevice] = useState<BluetoothDevice | null>(null)

  /**
   * Check if Bluetooth is supported
   */
  useEffect(() => {
    const checkSupport = async () => {
      try {
        const supported = await window.bluetooth.isSupported()
        setIsSupported(supported && 'bluetooth' in navigator)
      } catch (err) {
        console.error('Error checking Bluetooth support:', err)
        setIsSupported(false)
      }
    }
    checkSupport()
  }, [])

  /**
   * Request a Bluetooth device using the browser's device picker
   */
  const requestDevice = useCallback(async () => {
    if (!navigator.bluetooth) {
      setError('Web Bluetooth API is not available')
      return
    }

    try {
      setError(null)
      setIsScanning(true)

      const device = await navigator.bluetooth.requestDevice({
        // acceptAllDevices: true,
        filters: [
          { services: ['battery_service'] },
          { services: ['heart_rate'] },
          { services: ['generic_access'] }
        ],
        optionalServices: ['battery_service', 'device_information']
      })

      const bluetoothDev: BluetoothDevice = {
        id: device.id,
        name: device.name || 'Unknown Device',
        connected: device.gatt?.connected || false
      }

      setDevices(prev => {
        const exists = prev.find(d => d.id === bluetoothDev.id)
        if (exists) return prev
        return [...prev, bluetoothDev]
      })

      // Auto-connect to the selected device
      if (device.gatt) {
        await device.gatt.connect()
        setConnectedDevice(bluetoothDev)
        setBluetoothDevice(bluetoothDev)
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'NotFoundError') {
          setError('No device selected')
        } else {
          setError(err.message)
        }
      } else {
        setError('Failed to request Bluetooth device')
      }
      console.error('Error requesting Bluetooth device:', err)
    } finally {
      setIsScanning(false)
    }
  }, [])

  /**
   * Start scanning for Bluetooth devices
   * Note: Web Bluetooth API doesn't support active scanning
   * Use requestDevice instead
   */
  const startScan = useCallback(async () => {
    await requestDevice()
  }, [requestDevice])

  /**
   * Stop scanning (no-op for Web Bluetooth API)
   */
  const stopScan = useCallback(() => {
    setIsScanning(false)
  }, [])

  /**
   * Connect to a Bluetooth device
   */
  const connectDevice = useCallback(async (device: BluetoothDevice) => {
    try {
      setError(null)
      // In Web Bluetooth API, connection is handled during requestDevice
      setConnectedDevice(device)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to device'
      setError(errorMessage)
      console.error('Error connecting to device:', err)
    }
  }, [])

  /**
   * Disconnect from the current device
   */
  const disconnectDevice = useCallback(() => {
    if (bluetoothDevice) {
      // Note: Actual disconnection would require storing the BluetoothRemoteGATTServer
      setConnectedDevice(null)
      setBluetoothDevice(null)
    }
  }, [bluetoothDevice])

  return {
    isSupported,
    isScanning,
    devices,
    connectedDevice,
    error,
    startScan,
    stopScan,
    connectDevice,
    disconnectDevice,
    requestDevice
  }
}
