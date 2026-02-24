import { useState, useEffect, useCallback } from 'react'

interface CronJobStatus {
  id: string
  name: string
  schedule: string
  enabled: boolean
  running: boolean
  lastRun?: Date
  nextRun?: Date
  runCount: number
  description?: string
  humanReadable?: string
}

interface CronJobResult {
  id: string
  timestamp: Date
  success: boolean
  message?: string
  data?: unknown
}

interface CronJobConfig {
  id: string
  name: string
  schedule: string
  enabled: boolean
  runCount: number
  description?: string
}

interface UseCronReturn {
  jobs: CronJobStatus[]
  lastResult: CronJobResult | null
  loading: boolean
  error: string | null
  refreshJobs: () => Promise<void>
  startJob: (id: string) => Promise<boolean>
  stopJob: (id: string) => Promise<boolean>
  deleteJob: (id: string) => Promise<boolean>
  createJob: (config: CronJobConfig) => Promise<boolean>
  updateSchedule: (id: string, schedule: string) => Promise<boolean>
  validateExpression: (expression: string) => Promise<{ valid: boolean; description?: string; error?: string }>
}

export function useCron(): UseCronReturn {
  const [jobs, setJobs] = useState<CronJobStatus[]>([])
  const [lastResult, setLastResult] = useState<CronJobResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshJobs = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)
      const data = await window.cron.getAll()
      setJobs(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch cron jobs'
      setError(message)
      console.error('Error fetching cron jobs:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const startJob = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null)
      const success = await window.cron.start(id)
      if (success) {
        await refreshJobs()
      }
      return success
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start job'
      setError(message)
      console.error('Error starting job:', err)
      return false
    }
  }, [refreshJobs])

  const stopJob = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null)
      const success = await window.cron.stop(id)
      if (success) {
        await refreshJobs()
      }
      return success
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to stop job'
      setError(message)
      console.error('Error stopping job:', err)
      return false
    }
  }, [refreshJobs])

  const deleteJob = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null)
      const success = await window.api.cronDeleteJob(id)
      if (success) {
        await refreshJobs()
      }
      return success
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete job'
      setError(message)
      console.error('Error deleting job:', err)
      return false
    }
  }, [refreshJobs])

  const createJob = useCallback(async (config: CronJobConfig): Promise<boolean> => {
    try {
      setError(null)
      const success = await window.api.cronCreateJob(config)
      if (success) {
        await refreshJobs()
      }
      return success
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create job'
      setError(message)
      console.error('Error creating job:', err)
      return false
    }
  }, [refreshJobs])

  const updateSchedule = useCallback(async (id: string, schedule: string): Promise<boolean> => {
    try {
      setError(null)
      const success = await window.api.cronUpdateSchedule(id, schedule)
      if (success) {
        await refreshJobs()
      }
      return success
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update schedule'
      setError(message)
      console.error('Error updating schedule:', err)
      return false
    }
  }, [refreshJobs])

  const validateExpression = useCallback(async (expression: string): Promise<{ valid: boolean; description?: string; error?: string }> => {
    try {
      return await window.api.cronValidateExpression(expression)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to validate expression'
      console.error('Error validating expression:', err)
      return { valid: false, error: message }
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    // Initial load
    refreshJobs()

    // Set up event listener for job results
    const cleanup = window.api.onCronJobResult((result) => {
      if (isMounted) {
        setLastResult(result)
        // Refresh jobs to get updated stats
        refreshJobs()
      }
    })

    return () => {
      isMounted = false
      cleanup()
    }
  }, [refreshJobs])

  return {
    jobs,
    lastResult,
    loading,
    error,
    refreshJobs,
    startJob,
    stopJob,
    deleteJob,
    createJob,
    updateSchedule,
    validateExpression
  }
}
