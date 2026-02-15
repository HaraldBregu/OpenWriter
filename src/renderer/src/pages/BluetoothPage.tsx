import React, { useEffect, useState } from 'react'
import { useBluetooth } from '../hooks/useBluetooth'
import { Bluetooth, BluetoothConnected, BluetoothSearching, Wifi } from 'lucide-react'

const BluetoothPage: React.FC = () => {
  const {
    isSupported,
    isScanning,
    devices,
    connectedDevice,
    error,
    requestDevice,
    disconnectDevice
  } = useBluetooth()

  const [platformInfo, setPlatformInfo] = useState<{
    platform: string
    supported: boolean
    apiAvailable: boolean
  } | null>(null)

  useEffect(() => {
    const loadInfo = async () => {
      try {
        const info = await window.api.bluetoothGetInfo()
        setPlatformInfo(info)
      } catch (err) {
        console.error('Error loading Bluetooth info:', err)
      }
    }
    loadInfo()
  }, [])

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">📡 Bluetooth Manager</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Scan and connect to Bluetooth devices
        </p>
      </div>

      {/* Support Status */}
      {!isSupported && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="font-semibold text-yellow-800 dark:text-yellow-300">
            Bluetooth Not Available
          </p>
          <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
            {platformInfo
              ? `Platform: ${platformInfo.platform} - Web Bluetooth API might not be enabled`
              : 'Your browser or system does not support Bluetooth'}
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-300 font-semibold">Error:</p>
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Connected Device */}
      {connectedDevice && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/40 rounded-full">
                <BluetoothConnected className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-semibold text-green-800 dark:text-green-300">Connected Device</p>
                <p className="text-green-600 dark:text-green-400">{connectedDevice.name}</p>
                <p className="text-xs text-green-500 dark:text-green-500 font-mono">
                  ID: {connectedDevice.id}
                </p>
              </div>
            </div>
            <button
              onClick={disconnectDevice}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      {/* Scan Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            {isScanning ? (
              <>
                <BluetoothSearching className="h-5 w-5 animate-pulse text-blue-500" />
                Scanning...
              </>
            ) : (
              <>
                <Bluetooth className="h-5 w-5" />
                Available Devices
              </>
            )}
          </h2>
          <button
            onClick={requestDevice}
            disabled={!isSupported || isScanning}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            <Wifi className="h-4 w-4" />
            {isScanning ? 'Scanning...' : 'Scan Devices'}
          </button>
        </div>

        {/* Device List */}
        <div className="space-y-2">
          {devices.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Bluetooth className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No devices found</p>
              <p className="text-sm mt-2">Click "Scan Devices" to search for Bluetooth devices</p>
            </div>
          ) : (
            devices.map((device) => (
              <div
                key={device.id}
                className={`p-4 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                  connectedDevice?.id === device.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      connectedDevice?.id === device.id
                        ? 'bg-blue-100 dark:bg-blue-900/40'
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      {connectedDevice?.id === device.id ? (
                        <BluetoothConnected className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <Bluetooth className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{device.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {device.id}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {connectedDevice?.id === device.id && (
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs font-semibold rounded">
                        Connected
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Platform Information */}
      {platformInfo && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Platform Information</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Platform:</span>
              <span className="font-mono">{platformInfo.platform}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Bluetooth Supported:</span>
              <span className={platformInfo.supported ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                {platformInfo.supported ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Web Bluetooth API:</span>
              <span className={platformInfo.apiAvailable ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                {platformInfo.apiAvailable ? 'Available' : 'Not Available'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Browser Support:</span>
              <span className={isSupported ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                {isSupported ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>Note:</strong> Bluetooth support requires:
        </p>
        <ul className="text-sm text-blue-800 dark:text-blue-300 list-disc list-inside mt-2 space-y-1">
          <li>Web Bluetooth API enabled in your browser</li>
          <li>Bluetooth hardware available on your system</li>
          <li>Appropriate permissions granted</li>
          <li>HTTPS or localhost connection (security requirement)</li>
        </ul>
      </div>
    </div>
  )
}

export default BluetoothPage
