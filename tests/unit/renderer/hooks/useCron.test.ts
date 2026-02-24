/**
 * Tests for useCron hook.
 * Manages cron job CRUD, scheduling, and result event subscription.
 * The hook uses window.cron.* namespace.
 */
import { renderHook, act, waitFor } from '@testing-library/react'
import { useCron } from '../../../../src/renderer/src/hooks/useCron'

describe('useCron', () => {
  it('should fetch all jobs on mount', async () => {
    const jobs = [
      { id: '1', name: 'Backup', schedule: '0 * * * *', enabled: true, running: false, runCount: 3 }
    ]
    ;(window.cron.getAll as jest.Mock).mockResolvedValue(jobs)

    const { result } = renderHook(() => useCron())

    await waitFor(() => {
      expect(result.current.jobs).toEqual(jobs)
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.lastResult).toBeNull()
  })

  it('should set error when initial fetch fails', async () => {
    ;(window.cron.getAll as jest.Mock).mockRejectedValue(new Error('fetch fail'))

    const { result } = renderHook(() => useCron())

    await waitFor(() => {
      expect(result.current.error).toBe('fetch fail')
    })

    expect(result.current.loading).toBe(false)
  })

  describe('startJob', () => {
    it('should start a job and refresh', async () => {
      ;(window.cron.getAll as jest.Mock).mockResolvedValue([])
      ;(window.cron.start as jest.Mock).mockResolvedValue(true)

      const { result } = renderHook(() => useCron())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let success = false
      await act(async () => {
        success = await result.current.startJob('job-1')
      })

      expect(success).toBe(true)
      expect(window.cron.start).toHaveBeenCalledWith('job-1')
    })

    it('should return false on failure', async () => {
      ;(window.cron.getAll as jest.Mock).mockResolvedValue([])
      ;(window.cron.start as jest.Mock).mockRejectedValue(new Error('start fail'))

      const { result } = renderHook(() => useCron())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let success = true
      await act(async () => {
        success = await result.current.startJob('job-1')
      })

      expect(success).toBe(false)
      expect(result.current.error).toBe('start fail')
    })
  })

  describe('stopJob', () => {
    it('should stop a job and refresh', async () => {
      ;(window.cron.getAll as jest.Mock).mockResolvedValue([])
      ;(window.cron.stop as jest.Mock).mockResolvedValue(true)

      const { result } = renderHook(() => useCron())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let success = false
      await act(async () => {
        success = await result.current.stopJob('job-1')
      })

      expect(success).toBe(true)
      expect(window.cron.stop).toHaveBeenCalledWith('job-1')
    })

    it('should return false on failure', async () => {
      ;(window.cron.getAll as jest.Mock).mockResolvedValue([])
      ;(window.cron.stop as jest.Mock).mockRejectedValue(new Error('stop fail'))

      const { result } = renderHook(() => useCron())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let success = true
      await act(async () => {
        success = await result.current.stopJob('job-1')
      })

      expect(success).toBe(false)
      expect(result.current.error).toBe('stop fail')
    })
  })

  describe('deleteJob', () => {
    it('should delete a job and refresh', async () => {
      ;(window.cron.getAll as jest.Mock).mockResolvedValue([])
      ;(window.cron.delete as jest.Mock).mockResolvedValue(true)

      const { result } = renderHook(() => useCron())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let success = false
      await act(async () => {
        success = await result.current.deleteJob('job-1')
      })

      expect(success).toBe(true)
      expect(window.cron.delete).toHaveBeenCalledWith('job-1')
    })

    it('should return false on failure', async () => {
      ;(window.cron.getAll as jest.Mock).mockResolvedValue([])
      ;(window.cron.delete as jest.Mock).mockRejectedValue(new Error('delete fail'))

      const { result } = renderHook(() => useCron())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let success = true
      await act(async () => {
        success = await result.current.deleteJob('job-1')
      })

      expect(success).toBe(false)
      expect(result.current.error).toBe('delete fail')
    })
  })

  describe('createJob', () => {
    it('should create a job and refresh', async () => {
      ;(window.cron.getAll as jest.Mock).mockResolvedValue([])
      ;(window.cron.create as jest.Mock).mockResolvedValue(true)

      const { result } = renderHook(() => useCron())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const config = { id: 'new', name: 'New Job', schedule: '*/5 * * * *', enabled: true, runCount: 0 }

      let success = false
      await act(async () => {
        success = await result.current.createJob(config)
      })

      expect(success).toBe(true)
      expect(window.cron.create).toHaveBeenCalledWith(config)
    })

    it('should return false on failure', async () => {
      ;(window.cron.getAll as jest.Mock).mockResolvedValue([])
      ;(window.cron.create as jest.Mock).mockRejectedValue(new Error('create fail'))

      const { result } = renderHook(() => useCron())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let success = true
      await act(async () => {
        success = await result.current.createJob({ id: 'x', name: 'X', schedule: '* * * * *', enabled: true, runCount: 0 })
      })

      expect(success).toBe(false)
      expect(result.current.error).toBe('create fail')
    })
  })

  describe('updateSchedule', () => {
    it('should update schedule and refresh', async () => {
      ;(window.cron.getAll as jest.Mock).mockResolvedValue([])
      ;(window.cron.updateSchedule as jest.Mock).mockResolvedValue(true)

      const { result } = renderHook(() => useCron())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let success = false
      await act(async () => {
        success = await result.current.updateSchedule('job-1', '0 0 * * *')
      })

      expect(success).toBe(true)
      expect(window.cron.updateSchedule).toHaveBeenCalledWith('job-1', '0 0 * * *')
    })

    it('should return false on failure', async () => {
      ;(window.cron.getAll as jest.Mock).mockResolvedValue([])
      ;(window.cron.updateSchedule as jest.Mock).mockRejectedValue(new Error('update fail'))

      const { result } = renderHook(() => useCron())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let success = true
      await act(async () => {
        success = await result.current.updateSchedule('job-1', 'bad')
      })

      expect(success).toBe(false)
      expect(result.current.error).toBe('update fail')
    })
  })

  describe('validateExpression', () => {
    it('should validate a cron expression', async () => {
      ;(window.cron.getAll as jest.Mock).mockResolvedValue([])
      ;(window.cron.validateExpression as jest.Mock).mockResolvedValue({
        valid: true,
        description: 'Every minute'
      })

      const { result } = renderHook(() => useCron())

      let validation: { valid: boolean; description?: string; error?: string } = { valid: false }
      await act(async () => {
        validation = await result.current.validateExpression('* * * * *')
      })

      expect(validation.valid).toBe(true)
      expect(validation.description).toBe('Every minute')
    })

    it('should return invalid on failure', async () => {
      ;(window.cron.getAll as jest.Mock).mockResolvedValue([])
      ;(window.cron.validateExpression as jest.Mock).mockRejectedValue(new Error('validate fail'))

      const { result } = renderHook(() => useCron())

      let validation: { valid: boolean; error?: string } = { valid: true }
      await act(async () => {
        validation = await result.current.validateExpression('bad')
      })

      expect(validation.valid).toBe(false)
      expect(validation.error).toBe('validate fail')
    })
  })

  it('should clean up job result listener on unmount', async () => {
    const unsubscribe = jest.fn()
    ;(window.cron.getAll as jest.Mock).mockResolvedValue([])
    ;(window.cron.onJobResult as jest.Mock).mockReturnValue(unsubscribe)

    const { unmount } = renderHook(() => useCron())

    await waitFor(() => {
      expect(window.cron.onJobResult).toHaveBeenCalled()
    })

    unmount()
    expect(unsubscribe).toHaveBeenCalled()
  })
})
