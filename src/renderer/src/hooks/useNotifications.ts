import { useState, useCallback, useEffect } from 'react'

interface NotificationOptions {
  title: string
  body: string
  silent?: boolean
  urgency?: 'normal' | 'critical' | 'low'
}

interface NotificationResult {
  id: string
  title: string
  body: string
  timestamp: number
  action: 'clicked' | 'closed' | 'shown'
}

interface UseNotificationsReturn {
  isSupported: boolean
  log: NotificationResult[]
  error: string | null
  showNotification: (options: NotificationOptions) => Promise<void>
  clearLog: () => void
}

export function useNotifications(): UseNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false)
  const [log, setLog] = useState<NotificationResult[]>([])
  const [error, setError] = useState<string | null>(null)

  // Check if notifications are supported
  useEffect(() => {
    const checkSupport = async (): Promise<void> => {
      try {
        const supported = await window.api.notificationIsSupported()
        setIsSupported(supported)
      } catch (err) {
        console.error('Failed to check notification support:', err)
        setIsSupported(false)
      }
    }
    checkSupport()
  }, [])

  // Listen for notification events
  useEffect(() => {
    const unsubscribe = window.api.onNotificationEvent((result) => {
      setLog((prev) => [result, ...prev].slice(0, 100))
    })

    return unsubscribe
  }, [])

  const showNotification = useCallback(async (options: NotificationOptions): Promise<void> => {
    try {
      setError(null)
      await window.api.notificationShow(options)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to show notification'
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }, [])

  const clearLog = useCallback(() => {
    setLog([])
  }, [])

  return {
    isSupported,
    log,
    error,
    showNotification,
    clearLog
  }
}
