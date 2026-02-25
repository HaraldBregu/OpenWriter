import fs from 'node:fs/promises'
import path from 'node:path'
import https from 'node:https'

/**
 * File metadata structure used across document and file operations.
 */
export interface FileMetadata {
  id: string
  name: string
  path: string
  size: number
  mimeType: string
  importedAt: number
  lastModified: number
}

/**
 * FileManagementService provides unified file operations across the application.
 *
 * Responsibilities:
 *   - Copy files from source to destination
 *   - Download files from HTTPS URLs with security validation
 *   - Generate unique file paths to avoid overwriting
 *   - Create file metadata from filesystem stats
 *   - Determine MIME types from file extensions
 *   - Ensure directories exist with proper permissions
 *
 * This service is designed to be used by higher-level services (DocumentsService, OutputService, etc.)
 * that manage file collections within specific directories.
 */
export class FileManagementService {
  // Maximum download size: 500 MB
  private readonly MAX_DOWNLOAD_SIZE = 500 * 1024 * 1024

  /**
   * Copy a file from source to destination directory.
   * Generates a unique name if the file already exists.
   *
   * @param sourceFilePath - Path to the source file
   * @param destDir - Destination directory
   * @param onFileWritten - Optional callback when file is about to be written (used by watchers)
   * @returns File metadata for the copied file
   */
  async copyFile(
    sourceFilePath: string,
    destDir: string,
    onFileWritten?: (filePath: string) => void
  ): Promise<FileMetadata> {
    const fileName = path.basename(sourceFilePath)
    const destFilePath = await this.getUniqueFilePath(destDir, fileName)

    try {
      // Notify watcher before writing (prevents false change events)
      onFileWritten?.(destFilePath)

      await fs.copyFile(sourceFilePath, destFilePath)

      const stats = await fs.stat(destFilePath)
      return this.createFileMetadata(path.basename(destFilePath), destFilePath, stats)
    } catch (err) {
      throw new Error(`Failed to copy file ${fileName}: ${(err as Error).message}`)
    }
  }

  /**
   * Download a file from an HTTPS URL to a destination directory.
   * Enforces maximum file size limit to prevent disk space exhaustion.
   *
   * @param url - HTTPS URL to download from (must already be validated)
   * @param destDir - Destination directory
   * @param onFileWritten - Optional callback when file is about to be written
   * @returns File metadata for the downloaded file
   */
  async downloadFile(
    url: string,
    destDir: string,
    onFileWritten?: (filePath: string) => void
  ): Promise<FileMetadata> {
    return new Promise((resolve, reject) => {
      // Extract filename from URL or generate one
      const urlObj = new URL(url)
      let fileName = path.basename(urlObj.pathname) || `download-${Date.now()}`

      // If no extension, add a placeholder
      if (!path.extname(fileName)) {
        fileName = `${fileName}.download`
      }

      this.getUniqueFilePath(destDir, fileName).then((destFilePath) => {
        const file = fs.open(destFilePath, 'w')

        const request = https.get(url, (response) => {
          if (response.statusCode !== 200) {
            reject(new Error(`Failed to download file: HTTP ${response.statusCode}`))
            return
          }

          // Check Content-Length header
          const contentLength = response.headers['content-length']
          if (contentLength && parseInt(contentLength, 10) > this.MAX_DOWNLOAD_SIZE) {
            reject(
              new Error(
                `File size (${contentLength} bytes) exceeds maximum allowed (${this.MAX_DOWNLOAD_SIZE} bytes)`
              )
            )
            response.destroy()
            return
          }

          file
            .then(async (fileHandle) => {
              // Notify watcher before writing
              onFileWritten?.(destFilePath)

              const writeStream = fileHandle.createWriteStream()
              let downloadedSize = 0

              // Monitor download progress to enforce size limit
              response.on('data', (chunk: Buffer) => {
                downloadedSize += chunk.length
                if (downloadedSize > this.MAX_DOWNLOAD_SIZE) {
                  response.destroy()
                  writeStream.destroy()
                  reject(
                    new Error(
                      `Download exceeded maximum allowed size of ${this.MAX_DOWNLOAD_SIZE} bytes`
                    )
                  )
                }
              })

              response.pipe(writeStream)

              writeStream.on('finish', async () => {
                await fileHandle.close()

                try {
                  const stats = await fs.stat(destFilePath)
                  const metadata = this.createFileMetadata(path.basename(destFilePath), destFilePath, stats)
                  resolve(metadata)
                } catch (err) {
                  reject(new Error(`Failed to get file stats: ${(err as Error).message}`))
                }
              })

              writeStream.on('error', async (err) => {
                await fileHandle.close()
                // Clean up partial download
                try {
                  await fs.unlink(destFilePath)
                } catch {
                  // Ignore cleanup errors
                }
                reject(new Error(`Failed to write downloaded file: ${err.message}`))
              })
            })
            .catch((err) => {
              reject(new Error(`Failed to create file: ${err.message}`))
            })
        })

        request.on('error', (err) => {
          reject(new Error(`Failed to download file: ${err.message}`))
        })

        request.setTimeout(30000, () => {
          request.destroy()
          reject(new Error('Download timeout: request took longer than 30 seconds'))
        })

        request.end()
      }).catch(reject)
    })
  }

  /**
   * Delete a file from disk.
   *
   * @param filePath - Path to the file to delete
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath)
    } catch (err) {
      throw new Error(`Failed to delete file: ${(err as Error).message}`)
    }
  }

  /**
   * Get a unique file path by appending a counter if the file already exists.
   * Example: file.txt -> file (1).txt -> file (2).txt
   *
   * @param dir - Directory path
   * @param fileName - Desired file name
   * @returns Unique file path that doesn't exist
   */
  async getUniqueFilePath(dir: string, fileName: string): Promise<string> {
    const ext = path.extname(fileName)
    const baseName = path.basename(fileName, ext)
    let counter = 0
    let filePath = path.join(dir, fileName)

    while (true) {
      try {
        await fs.access(filePath)
        // File exists, try next counter
        counter++
        filePath = path.join(dir, `${baseName} (${counter})${ext}`)
      } catch {
        // File doesn't exist, we can use this path
        return filePath
      }
    }
  }

  /**
   * Ensure a directory exists, creating it if necessary.
   *
   * @param dirPath - Directory path to ensure
   */
  async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true })
    } catch (err) {
      const error = err as NodeJS.ErrnoException
      if (error.code === 'EACCES') {
        throw new Error(`Permission denied creating directory: ${dirPath}`)
      }
      throw new Error(`Failed to create directory: ${error.message}`)
    }
  }

  /**
   * Create file metadata from filesystem stats.
   *
   * @param id - File ID (typically the basename)
   * @param filePath - Full path to the file
   * @param stats - Filesystem stats object
   * @returns File metadata
   */
  createFileMetadata(
    id: string,
    filePath: string,
    stats: { size: number; mtimeMs: number }
  ): FileMetadata {
    const name = path.basename(filePath)
    const mimeType = this.getMimeType(filePath)
    const now = Date.now()

    return {
      id,
      name,
      path: filePath,
      size: stats.size,
      mimeType,
      importedAt: now,
      lastModified: Math.floor(stats.mtimeMs)
    }
  }

  /**
   * Get MIME type from file extension.
   *
   * @param filePath - Path to the file
   * @returns MIME type string
   */
  getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase()
    const mimeTypes: Record<string, string> = {
      // Documents
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.rtf': 'application/rtf',

      // Images
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
      '.ico': 'image/x-icon',

      // Videos
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.mkv': 'video/x-matroska',
      '.webm': 'video/webm',

      // Audio
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.flac': 'audio/flac',
      '.m4a': 'audio/mp4',

      // Archives
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed',
      '.tar': 'application/x-tar',
      '.gz': 'application/gzip',
      '.7z': 'application/x-7z-compressed',

      // Code
      '.js': 'text/javascript',
      '.ts': 'text/typescript',
      '.jsx': 'text/jsx',
      '.tsx': 'text/tsx',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.html': 'text/html',
      '.css': 'text/css',
      '.py': 'text/x-python',
      '.java': 'text/x-java',
      '.cpp': 'text/x-c++src',
      '.c': 'text/x-csrc',
      '.go': 'text/x-go',
      '.rs': 'text/x-rust',

      // Spreadsheets
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.csv': 'text/csv',

      // Presentations
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    }

    return mimeTypes[ext] || 'application/octet-stream'
  }
}
