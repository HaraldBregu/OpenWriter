import { useState } from 'react'
import { useMediaPermissions } from '../hooks/useMediaPermissions'
import { useMediaDevices } from '../hooks/useMediaDevices'

type DeviceType = 'audioinput' | 'videoinput'

/**
 * Demo component for testing media permissions and device enumeration
 * Displays permission status and allows requesting permissions
 */
export function MediaPermissionDemo() {
  const [selectedDeviceType, setSelectedDeviceType] = useState<DeviceType>('audioinput')

  const {
    microphoneStatus,
    cameraStatus,
    isLoading: permissionsLoading,
    error: permissionsError,
    requestMicrophone,
    requestCamera,
    checkPermissionStatus
  } = useMediaPermissions()

  const {
    devices,
    isLoading: devicesLoading,
    error: devicesError,
    refreshDevices
  } = useMediaDevices(selectedDeviceType)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'granted':
        return 'text-green-600 bg-green-100'
      case 'denied':
        return 'text-red-600 bg-red-100'
      case 'not-determined':
        return 'text-yellow-600 bg-yellow-100'
      case 'restricted':
        return 'text-orange-600 bg-orange-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Media Permissions Demo</h1>
        <p className="text-gray-600">
          Test microphone and camera permissions and device enumeration
        </p>
      </div>

      {/* Error Display */}
      {(permissionsError || devicesError) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-semibold">Error:</p>
          <p className="text-red-600">{permissionsError || devicesError}</p>
        </div>
      )}

      {/* Permission Status Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Permission Status</h2>

        <div className="space-y-4">
          {/* Microphone Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-4">
              <div className="text-2xl">🎤</div>
              <div>
                <p className="font-medium">Microphone</p>
                <p className={`text-sm px-2 py-1 rounded inline-block ${getStatusColor(microphoneStatus)}`}>
                  {microphoneStatus}
                </p>
              </div>
            </div>
            <button
              onClick={requestMicrophone}
              disabled={permissionsLoading || microphoneStatus === 'granted'}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                microphoneStatus === 'granted'
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700'
              } disabled:opacity-50`}
            >
              {microphoneStatus === 'granted' ? 'Granted' : 'Request Access'}
            </button>
          </div>

          {/* Camera Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-4">
              <div className="text-2xl">📷</div>
              <div>
                <p className="font-medium">Camera</p>
                <p className={`text-sm px-2 py-1 rounded inline-block ${getStatusColor(cameraStatus)}`}>
                  {cameraStatus}
                </p>
              </div>
            </div>
            <button
              onClick={requestCamera}
              disabled={permissionsLoading || cameraStatus === 'granted'}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                cameraStatus === 'granted'
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700'
              } disabled:opacity-50`}
            >
              {cameraStatus === 'granted' ? 'Granted' : 'Request Access'}
            </button>
          </div>
        </div>

        <button
          onClick={checkPermissionStatus}
          disabled={permissionsLoading}
          className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {permissionsLoading ? 'Checking...' : 'Refresh Status'}
        </button>
      </div>

      {/* Device Enumeration Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Available Devices</h2>

        {/* Device Type Selector */}
        <div className="flex space-x-2 mb-4">
          <button
            onClick={() => setSelectedDeviceType('audioinput')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedDeviceType === 'audioinput'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🎤 Microphones
          </button>
          <button
            onClick={() => setSelectedDeviceType('videoinput')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedDeviceType === 'videoinput'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📷 Cameras
          </button>
        </div>

        {/* Device List */}
        {devicesLoading ? (
          <div className="text-center py-8 text-gray-500">
            <p>Loading devices...</p>
          </div>
        ) : devices.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No devices found</p>
            <p className="text-sm mt-2">
              Make sure permissions are granted and devices are connected
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {devices.map((device, index) => (
              <div
                key={device.deviceId}
                className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {device.label || `Device ${index + 1}`}
                    </p>
                    <p className="text-sm text-gray-500">
                      ID: {device.deviceId.slice(0, 20)}...
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                    {device.kind}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={refreshDevices}
          disabled={devicesLoading}
          className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {devicesLoading ? 'Refreshing...' : 'Refresh Devices'}
        </button>
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> On macOS, requesting permissions will show a system dialog.
          On Windows and Linux, permissions are handled automatically when accessing devices.
          Device labels may be empty until permissions are granted.
        </p>
      </div>
    </div>
  )
}
