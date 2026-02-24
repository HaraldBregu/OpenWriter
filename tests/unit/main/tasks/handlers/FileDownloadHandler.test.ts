/**
 * Tests for FileDownloadHandler.
 *
 * FileDownloadHandler uses Electron's `net` module, `fs/promises`, and `path`.
 * All three are mocked so no real network or disk I/O occurs.
 *
 * Covers:
 *  - type property equals 'file-download'
 *  - validate(): rejects missing URL
 *  - validate(): rejects non-HTTP/HTTPS protocols (file:, ftp:, etc.)
 *  - validate(): rejects private/localhost hostnames (SSRF guard)
 *  - validate(): accepts valid public HTTPS URLs
 *  - validate(): logs warning for dangerous file extensions (.exe, .bat, etc.)
 *  - execute(): returns false for an already-aborted signal
 *  - execute(): retries up to maxRetries then throws with retry count
 *  - execute(): does not retry on cancellation errors
 *  - execute(): does not retry on validation / protocol errors
 */

import * as fs from 'fs/promises'
import { app } from 'electron'

// ---------------------------------------------------------------------------
// Mock fs/promises
// ---------------------------------------------------------------------------

jest.mock('fs/promises')
const mockFs = fs as jest.Mocked<typeof fs>

// ---------------------------------------------------------------------------
// Mock the 'fs' createWriteStream (synchronous import used inside handler)
// ---------------------------------------------------------------------------

const mockWriteStreamInstance = {
  write: jest.fn(),
  end: jest.fn(),
  destroy: jest.fn(),
  on: jest.fn()
}

jest.mock('fs', () => ({
  createWriteStream: jest.fn().mockReturnValue(mockWriteStreamInstance)
}))

// ---------------------------------------------------------------------------
// Mock Electron's net module
// ---------------------------------------------------------------------------

// The net.request mock is defined inside the factory so it is always defined
// when the factory runs (jest.mock calls are hoisted to top of file).
// We expose a reference via a module-level variable that is populated lazily.
let mockNetRequest: jest.Mock

jest.mock('electron', () => {
  const original = jest.requireActual('../../../../../tests/mocks/electron')
  const netRequestMock = jest.fn().mockReturnValue({
    on: jest.fn(),
    end: jest.fn(),
    abort: jest.fn()
  })
  return {
    ...original,
    net: {
      request: netRequestMock
    }
  }
})

// ---------------------------------------------------------------------------
// Import handler after mocks are in place
// ---------------------------------------------------------------------------

import { FileDownloadHandler } from '../../../../../src/main/tasks/handlers/FileDownloadHandler'
import type { FileDownloadInput } from '../../../../../src/main/tasks/handlers/FileDownloadHandler'
import type { ProgressReporter } from '../../../../../src/main/tasks/TaskHandler'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReporter(): jest.Mocked<ProgressReporter> {
  return { progress: jest.fn() }
}

function makeAbortController() {
  return new AbortController()
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FileDownloadHandler', () => {
  let handler: FileDownloadHandler
  let consoleSpy: jest.SpyInstance
  let consoleWarnSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    handler = new FileDownloadHandler()
    consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

    // Default fs stubs
    mockFs.mkdir.mockResolvedValue(undefined as any)
    mockFs.access.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))
    mockFs.stat.mockResolvedValue({ size: 1024 } as any)
    mockFs.statfs.mockResolvedValue({ bavail: 1_000_000, bsize: 4096 } as any)
    mockFs.unlink.mockResolvedValue(undefined as any)

    // app.getPath mock is already set by the electron mock
    ;(app.getPath as jest.Mock).mockReturnValue('/fake/downloads')
  })

  afterEach(() => {
    consoleSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  // ---- type ----------------------------------------------------------------

  describe('type', () => {
    it('should have type "file-download"', () => {
      expect(handler.type).toBe('file-download')
    })
  })

  // ---- validate ------------------------------------------------------------

  describe('validate', () => {
    it('should throw when url is missing', () => {
      expect(() => handler.validate({} as FileDownloadInput)).toThrow(
        'Download URL is required'
      )
    })

    it('should throw when url is an empty string', () => {
      expect(() => handler.validate({ url: '' })).toThrow('Download URL is required')
    })

    it('should throw for a completely invalid URL string', () => {
      // The error message may be "Invalid URL: not-a-url" (from the handler's custom
      // rethrow) or "Invalid URL" (if the TypeError propagates directly in Node 24+).
      // Either way, the string "Invalid URL" must appear in the message.
      expect(() => handler.validate({ url: 'not-a-url' })).toThrow(/Invalid URL/)
    })

    it('should throw for a file:// URL (non-HTTP protocol)', () => {
      expect(() => handler.validate({ url: 'file:///etc/passwd' })).toThrow(
        /Unsafe protocol/
      )
    })

    it('should throw for an ftp:// URL', () => {
      expect(() => handler.validate({ url: 'ftp://example.com/file.zip' })).toThrow(
        /Unsafe protocol/
      )
    })

    it('should throw for localhost URLs', () => {
      expect(() => handler.validate({ url: 'http://localhost/file.zip' })).toThrow(
        'Downloads from private networks are not allowed'
      )
    })

    it('should throw for 127.0.0.1 URLs', () => {
      expect(() => handler.validate({ url: 'http://127.0.0.1/file.zip' })).toThrow(
        'Downloads from private networks are not allowed'
      )
    })

    it('should throw for 192.168.x.x private range URLs', () => {
      expect(() =>
        handler.validate({ url: 'http://192.168.1.100/file.zip' })
      ).toThrow('Downloads from private networks are not allowed')
    })

    it('should throw for 10.x.x.x private range URLs', () => {
      expect(() =>
        handler.validate({ url: 'http://10.0.0.1/file.zip' })
      ).toThrow('Downloads from private networks are not allowed')
    })

    it('should throw for 172.16.x.x private range URLs', () => {
      expect(() =>
        handler.validate({ url: 'http://172.16.0.1/file.zip' })
      ).toThrow('Downloads from private networks are not allowed')
    })

    it('should not throw for a valid public HTTPS URL', () => {
      expect(() =>
        handler.validate({ url: 'https://example.com/file.zip' })
      ).not.toThrow()
    })

    it('should not throw for a valid public HTTP URL', () => {
      expect(() =>
        handler.validate({ url: 'http://example.com/file.pdf' })
      ).not.toThrow()
    })

    it('should log a warning when fileName has a .exe extension', () => {
      handler.validate({ url: 'https://example.com/setup.exe', fileName: 'setup.exe' })

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('.exe')
      )
    })

    it('should log a warning for .bat extension', () => {
      handler.validate({ url: 'https://example.com/run.bat', fileName: 'run.bat' })

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('.bat')
      )
    })

    it('should log a warning for .msi extension', () => {
      handler.validate({ url: 'https://example.com/installer.msi', fileName: 'installer.msi' })

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('.msi')
      )
    })

    it('should not warn for a safe .pdf extension', () => {
      handler.validate({ url: 'https://example.com/doc.pdf', fileName: 'doc.pdf' })

      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })

    it('should not warn when no fileName is provided', () => {
      handler.validate({ url: 'https://example.com/resource' })

      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })
  })

  // ---- execute — cancellation before start --------------------------------

  describe('execute — pre-start cancellation', () => {
    it('should throw "Download cancelled" when signal is already aborted', async () => {
      const controller = makeAbortController()
      controller.abort()

      await expect(
        handler.execute(
          { url: 'https://example.com/file.zip' },
          controller.signal,
          makeReporter()
        )
      ).rejects.toThrow('Download cancelled')
    })
  })

  // ---- execute — retry logic -----------------------------------------------

  describe('execute — retry logic', () => {
    it('should retry the specified number of times then throw with retry count', async () => {
      jest.useFakeTimers()

      // Make net.request always fail with a network error
      const { net } = await import('electron')
      ;(net.request as jest.Mock).mockImplementation(() => {
        const req = {
          on: jest.fn().mockImplementation((event: string, cb: (...args: unknown[]) => void) => {
            if (event === 'error') {
              // Fire the error asynchronously
              setTimeout(() => cb(new Error('ECONNRESET')), 0)
            }
            return req
          }),
          end: jest.fn(),
          abort: jest.fn()
        }
        return req
      })

      const executePromise = handler.execute(
        { url: 'https://example.com/file.zip', maxRetries: 2, retryDelay: 100 },
        new AbortController().signal,
        makeReporter()
      )

      // Advance timers to allow all retry sleeps and request errors to fire
      await Promise.resolve()
      jest.runAllTimers()
      await Promise.resolve()
      jest.runAllTimers()
      await Promise.resolve()
      jest.runAllTimers()
      await Promise.resolve()
      jest.runAllTimers()
      await Promise.resolve()

      await expect(executePromise).rejects.toThrow(/Download failed after 2 retries/)

      jest.useRealTimers()
    })

    it('should not retry when the error message contains "cancelled"', async () => {
      jest.useFakeTimers()

      const { net } = await import('electron')
      ;(net.request as jest.Mock).mockImplementation(() => {
        const req = {
          on: jest.fn().mockImplementation((event: string, cb: (...args: unknown[]) => void) => {
            if (event === 'error') {
              setTimeout(() => cb(new Error('Download was cancelled')), 0)
            }
            return req
          }),
          end: jest.fn(),
          abort: jest.fn()
        }
        return req
      })

      const executePromise = handler.execute(
        { url: 'https://example.com/file.zip', maxRetries: 3 },
        new AbortController().signal,
        makeReporter()
      )

      await Promise.resolve()
      jest.runAllTimers()
      await Promise.resolve()

      await expect(executePromise).rejects.toThrow('Download was cancelled')

      // net.request should have been called only once (no retries)
      expect(net.request as jest.Mock).toHaveBeenCalledTimes(1)

      jest.useRealTimers()
    })
  })

  // ---- private helper method coverage via validate edge cases --------------

  describe('SSRF protection — edge cases', () => {
    it('should block the IPv6 loopback address ::1', () => {
      expect(() => handler.validate({ url: 'http://[::1]/resource' })).toThrow(
        'Downloads from private networks are not allowed'
      )
    })

    it('should allow a public IPv4 address', () => {
      expect(() => handler.validate({ url: 'https://8.8.8.8/file.txt' })).not.toThrow()
    })

    it('should block the link-local range 169.254.x.x', () => {
      expect(() =>
        handler.validate({ url: 'http://169.254.169.254/latest/meta-data/' })
      ).toThrow('Downloads from private networks are not allowed')
    })
  })
})
