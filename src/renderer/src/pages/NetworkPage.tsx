import React from 'react'
import { useNetwork } from '../hooks/useNetwork'
import { Wifi, Globe, RefreshCw, Check, X, Signal } from 'lucide-react'

const NetworkPage: React.FC = () => {
  const {
    isSupported,
    isOnline,
    connectionStatus,
    interfaces,
    networkInfo,
    error,
    refreshInterfaces,
    refreshStatus
  } = useNetwork()

  const handleRefresh = async () => {
    await Promise.all([refreshInterfaces(), refreshStatus()])
  }

  // Group interfaces by name and filter out internal/loopback
  const activeInterfaces = interfaces.filter((iface) => !iface.internal)
  const loopbackInterfaces = interfaces.filter((iface) => iface.internal)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">🌐 Network Manager</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Monitor internet connectivity and network interfaces
        </p>
      </div>

      {/* Support Status */}
      {!isSupported && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="font-semibold text-yellow-800 dark:text-yellow-300">
            Network Monitoring Not Available
          </p>
          <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
            Your system does not support network monitoring
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

      {/* Connection Status Card */}
      <div
        className={`border rounded-lg p-6 ${
          isOnline
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`p-3 rounded-full ${
                isOnline
                  ? 'bg-green-100 dark:bg-green-900/40'
                  : 'bg-red-100 dark:bg-red-900/40'
              }`}
            >
              {isOnline ? (
                <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
              ) : (
                <X className="h-6 w-6 text-red-600 dark:text-red-400" />
              )}
            </div>
            <div>
              <p className="font-semibold text-lg">
                Connection Status:{' '}
                <span
                  className={
                    isOnline
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }
                >
                  {connectionStatus.toUpperCase()}
                </span>
              </p>
              <p
                className={`text-sm ${
                  isOnline
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {isOnline
                  ? 'Your device is connected to the internet'
                  : 'No internet connection detected'}
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Active Network Interfaces */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Signal className="h-5 w-5" />
          Active Network Interfaces
        </h2>

        <div className="space-y-3">
          {activeInterfaces.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Globe className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No active network interfaces found</p>
              <p className="text-sm mt-2">Check your network connections</p>
            </div>
          ) : (
            activeInterfaces.map((iface, idx) => (
              <div
                key={`${iface.name}-${iface.family}-${idx}`}
                className="p-4 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                      <Wifi className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-semibold text-lg">{iface.name}</p>
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded">
                          {iface.family}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">IP Address:</span>
                          <p className="font-mono font-medium">{iface.address}</p>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">MAC Address:</span>
                          <p className="font-mono font-medium">{iface.mac}</p>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Netmask:</span>
                          <p className="font-mono font-medium">{iface.netmask}</p>
                        </div>
                        {iface.cidr && (
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">CIDR:</span>
                            <p className="font-mono font-medium">{iface.cidr}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs font-semibold rounded">
                    Active
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Loopback Interfaces (Optional) */}
      {loopbackInterfaces.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Loopback Interfaces</h2>
          <div className="space-y-2">
            {loopbackInterfaces.map((iface, idx) => (
              <div
                key={`${iface.name}-${iface.family}-${idx}`}
                className="p-3 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/30"
              >
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-mono font-medium">{iface.name}</span>
                    <span className="mx-2 text-gray-400">•</span>
                    <span className="text-gray-600 dark:text-gray-400">{iface.family}</span>
                    <span className="mx-2 text-gray-400">•</span>
                    <span className="font-mono">{iface.address}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                    Internal
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Platform Information */}
      {networkInfo && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Platform Information</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Platform:</span>
              <span className="font-mono">{networkInfo.platform}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Network Supported:</span>
              <span
                className={
                  networkInfo.supported
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }
              >
                {networkInfo.supported ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Online Status:</span>
              <span
                className={
                  networkInfo.isOnline
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }
              >
                {networkInfo.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Total Interfaces:</span>
              <span className="font-mono">{networkInfo.interfaceCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Active Interfaces:</span>
              <span className="font-mono">{activeInterfaces.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>Note:</strong> Network monitoring provides:
        </p>
        <ul className="text-sm text-blue-800 dark:text-blue-300 list-disc list-inside mt-2 space-y-1">
          <li>Real-time connection status updates</li>
          <li>Details of all network interfaces (Wi-Fi, Ethernet, etc.)</li>
          <li>IP addresses, MAC addresses, and subnet information</li>
          <li>Platform-specific network information</li>
          <li>Read-only access (cannot modify network settings)</li>
        </ul>
      </div>
    </div>
  )
}

export default NetworkPage
