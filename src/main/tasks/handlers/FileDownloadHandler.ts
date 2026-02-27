import { app, net } from 'electron'
import * as path from 'path'
import * as fs from 'fs/promises'
import { createWriteStream, WriteStream } from 'fs'
import { TaskHandler, ProgressReporter } from '../TaskHandler'
import { DOWNLOAD_PROGRESS_THROTTLE_MS } from '../../constants'

export interface FileDownloadInput {
  url: string
  fileName?: string
  destDir?: string // Optional: defaults to system Downloads folder
  maxRetries?: number // Default: 3
  retryDelay?: number // Default: 1000ms
}

export interface FileDownloadOutput {
  filePath: string
  fileName: string
  size: number
  mimeType: string
  diagnostics: DownloadDiagnostics
}

export interface DownloadDiagnostics {
  url: string
  httpStatus: number
  contentType: string | null
  contentLength: number
  actualSize: number
  sizeMatch: boolean
  totalDurationMs: number
  downloadDurationMs: number
  averageSpeedBytesPerSec: number
  destDir: string
  conflictResolved: boolean
  originalFileName: string
  resolvedFileName: string
}

/** Per-download timing context -- local to each execute() call. */
interface DownloadTiming {
  startTime: number
  downloadStartTime: number
  lastProgressTime: number
}

const PROGRESS_THROTTLE_MS = DOWNLOAD_PROGRESS_THROTTLE_MS // Update every 100ms max

/**
 * Production-grade file download handler with:
 * - Electron's net module (respects proxy settings, uses Chromium network stack)
 * - Security hardening (URL validation, SSRF protection)
 * - Retry logic with exponential backoff
 * - Progress throttling (100ms) to avoid overwhelming IPC
 * - Disk space checking
 * - Filename conflict resolution
 * - Speed/ETA calculations
 * - Comprehensive debug instrumentation
 */
export class FileDownloadHandler
  implements TaskHandler<FileDownloadInput, FileDownloadOutput>
{
  readonly type = 'file-download'

  validate(input: FileDownloadInput): void {
    if (!input.url) {
      throw new Error('Download URL is required')
    }

    try {
      const urlObj = new URL(input.url)

      // Only allow HTTP/HTTPS
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error(
          `Unsafe protocol: ${urlObj.protocol}. Only HTTP/HTTPS allowed.`
        )
      }

      // Block private networks (SSRF protection)
      if (this.isPrivateOrLocalhost(urlObj.hostname)) {
        throw new Error('Downloads from private networks are not allowed')
      }
    } catch (err) {
      if (err instanceof TypeError) {
        throw new Error(`Invalid URL: ${input.url}`)
      }
      throw err
    }

    // Warn about potentially dangerous file extensions
    if (input.fileName) {
      const ext = path.extname(input.fileName).toLowerCase()
      const dangerousExts = [
        '.exe',
        '.bat',
        '.cmd',
        '.com',
        '.scr',
        '.vbs',
        '.js',
        '.msi'
      ]

      if (dangerousExts.includes(ext)) {
        console.warn(
          `[FileDownloadHandler] Potentially dangerous file type: ${ext}`
        )
      }
    }
  }

  async execute(
    input: FileDownloadInput,
    signal: AbortSignal,
    reporter: ProgressReporter
  ): Promise<FileDownloadOutput> {
    const timing: DownloadTiming = {
      startTime: Date.now(),
      downloadStartTime: 0,
      lastProgressTime: 0
    }

    const maxRetries = input.maxRetries ?? 3
    const baseDelay = input.retryDelay ?? 1000

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (signal.aborted) {
        throw new Error('Download cancelled')
      }

      try {
        if (attempt > 0) {
          const delay = baseDelay * Math.pow(2, attempt - 1)
          console.log(
            `[FileDownloadHandler] Retry attempt ${attempt}/${maxRetries} after ${delay}ms`
          )
          reporter.progress(0, `Retrying download (${attempt}/${maxRetries})...`)
          await this.sleep(delay)
        }

        return await this.downloadFile(input, signal, reporter, timing)
      } catch (err) {
        lastError = err as Error

        // Don't retry on cancellation or validation errors
        if (
          lastError.message.includes('cancelled') ||
          lastError.message.includes('Invalid') ||
          lastError.message.includes('Unsafe') ||
          lastError.message.includes('not allowed')
        ) {
          throw lastError
        }

        console.warn(
          `[FileDownloadHandler] Attempt ${attempt + 1} failed: ${lastError.message}`
        )

        if (attempt === maxRetries) {
          throw new Error(
            `Download failed after ${maxRetries} retries: ${lastError.message}`
          )
        }
      }
    }

    throw lastError || new Error('Download failed')
  }

  private async downloadFile(
    input: FileDownloadInput,
    signal: AbortSignal,
    reporter: ProgressReporter,
    timing: DownloadTiming
  ): Promise<FileDownloadOutput> {
    const urlObj = new URL(input.url)
    const originalFileName = this.sanitizeFileName(
      input.fileName || this.extractFileName(urlObj.pathname)
    )

    // Use system downloads folder by default
    const downloadsPath = input.destDir || app.getPath('downloads')
    await fs.mkdir(downloadsPath, { recursive: true })

    // Resolve filename conflicts
    const resolvedFileName = await this.getUniqueFileName(
      downloadsPath,
      originalFileName
    )
    const destFilePath = path.join(downloadsPath, resolvedFileName)

    console.log(`[FileDownloadHandler] Starting download: ${input.url}`)
    console.log(`[FileDownloadHandler] Destination: ${destFilePath}`)

    timing.downloadStartTime = Date.now()
    timing.lastProgressTime = timing.downloadStartTime

    reporter.progress(0, 'Starting download')

    return new Promise<FileDownloadOutput>((resolve, reject) => {
      if (signal.aborted) {
        reject(new Error('Download cancelled'))
        return
      }

      // Use Electron's net module (respects proxy, uses Chromium network stack)
      const request = net.request({
        url: input.url,
        method: 'GET',
        redirect: 'follow' // Automatically follow redirects
      })

      let writeStream: WriteStream | null = null
      let contentLength = 0
      let downloadedBytes = 0
      let contentType = ''
      let httpStatus = 0

      request.on('response', (response) => {
        httpStatus = response.statusCode

        console.log(
          `[FileDownloadHandler] HTTP ${httpStatus} - ${response.statusMessage}`
        )

        // Handle HTTP errors
        if (httpStatus < 200 || httpStatus >= 300) {
          reject(new Error(`Download failed: HTTP ${httpStatus}`))
          return
        }

        contentLength = parseInt(
          response.headers['content-length']?.[0] || '0',
          10
        )
        contentType =
          response.headers['content-type']?.[0] || 'application/octet-stream'

        console.log(
          `[FileDownloadHandler] Content-Length: ${this.formatBytes(contentLength)}`
        )
        console.log(`[FileDownloadHandler] Content-Type: ${contentType}`)

        // Check disk space before starting
        if (contentLength > 0) {
          this.checkDiskSpace(destFilePath, contentLength).catch((err) => {
            console.error(
              `[FileDownloadHandler] Disk space check failed:`,
              err
            )
            request.abort()
            reject(err)
          })
        }

        writeStream = createWriteStream(destFilePath)

        response.on('data', (chunk: Buffer) => {
          if (signal.aborted) {
            request.abort()
            writeStream?.destroy()
            return
          }

          downloadedBytes += chunk.length
          writeStream?.write(chunk)

          // Throttle progress updates (100ms)
          const now = Date.now()
          if (now - timing.lastProgressTime >= PROGRESS_THROTTLE_MS) {
            this.reportProgress(
              downloadedBytes,
              contentLength,
              resolvedFileName,
              now,
              reporter,
              timing
            )
            timing.lastProgressTime = now
          }
        })

        response.on('end', () => {
          writeStream?.end()
        })

        response.on('error', async (err) => {
          console.error(`[FileDownloadHandler] Response error:`, err)
          writeStream?.destroy()
          await this.cleanupPartialDownload(destFilePath)
          reject(new Error(`Download failed: ${err.message}`))
        })

        writeStream.on('finish', async () => {
          try {
            const stats = await fs.stat(destFilePath)
            const totalDuration = Date.now() - timing.startTime
            const downloadDuration = Date.now() - timing.downloadStartTime
            const avgSpeed =
              downloadDuration > 0
                ? (stats.size / downloadDuration) * 1000
                : 0

            console.log(
              `[FileDownloadHandler] ✓ Download complete: ${this.formatBytes(stats.size)} in ${(downloadDuration / 1000).toFixed(2)}s`
            )
            console.log(
              `[FileDownloadHandler] Average speed: ${this.formatSpeed(avgSpeed)}`
            )

            reporter.progress(100, 'Download complete')

            resolve({
              filePath: destFilePath,
              fileName: resolvedFileName,
              size: stats.size,
              mimeType: contentType,
              diagnostics: {
                url: input.url,
                httpStatus,
                contentType,
                contentLength,
                actualSize: stats.size,
                sizeMatch: contentLength === stats.size,
                totalDurationMs: totalDuration,
                downloadDurationMs: downloadDuration,
                averageSpeedBytesPerSec: Math.round(avgSpeed),
                destDir: downloadsPath,
                conflictResolved: originalFileName !== resolvedFileName,
                originalFileName,
                resolvedFileName
              }
            })
          } catch (err) {
            console.error(
              `[FileDownloadHandler] Failed to verify download:`,
              err
            )
            reject(
              new Error(
                `Failed to verify download: ${(err as Error).message}`
              )
            )
          }
        })

        writeStream.on('error', async (err) => {
          console.error(`[FileDownloadHandler] Write error:`, err)
          await this.cleanupPartialDownload(destFilePath)
          reject(new Error(`Failed to write file: ${err.message}`))
        })
      })

      request.on('error', async (err) => {
        console.error(`[FileDownloadHandler] Request error:`, err)
        await this.cleanupPartialDownload(destFilePath)
        reject(new Error(`Network error: ${err.message}`))
      })

      signal.addEventListener(
        'abort',
        () => {
          console.log(`[FileDownloadHandler] Download cancelled by user`)
          request.abort()
          writeStream?.destroy()
          this.cleanupPartialDownload(destFilePath).then(() => {
            reject(new Error('Download cancelled'))
          })
        },
        { once: true }
      )

      request.end()
    })
  }

  private reportProgress(
    downloadedBytes: number,
    totalBytes: number,
    fileName: string,
    now: number,
    reporter: ProgressReporter,
    timing: DownloadTiming
  ): void {
    const percent = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0

    const elapsed = (now - timing.downloadStartTime) / 1000
    const speed = elapsed > 0 ? downloadedBytes / elapsed : 0
    const remaining = totalBytes - downloadedBytes
    const eta = speed > 0 ? remaining / speed : 0

    reporter.progress(percent, `Downloading ${fileName}`, {
      downloaded: downloadedBytes,
      total: totalBytes,
      speed: this.formatSpeed(speed),
      speedBytes: Math.round(speed),
      eta: this.formatEta(eta),
      etaSeconds: Math.round(eta),
      percent
    })
  }

  private sanitizeFileName(fileName: string): string {
    return (
      fileName
        .replace(/[/\\?%*:|"<>]/g, '-')
        .replace(/^\.+/, '')
        .substring(0, 255) || `download-${Date.now()}`
    )
  }

  private extractFileName(urlPath: string): string {
    const baseName = path.basename(urlPath) || `download-${Date.now()}`
    return baseName.includes('.') ? baseName : `${baseName}.download`
  }

  private async getUniqueFileName(
    dir: string,
    fileName: string
  ): Promise<string> {
    const baseName = path.parse(fileName).name
    const ext = path.parse(fileName).ext
    let candidate = fileName
    let counter = 1

    while (await this.fileExists(path.join(dir, candidate))) {
      candidate = `${baseName} (${counter})${ext}`
      counter++
    }

    return candidate
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  private async checkDiskSpace(
    filePath: string,
    requiredBytes: number
  ): Promise<void> {
    try {
      const stats = await fs.statfs(path.dirname(filePath))
      const availableBytes = stats.bavail * stats.bsize

      if (availableBytes < requiredBytes) {
        throw new Error(
          `Insufficient disk space. Required: ${this.formatBytes(requiredBytes)}, ` +
            `Available: ${this.formatBytes(availableBytes)}`
        )
      }
    } catch (err) {
      console.warn('[FileDownloadHandler] Could not check disk space:', err)
    }
  }

  private isPrivateOrLocalhost(hostname: string): boolean {
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1'
    ) {
      return true
    }

    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^169\.254\./,
      /^fc00:/,
      /^fe80:/
    ]

    return privateRanges.some((regex) => regex.test(hostname))
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`
  }

  private formatSpeed(bytesPerSecond: number): string {
    const mbps = bytesPerSecond / (1024 * 1024)
    return `${mbps.toFixed(2)} MB/s`
  }

  private formatEta(seconds: number): string {
    if (seconds === Infinity || seconds <= 0 || !isFinite(seconds))
      return 'Unknown'

    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)

    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private async cleanupPartialDownload(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath)
      console.log(`[FileDownloadHandler] Cleaned up partial download: ${filePath}`)
    } catch {
      // Ignore cleanup errors
    }
  }
}
