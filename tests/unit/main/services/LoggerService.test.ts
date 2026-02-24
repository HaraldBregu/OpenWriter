/**
 * Tests for LoggerService.
 *
 * Strategy:
 *   - Mock 'electron' (app.getPath) and 'node:fs' (sync API used by the service).
 *   - Construct the service with controlled options (fast flush interval,
 *     small buffer, retention = 0 days so cleanup is skipped by default).
 *   - Test the public API: debug(), info(), warn(), error(), flush(),
 *     getLogDirectory(), getCurrentLogFile(), destroy().
 *   - Test level filtering (DEBUG messages suppressed when minLevel is INFO).
 *   - Test buffer-full auto-flush (when buffer reaches maxBufferSize).
 *   - Test EventBus integration: workspace:changed, service:initialized,
 *     service:destroyed, window:created, window:closed, error:critical,
 *     agent:run:start, agent:run:complete, agent:run:error listeners all
 *     forward the event as a log entry.
 *   - Test destroy() flushes remaining buffer and stops the timer.
 *
 * Note: LoggerService calls initialize() in its constructor, which in turn
 * calls mkdirSync, rotateIfNeeded, cleanupOldLogs and startFlushTimer.
 * We must mock 'node:fs' BEFORE importing the service.
 */

// Mock node:fs (synchronous) before importing the service
jest.mock('node:fs', () => ({
  mkdirSync: jest.fn(),
  appendFileSync: jest.fn(),
  readdirSync: jest.fn().mockReturnValue([]),
  statSync: jest.fn().mockReturnValue({ mtimeMs: Date.now() }),
  unlinkSync: jest.fn(),
}))

import fs from 'node:fs'
import { LoggerService, LogLevel } from '../../../../src/main/services/logger'
import { EventBus } from '../../../../src/main/core/EventBus'

const mockMkdirSync = fs.mkdirSync as jest.Mock
const mockAppendFileSync = fs.appendFileSync as jest.Mock
const mockReaddirSync = fs.readdirSync as jest.Mock
const mockStatSync = fs.statSync as jest.Mock
const mockUnlinkSync = fs.unlinkSync as jest.Mock

// The electron mock is loaded automatically via jest.config.cjs moduleNameMapper
// We import app just so we can reference the mock's getPath return value
import { app } from 'electron'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FAKE_USER_DATA = '/fake/userData'
const EXPECTED_LOG_DIR = `${FAKE_USER_DATA}/logs`

/** Build a LoggerService with test-friendly defaults. */
function makeLogger(
  eventBus: EventBus | null = null,
  options: ConstructorParameters<typeof LoggerService>[1] = {}
) {
  return new LoggerService(eventBus, {
    flushInterval: 600000,  // Very long — we control flushing manually in tests
    maxBufferSize: 100,
    maxRetentionDays: 0,    // Disable cleanup (no old log files to delete)
    consoleOutput: false,   // No console noise during tests
    ...options,
  })
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('LoggerService', () => {
  let service: LoggerService

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    service?.destroy()
  })

  // -------------------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------------------

  describe('initialization', () => {
    it('should create the log directory using app.getPath("userData")', () => {
      service = makeLogger()
      expect(mockMkdirSync).toHaveBeenCalledWith(EXPECTED_LOG_DIR, { recursive: true })
    })

    it('should set the log directory path', () => {
      service = makeLogger()
      expect(service.getLogDirectory()).toBe(EXPECTED_LOG_DIR)
    })

    it('should set the current log file to today\'s date', () => {
      service = makeLogger()
      const logFile = service.getCurrentLogFile()
      expect(logFile).not.toBeNull()
      // File path format: <logDir>/YYYY-MM-DD.log
      expect(logFile).toMatch(/\d{4}-\d{2}-\d{2}\.log$/)
    })
  })

  // -------------------------------------------------------------------------
  // Logging methods
  // -------------------------------------------------------------------------

  describe('logging methods', () => {
    it('should buffer info messages', () => {
      service = makeLogger()
      service.info('TestSource', 'Hello from info')

      service.flush()
      expect(mockAppendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.log'),
        expect.stringContaining('Hello from info'),
        'utf-8'
      )
    })

    it('should buffer warn messages', () => {
      service = makeLogger()
      service.warn('TestSource', 'A warning occurred')

      service.flush()
      expect(mockAppendFileSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('A warning occurred'),
        'utf-8'
      )
    })

    it('should buffer error messages', () => {
      service = makeLogger()
      service.error('TestSource', 'An error occurred')

      service.flush()
      expect(mockAppendFileSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('An error occurred'),
        'utf-8'
      )
    })

    it('should buffer debug messages in development mode (default)', () => {
      // Default minLevel in development is DEBUG
      service = makeLogger(null, { minLevel: LogLevel.DEBUG })
      service.debug('TestSource', 'Debug detail')

      service.flush()
      expect(mockAppendFileSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Debug detail'),
        'utf-8'
      )
    })

    it('should include source in the log output', () => {
      service = makeLogger()
      service.info('MyModule', 'Test message')

      service.flush()
      const written = (mockAppendFileSync as jest.Mock).mock.calls[0][1] as string
      expect(written).toContain('[MyModule]')
    })

    it('should include the log level tag in the output', () => {
      service = makeLogger()
      service.warn('Src', 'Warning msg')

      service.flush()
      const written = (mockAppendFileSync as jest.Mock).mock.calls[0][1] as string
      expect(written).toContain('[WARN ]')
    })

    it('should serialize object data appended to the message', () => {
      service = makeLogger()
      service.info('Src', 'Payload:', { key: 'value', count: 42 })

      service.flush()
      const written = (mockAppendFileSync as jest.Mock).mock.calls[0][1] as string
      expect(written).toContain('"key"')
      expect(written).toContain('"value"')
    })
  })

  // -------------------------------------------------------------------------
  // Level filtering
  // -------------------------------------------------------------------------

  describe('level filtering', () => {
    it('should suppress DEBUG messages when minLevel is INFO', () => {
      service = makeLogger(null, { minLevel: LogLevel.INFO })
      // Drain any buffered init messages (e.g. "Logger initialized" at INFO).
      // Only after draining can we reliably assert that subsequent calls do
      // NOT trigger appendFileSync.
      service.flush()
      mockAppendFileSync.mockClear()

      service.debug('Src', 'Should be suppressed')
      service.flush()
      expect(mockAppendFileSync).not.toHaveBeenCalled()
    })

    it('should suppress DEBUG and INFO when minLevel is WARN', () => {
      service = makeLogger(null, { minLevel: LogLevel.WARN })
      service.flush()
      mockAppendFileSync.mockClear()

      service.debug('Src', 'debug msg')
      service.info('Src', 'info msg')
      service.flush()
      expect(mockAppendFileSync).not.toHaveBeenCalled()
    })

    it('should allow WARN when minLevel is WARN', () => {
      service = makeLogger(null, { minLevel: LogLevel.WARN })
      service.warn('Src', 'warn msg')

      service.flush()
      expect(mockAppendFileSync).toHaveBeenCalled()
    })

    it('should allow ERROR when minLevel is ERROR', () => {
      service = makeLogger(null, { minLevel: LogLevel.ERROR })
      service.error('Src', 'error msg')

      service.flush()
      expect(mockAppendFileSync).toHaveBeenCalled()
    })

    it('should suppress INFO when minLevel is ERROR', () => {
      service = makeLogger(null, { minLevel: LogLevel.ERROR })
      service.info('Src', 'should be suppressed')

      service.flush()
      expect(mockAppendFileSync).not.toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // Auto-flush when buffer is full
  // -------------------------------------------------------------------------

  describe('buffer auto-flush', () => {
    it('should auto-flush when the buffer reaches maxBufferSize', () => {
      // Use a large maxBufferSize so the buffer starts empty for our test.
      // The logger also emits a couple of internal init messages, so we
      // account for them by setting maxBufferSize large enough that our first
      // message would never flush, but a full batch will.
      service = makeLogger(null, { maxBufferSize: 10 })
      // Drain anything written during construction (init messages)
      const callsAfterConstruction = (mockAppendFileSync as jest.Mock).mock.calls.length
      // Now clear the spy so we can do a fresh assertion
      mockAppendFileSync.mockClear()

      // Log (maxBufferSize + 1) messages to guarantee the auto-flush fires.
      // This is robust regardless of how many init entries were in the buffer.
      for (let i = 0; i < 20; i++) {
        service.info('S', `batch msg ${i}`)
      }

      // At least one auto-flush must have fired
      expect(mockAppendFileSync).toHaveBeenCalled()
      // The flushed content should contain our test messages
      const allWritten = (mockAppendFileSync as jest.Mock).mock.calls
        .map((c: unknown[]) => c[1] as string)
        .join('')
      expect(allWritten).toContain('batch msg')
    })
  })

  // -------------------------------------------------------------------------
  // flush() and destroy()
  // -------------------------------------------------------------------------

  describe('flush()', () => {
    it('should write buffered entries to disk', () => {
      service = makeLogger()
      service.info('Src', 'Buffered message')
      mockAppendFileSync.mockClear()

      service.flush()

      expect(mockAppendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.log'),
        expect.stringContaining('Buffered message'),
        'utf-8'
      )
    })

    it('should not call appendFileSync when the buffer is empty', () => {
      service = makeLogger()
      service.flush()
      mockAppendFileSync.mockClear()

      service.flush()

      expect(mockAppendFileSync).not.toHaveBeenCalled()
    })
  })

  describe('destroy()', () => {
    it('should flush the remaining buffer on destroy', () => {
      service = makeLogger()
      service.info('Src', 'Before destroy')
      mockAppendFileSync.mockClear()

      service.destroy()

      expect(mockAppendFileSync).toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // Log retention / cleanup
  // -------------------------------------------------------------------------

  describe('log cleanup', () => {
    it('should delete log files older than maxRetentionDays', () => {
      const OLD_MTIME = Date.now() - 35 * 24 * 60 * 60 * 1000  // 35 days ago
      mockReaddirSync.mockReturnValueOnce(['2023-12-01.log', '2024-01-01.log'])
      mockStatSync
        .mockReturnValueOnce({ mtimeMs: OLD_MTIME })       // 35-day-old log → deleted
        .mockReturnValueOnce({ mtimeMs: Date.now() })      // today's log → kept

      service = makeLogger(null, { maxRetentionDays: 30 })

      expect(mockUnlinkSync).toHaveBeenCalledWith(
        expect.stringContaining('2023-12-01.log')
      )
      expect(mockUnlinkSync).not.toHaveBeenCalledWith(
        expect.stringContaining('2024-01-01.log')
      )
    })

    it('should not delete any files when maxRetentionDays is 0', () => {
      mockReaddirSync.mockReturnValueOnce(['old.log'])

      service = makeLogger(null, { maxRetentionDays: 0 })

      expect(mockUnlinkSync).not.toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // EventBus integration
  // -------------------------------------------------------------------------

  describe('EventBus integration', () => {
    it('should log workspace:changed events', () => {
      const eventBus = new EventBus()
      service = makeLogger(eventBus)
      mockAppendFileSync.mockClear()

      eventBus.emit('workspace:changed', { currentPath: '/new/ws', previousPath: null })
      service.flush()

      const written = (mockAppendFileSync as jest.Mock).mock.calls
        .map((c: unknown[]) => c[1])
        .join('\n') as string
      expect(written).toContain('Workspace changed')
    })

    it('should log service:initialized events', () => {
      const eventBus = new EventBus()
      service = makeLogger(eventBus)
      mockAppendFileSync.mockClear()

      eventBus.emit('service:initialized', { service: 'TestService' })
      service.flush()

      const written = (mockAppendFileSync as jest.Mock).mock.calls
        .map((c: unknown[]) => c[1])
        .join('\n') as string
      expect(written).toContain('Service initialized: TestService')
    })

    it('should log service:destroyed events', () => {
      const eventBus = new EventBus()
      service = makeLogger(eventBus)
      mockAppendFileSync.mockClear()

      eventBus.emit('service:destroyed', { service: 'OldService' })
      service.flush()

      const written = (mockAppendFileSync as jest.Mock).mock.calls
        .map((c: unknown[]) => c[1])
        .join('\n') as string
      expect(written).toContain('Service destroyed: OldService')
    })

    it('should log window:created events', () => {
      const eventBus = new EventBus()
      service = makeLogger(eventBus)
      mockAppendFileSync.mockClear()

      eventBus.emit('window:created', { windowId: 42, type: 'main' })
      service.flush()

      const written = (mockAppendFileSync as jest.Mock).mock.calls
        .map((c: unknown[]) => c[1])
        .join('\n') as string
      expect(written).toContain('Window created')
    })

    it('should log window:closed events', () => {
      const eventBus = new EventBus()
      service = makeLogger(eventBus)
      mockAppendFileSync.mockClear()

      eventBus.emit('window:closed', { windowId: 42 })
      service.flush()

      const written = (mockAppendFileSync as jest.Mock).mock.calls
        .map((c: unknown[]) => c[1])
        .join('\n') as string
      expect(written).toContain('Window closed')
    })

    it('should log error:critical events at ERROR level', () => {
      const eventBus = new EventBus()
      service = makeLogger(eventBus, { minLevel: LogLevel.ERROR })
      mockAppendFileSync.mockClear()

      eventBus.emit('error:critical', { error: new Error('Catastrophic failure'), context: 'Bootstrap' })
      service.flush()

      const written = (mockAppendFileSync as jest.Mock).mock.calls
        .map((c: unknown[]) => c[1])
        .join('\n') as string
      expect(written).toContain('Catastrophic failure')
    })

    it('should log agent:run:start events', () => {
      const eventBus = new EventBus()
      service = makeLogger(eventBus)
      mockAppendFileSync.mockClear()

      eventBus.emit('agent:run:start', { sessionId: 'sess-1', runId: 'run-1' })
      service.flush()

      const written = (mockAppendFileSync as jest.Mock).mock.calls
        .map((c: unknown[]) => c[1])
        .join('\n') as string
      expect(written).toContain('run-1')
    })

    it('should log agent:run:complete events', () => {
      const eventBus = new EventBus()
      service = makeLogger(eventBus)
      mockAppendFileSync.mockClear()

      eventBus.emit('agent:run:complete', { sessionId: 'sess-1', runId: 'run-1', duration: 1500 })
      service.flush()

      const written = (mockAppendFileSync as jest.Mock).mock.calls
        .map((c: unknown[]) => c[1])
        .join('\n') as string
      expect(written).toContain('1500ms')
    })

    it('should log agent:run:error events at ERROR level', () => {
      const eventBus = new EventBus()
      service = makeLogger(eventBus, { minLevel: LogLevel.ERROR })
      mockAppendFileSync.mockClear()

      eventBus.emit('agent:run:error', { sessionId: 'sess-1', runId: 'run-1', error: 'Token limit exceeded' })
      service.flush()

      const written = (mockAppendFileSync as jest.Mock).mock.calls
        .map((c: unknown[]) => c[1])
        .join('\n') as string
      expect(written).toContain('Token limit exceeded')
    })

    it('should not attach event listeners when eventBus is null', () => {
      // Constructing without eventBus should not throw
      expect(() => {
        service = makeLogger(null)
      }).not.toThrow()
    })
  })
})
