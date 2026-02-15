export interface CronJobConfig {
  id: string
  name: string
  schedule: string
  enabled: boolean
  lastRun?: Date
  nextRun?: Date
  runCount: number
  description?: string
}

export interface CronJobResult {
  id: string
  timestamp: Date
  success: boolean
  message?: string
  data?: unknown
}

export interface CronJobStatus {
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
