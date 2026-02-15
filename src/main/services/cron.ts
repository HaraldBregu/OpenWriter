import { CronJob } from 'cron'
import cronstrue from 'cronstrue'
import type { CronJobConfig, CronJobStatus, CronJobResult } from '../types/cron'

export class CronService {
  private jobs: Map<string, { config: CronJobConfig; job: CronJob }> = new Map()
  private resultCallback: ((result: CronJobResult) => void) | null = null

  /**
   * Initialize default cron jobs
   */
  initialize(): void {
    // Create a default job that updates every minute
    this.createJob({
      id: 'update-time',
      name: 'Time Update',
      schedule: '* * * * *', // Every minute
      enabled: true,
      runCount: 0,
      description: 'Updates current time every minute'
    })

    // Create a job that runs every 5 minutes
    this.createJob({
      id: 'heartbeat',
      name: 'System Heartbeat',
      schedule: '*/5 * * * *', // Every 5 minutes
      enabled: false,
      runCount: 0,
      description: 'System health check every 5 minutes'
    })

    // Create a daily job
    this.createJob({
      id: 'daily-summary',
      name: 'Daily Summary',
      schedule: '0 9 * * *', // Every day at 9 AM
      enabled: false,
      runCount: 0,
      description: 'Generate daily summary report'
    })
  }

  /**
   * Create a new cron job
   */
  createJob(config: CronJobConfig): boolean {
    try {
      if (this.jobs.has(config.id)) {
        console.warn(`Cron job with id ${config.id} already exists`)
        return false
      }

      const job = new CronJob(
        config.schedule,
        () => this.executeJob(config.id),
        null,
        config.enabled,
        'America/New_York'
      )

      this.jobs.set(config.id, { config, job })

      if (config.enabled) {
        job.start()
      }

      return true
    } catch (error) {
      console.error(`Error creating cron job ${config.id}:`, error)
      return false
    }
  }

  /**
   * Execute a cron job
   */
  private executeJob(id: string): void {
    const jobData = this.jobs.get(id)
    if (!jobData) return

    const { config } = jobData
    const now = new Date()

    // Update job statistics
    config.lastRun = now
    config.runCount++

    // Execute job-specific logic
    let result: CronJobResult
    try {
      switch (id) {
        case 'update-time':
          result = {
            id,
            timestamp: now,
            success: true,
            message: 'Time updated successfully',
            data: {
              time: now.toISOString(),
              formatted: now.toLocaleString()
            }
          }
          break

        case 'heartbeat':
          result = {
            id,
            timestamp: now,
            success: true,
            message: 'System is healthy',
            data: {
              uptime: process.uptime(),
              memory: process.memoryUsage()
            }
          }
          break

        case 'daily-summary':
          result = {
            id,
            timestamp: now,
            success: true,
            message: 'Daily summary generated',
            data: {
              date: now.toDateString(),
              jobsRun: this.getAllJobs().reduce((sum, j) => sum + j.runCount, 0)
            }
          }
          break

        default:
          result = {
            id,
            timestamp: now,
            success: true,
            message: 'Job executed successfully'
          }
      }

      // Notify renderer process
      if (this.resultCallback) {
        this.resultCallback(result)
      }
    } catch (error) {
      console.error(`Error executing job ${id}:`, error)
      result = {
        id,
        timestamp: now,
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      }

      if (this.resultCallback) {
        this.resultCallback(result)
      }
    }
  }

  /**
   * Get all cron jobs
   */
  getAllJobs(): CronJobStatus[] {
    const jobs: CronJobStatus[] = []

    this.jobs.forEach(({ config, job }) => {
      try {
        jobs.push({
          id: config.id,
          name: config.name,
          schedule: config.schedule,
          enabled: config.enabled,
          running: config.enabled, // Job is running if it's enabled
          lastRun: config.lastRun,
          nextRun: job.nextDate().toJSDate(),
          runCount: config.runCount,
          description: config.description,
          humanReadable: cronstrue.toString(config.schedule)
        })
      } catch (error) {
        console.error(`Error getting status for job ${config.id}:`, error)
      }
    })

    return jobs
  }

  /**
   * Get a specific cron job
   */
  getJob(id: string): CronJobStatus | null {
    const jobData = this.jobs.get(id)
    if (!jobData) return null

    const { config, job } = jobData

    try {
      return {
        id: config.id,
        name: config.name,
        schedule: config.schedule,
        enabled: config.enabled,
        running: config.enabled, // Job is running if it's enabled
        lastRun: config.lastRun,
        nextRun: job.nextDate().toJSDate(),
        runCount: config.runCount,
        description: config.description,
        humanReadable: cronstrue.toString(config.schedule)
      }
    } catch (error) {
      console.error(`Error getting job ${id}:`, error)
      return null
    }
  }

  /**
   * Start a cron job
   */
  startJob(id: string): boolean {
    const jobData = this.jobs.get(id)
    if (!jobData) return false

    try {
      jobData.config.enabled = true
      jobData.job.start()
      return true
    } catch (error) {
      console.error(`Error starting job ${id}:`, error)
      return false
    }
  }

  /**
   * Stop a cron job
   */
  stopJob(id: string): boolean {
    const jobData = this.jobs.get(id)
    if (!jobData) return false

    try {
      jobData.config.enabled = false
      jobData.job.stop()
      return true
    } catch (error) {
      console.error(`Error stopping job ${id}:`, error)
      return false
    }
  }

  /**
   * Delete a cron job
   */
  deleteJob(id: string): boolean {
    const jobData = this.jobs.get(id)
    if (!jobData) return false

    try {
      jobData.job.stop()
      this.jobs.delete(id)
      return true
    } catch (error) {
      console.error(`Error deleting job ${id}:`, error)
      return false
    }
  }

  /**
   * Update a cron job's schedule
   */
  updateJobSchedule(id: string, schedule: string): boolean {
    const jobData = this.jobs.get(id)
    if (!jobData) return false

    try {
      const wasRunning = jobData.config.enabled
      jobData.job.stop()

      // Create new job with updated schedule
      const newJob = new CronJob(
        schedule,
        () => this.executeJob(id),
        null,
        wasRunning,
        'America/New_York'
      )

      jobData.config.schedule = schedule
      jobData.job = newJob

      if (wasRunning) {
        newJob.start()
      }

      return true
    } catch (error) {
      console.error(`Error updating job ${id}:`, error)
      return false
    }
  }

  /**
   * Validate cron expression
   */
  validateCronExpression(expression: string): { valid: boolean; description?: string; error?: string } {
    try {
      // Try to create a temporary job to validate
      const testJob = new CronJob(expression, () => {}, null, false)
      testJob.stop()

      const description = cronstrue.toString(expression)
      return { valid: true, description }
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid cron expression'
      }
    }
  }

  /**
   * Set callback for job results
   */
  onJobResult(callback: (result: CronJobResult) => void): void {
    this.resultCallback = callback
  }

  /**
   * Clean up all jobs
   */
  destroy(): void {
    this.jobs.forEach(({ job }) => job.stop())
    this.jobs.clear()
    this.resultCallback = null
  }
}
