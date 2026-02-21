/**
 * Example Component: Online Status Indicator
 *
 * Demonstrates how to use the AppContext for monitoring online status.
 * The online status is automatically tracked by the AppProvider.
 */

import { useOnlineStatus, useLastSyncTime } from '@/contexts'
import { Wifi, WifiOff, Cloud, CloudOff } from 'lucide-react'

export function OnlineStatusIndicatorExample() {
  const isOnline = useOnlineStatus()
  const lastSyncedAt = useLastSyncTime()

  const formatSyncTime = (timestamp: number | null): string => {
    if (!timestamp) return 'Never synced'

    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 60) return 'Synced just now'

    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `Synced ${minutes}m ago`

    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `Synced ${hours}h ago`

    const days = Math.floor(hours / 24)
    return `Synced ${days}d ago`
  }

  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border bg-card">
      {/* Connection Status */}
      <div className="flex items-center gap-2">
        {isOnline ? (
          <>
            <Wifi className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium text-green-600 dark:text-green-400">
              Online
            </span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium text-red-600 dark:text-red-400">
              Offline
            </span>
          </>
        )}
      </div>

      {/* Separator */}
      <div className="h-4 w-px bg-border" />

      {/* Sync Status */}
      <div className="flex items-center gap-2">
        {isOnline ? (
          <Cloud className="h-4 w-4 text-blue-500" />
        ) : (
          <CloudOff className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="text-sm text-muted-foreground">
          {formatSyncTime(lastSyncedAt)}
        </span>
      </div>
    </div>
  )
}

/**
 * Alternative: Compact Status Badge
 */
export function CompactOnlineStatus() {
  const isOnline = useOnlineStatus()

  return (
    <div className="flex items-center gap-2">
      <div
        className={`h-2 w-2 rounded-full ${
          isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'
        }`}
      />
      <span className="text-xs text-muted-foreground">
        {isOnline ? 'Online' : 'Offline'}
      </span>
    </div>
  )
}

/**
 * Alternative: Full Status Panel with Actions
 */
export function DetailedStatusPanel() {
  const isOnline = useOnlineStatus()
  const lastSyncedAt = useLastSyncTime()

  const handleRetryConnection = () => {
    // Your retry logic here
    console.log('Retrying connection...')
  }

  const handleForceSync = () => {
    // Your sync logic here
    console.log('Forcing sync...')
  }

  return (
    <div className="p-6 space-y-4 rounded-lg border bg-card">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Connection Status</h3>
        <div
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            isOnline
              ? 'bg-green-500/10 text-green-600 dark:text-green-400'
              : 'bg-red-500/10 text-red-600 dark:text-red-400'
          }`}
        >
          {isOnline ? 'Connected' : 'Disconnected'}
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Network Status:</span>
          <span className={isOnline ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Last Sync:</span>
          <span>
            {lastSyncedAt
              ? new Date(lastSyncedAt).toLocaleString()
              : 'Never'}
          </span>
        </div>
      </div>

      {!isOnline && (
        <div className="pt-4 border-t">
          <button
            onClick={handleRetryConnection}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      )}

      {isOnline && (
        <div className="pt-4 border-t">
          <button
            onClick={handleForceSync}
            className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors"
          >
            Sync Now
          </button>
        </div>
      )}
    </div>
  )
}
