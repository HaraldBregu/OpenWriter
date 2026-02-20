/**
 * Tests for CronService.
 * Validates cron job management, scheduling, and Observable notifications.
 */

// Mock cron and cronstrue before importing the service
jest.mock('cron', () => {
  const mockJob = {
    start: jest.fn(),
    stop: jest.fn(),
    nextDate: jest.fn().mockReturnValue({
      toJSDate: () => new Date('2026-01-01T00:00:00Z')
    })
  }
  return {
    CronJob: jest.fn().mockImplementation((_schedule, onTick, _onComplete, autoStart) => {
      const job = { ...mockJob, start: jest.fn(), stop: jest.fn(), nextDate: mockJob.nextDate }
      if (autoStart) {
        job.start()
      }
      // Store onTick so tests can trigger it
      ;(job as Record<string, unknown>)._onTick = onTick
      return job
    })
  }
})

jest.mock('cronstrue', () => ({
  default: {
    toString: jest.fn().mockReturnValue('Every minute')
  },
  __esModule: true,
  toString: jest.fn().mockReturnValue('Every minute')
}))

import { CronService } from '../../../../src/main/services/cron'
import { CronJob } from 'cron'

describe('CronService', () => {
  let service: CronService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new CronService()
  })

  afterEach(() => {
    service.destroy()
  })

  describe('initialize', () => {
    it('should create default jobs', () => {
      service.initialize()
      // initialize creates 4 jobs
      expect(CronJob).toHaveBeenCalledTimes(4)
    })
  })

  describe('createJob', () => {
    it('should create a job and return true', () => {
      const result = service.createJob({
        id: 'test-job',
        name: 'Test Job',
        schedule: '* * * * *',
        enabled: false,
        runCount: 0,
        description: 'A test job'
      })
      expect(result).toBe(true)
      expect(CronJob).toHaveBeenCalled()
    })

    it('should return false for duplicate job id', () => {
      service.createJob({
        id: 'dup',
        name: 'Dup',
        schedule: '* * * * *',
        enabled: false,
        runCount: 0
      })
      const result = service.createJob({
        id: 'dup',
        name: 'Dup2',
        schedule: '*/5 * * * *',
        enabled: false,
        runCount: 0
      })
      expect(result).toBe(false)
    })

    it('should start the job if enabled=true', () => {
      service.createJob({
        id: 'auto-start',
        name: 'Auto',
        schedule: '* * * * *',
        enabled: true,
        runCount: 0
      })
      // CronJob constructor receives autoStart=true
      const constructorCalls = (CronJob as jest.Mock).mock.calls
      const lastCall = constructorCalls[constructorCalls.length - 1]
      expect(lastCall[3]).toBe(true) // 4th arg = autoStart
    })
  })

  describe('getAllJobs', () => {
    it('should return status of all jobs', () => {
      service.createJob({
        id: 'j1',
        name: 'Job 1',
        schedule: '* * * * *',
        enabled: false,
        runCount: 0,
        description: 'First'
      })
      service.createJob({
        id: 'j2',
        name: 'Job 2',
        schedule: '*/5 * * * *',
        enabled: true,
        runCount: 3,
        description: 'Second'
      })
      const jobs = service.getAllJobs()
      expect(jobs).toHaveLength(2)
      expect(jobs[0].id).toBe('j1')
      expect(jobs[1].id).toBe('j2')
    })
  })

  describe('getJob', () => {
    it('should return job status by id', () => {
      service.createJob({
        id: 'find-me',
        name: 'Find Me',
        schedule: '* * * * *',
        enabled: false,
        runCount: 0
      })
      const job = service.getJob('find-me')
      expect(job).not.toBeNull()
      expect(job!.name).toBe('Find Me')
    })

    it('should return null for non-existent job', () => {
      expect(service.getJob('nope')).toBeNull()
    })
  })

  describe('startJob', () => {
    it('should start an existing job and return true', () => {
      service.createJob({
        id: 'start-me',
        name: 'Start',
        schedule: '* * * * *',
        enabled: false,
        runCount: 0
      })
      const result = service.startJob('start-me')
      expect(result).toBe(true)
    })

    it('should return false for non-existent job', () => {
      expect(service.startJob('missing')).toBe(false)
    })
  })

  describe('stopJob', () => {
    it('should stop an existing job and return true', () => {
      service.createJob({
        id: 'stop-me',
        name: 'Stop',
        schedule: '* * * * *',
        enabled: true,
        runCount: 0
      })
      const result = service.stopJob('stop-me')
      expect(result).toBe(true)
    })

    it('should return false for non-existent job', () => {
      expect(service.stopJob('missing')).toBe(false)
    })
  })

  describe('deleteJob', () => {
    it('should stop and delete an existing job', () => {
      service.createJob({
        id: 'del-me',
        name: 'Delete',
        schedule: '* * * * *',
        enabled: false,
        runCount: 0
      })
      expect(service.deleteJob('del-me')).toBe(true)
      expect(service.getJob('del-me')).toBeNull()
    })

    it('should return false for non-existent job', () => {
      expect(service.deleteJob('missing')).toBe(false)
    })
  })

  describe('updateJobSchedule', () => {
    it('should create a new CronJob with updated schedule', () => {
      service.createJob({
        id: 'update-me',
        name: 'Update',
        schedule: '* * * * *',
        enabled: false,
        runCount: 0
      })
      const callCountBefore = (CronJob as jest.Mock).mock.calls.length
      const result = service.updateJobSchedule('update-me', '*/10 * * * *')
      expect(result).toBe(true)
      expect((CronJob as jest.Mock).mock.calls.length).toBe(callCountBefore + 1)
    })

    it('should return false for non-existent job', () => {
      expect(service.updateJobSchedule('missing', '*/10 * * * *')).toBe(false)
    })
  })

  describe('validateCronExpression', () => {
    it('should return valid=true for a valid expression', () => {
      const result = service.validateCronExpression('* * * * *')
      expect(result.valid).toBe(true)
      expect(result.description).toBeDefined()
    })

    it('should return valid=false for an invalid expression', () => {
      ;(CronJob as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Invalid cron expression')
      })
      const result = service.validateCronExpression('bad expression')
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('onJobResult', () => {
    it('should subscribe to job results via Observable', () => {
      const callback = jest.fn()
      const unsub = service.onJobResult(callback)
      expect(typeof unsub).toBe('function')
    })
  })

  describe('destroy', () => {
    it('should stop all jobs and clear subscribers', () => {
      service.createJob({
        id: 'cleanup',
        name: 'Cleanup',
        schedule: '* * * * *',
        enabled: true,
        runCount: 0
      })
      service.destroy()
      expect(service.getAllJobs()).toEqual([])
    })
  })
})
