import { ipcMain, dialog } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import https from 'node:https'
import http from 'node:http'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { WorkspaceService } from '../services/workspace'
import type { DocumentsWatcherService } from '../services/documents-watcher'
import { wrapIpcHandler } from './IpcErrorHandler'
import { getWindowService } from './IpcHelpers'
import { validateTextFiles, getAllTextExtensions, getSupportedFileTypesDescription } from '../utils/file-type-validator'

/**
 * Document file metadata structure returned to the renderer process.
 */
interface DocumentMetadata {
  id: string
  name: string
  path: string
  size: number
  mimeType: string
  importedAt: number
  lastModified: number
}

/**
 * IPC handlers for managing documents in the workspace.
 *
 * Responsibilities:
 *   - Import files from file picker dialog
 *   - Import files from drag & drop (array of paths)
 *   - Download files from URLs
 *   - Load all documents from workspace
 *   - Delete document files
 *   - Ensure documents directory exists
 *   - Handle atomic writes to prevent corruption
 *   - Provide detailed error reporting
 *
 * File storage: Files are stored in a "documents" subdirectory of the workspace
 */
export class DocumentsIpc implements IpcModule {
  readonly name = 'documents'

  private readonly DOCS_DIR_NAME = 'documents'

  register(container: ServiceContainer, _eventBus: EventBus): void {
    /**
     * Import files using system file picker dialog.
     *
     * Channel: 'documents:import-files'
     * Input: none
     * Output: DocumentMetadata[] - Array of imported file metadata
     */
    ipcMain.handle(
      'documents:import-files',
      wrapIpcHandler(async (event: IpcMainInvokeEvent): Promise<DocumentMetadata[]> => {
        // Get window-scoped services
        const workspace = getWindowService<WorkspaceService>(event, container, 'workspace')
        const documentsWatcher = this.tryGetWindowService<DocumentsWatcherService>(event, container, 'documentsWatcher')

        const currentWorkspace = workspace.getCurrent()

        if (!currentWorkspace) {
          throw new Error('No workspace selected. Please select a workspace first.')
        }

        const docsDir = path.join(currentWorkspace, this.DOCS_DIR_NAME)
        await this.ensureDocumentsDirectory(docsDir)

        // Get text file extensions for dialog filter
        const textExtensions = getAllTextExtensions().map(ext => ext.replace('.', ''))

        // Open file picker dialog with text-only filters
        const result = await dialog.showOpenDialog({
          properties: ['openFile', 'multiSelections'],
          filters: [
            { name: 'Text Files', extensions: textExtensions },
            { name: 'All Files', extensions: ['*'] }
          ],
          message: getSupportedFileTypesDescription()
        })

        if (result.canceled || result.filePaths.length === 0) {
          return []
        }

        // Validate file types
        const { validFiles, invalidFiles } = validateTextFiles(result.filePaths)

        // Show error dialog if any files are invalid
        if (invalidFiles.length > 0) {
          const fileList = invalidFiles
            .map(({ path: filePath, reason }) => `• ${path.basename(filePath)}: ${reason}`)
            .join('\n')

          await dialog.showMessageBox({
            type: 'warning',
            title: 'Invalid File Types',
            message: `${invalidFiles.length} file(s) were rejected:`,
            detail: `${fileList}\n\n${getSupportedFileTypesDescription()}`
          })
        }

        // If no valid files, return empty array
        if (validFiles.length === 0) {
          return []
        }

        // Import each valid file
        const importedFiles = await Promise.all(
          validFiles.map((filePath) => this.importFile(filePath, docsDir, documentsWatcher))
        )

        console.log(`[DocumentsIpc] Imported ${importedFiles.length} files (rejected ${invalidFiles.length})`)

        return importedFiles
      }, 'documents:import-files')
    )

    /**
     * Import files from an array of file paths (e.g., from drag & drop).
     *
     * Channel: 'documents:import-by-paths'
     * Input: string[] - Array of absolute file paths
     * Output: DocumentMetadata[] - Array of imported file metadata
     */
    ipcMain.handle(
      'documents:import-by-paths',
      wrapIpcHandler(async (event: IpcMainInvokeEvent, paths: string[]): Promise<DocumentMetadata[]> => {
        const workspace = getWindowService<WorkspaceService>(event, container, 'workspace')
        const documentsWatcher = this.tryGetWindowService<DocumentsWatcherService>(event, container, 'documentsWatcher')

        const currentWorkspace = workspace.getCurrent()

        if (!currentWorkspace) {
          throw new Error('No workspace selected. Please select a workspace first.')
        }

        const docsDir = path.join(currentWorkspace, this.DOCS_DIR_NAME)
        await this.ensureDocumentsDirectory(docsDir)

        // Validate file types
        const { validFiles, invalidFiles } = validateTextFiles(paths)

        // Log rejected files
        if (invalidFiles.length > 0) {
          console.warn(`[DocumentsIpc] Rejected ${invalidFiles.length} invalid files:`)
          invalidFiles.forEach(({ path: filePath, reason }) => {
            console.warn(`  - ${path.basename(filePath)}: ${reason}`)
          })
        }

        // If no valid files, throw error with details
        if (validFiles.length === 0 && invalidFiles.length > 0) {
          throw new Error(
            `All ${invalidFiles.length} file(s) were rejected. ${getSupportedFileTypesDescription()}`
          )
        }

        // Import each valid file
        const importedFiles = await Promise.all(
          validFiles.map((filePath) => this.importFile(filePath, docsDir, documentsWatcher))
        )

        console.log(`[DocumentsIpc] Imported ${importedFiles.length} files from paths (rejected ${invalidFiles.length})`)

        return importedFiles
      }, 'documents:import-by-paths')
    )

    /**
     * Download a file from a URL.
     *
     * Channel: 'documents:download-from-url'
     * Input: string - URL to download from
     * Output: DocumentMetadata - Downloaded file metadata
     */
    ipcMain.handle(
      'documents:download-from-url',
      wrapIpcHandler(async (event: IpcMainInvokeEvent, url: string): Promise<DocumentMetadata> => {
        // Validate URL format and protocol
        this.validateDownloadUrl(url)

        const workspace = getWindowService<WorkspaceService>(event, container, 'workspace')
        const documentsWatcher = this.tryGetWindowService<DocumentsWatcherService>(event, container, 'documentsWatcher')

        const currentWorkspace = workspace.getCurrent()

        if (!currentWorkspace) {
          throw new Error('No workspace selected. Please select a workspace first.')
        }

        const docsDir = path.join(currentWorkspace, this.DOCS_DIR_NAME)
        await this.ensureDocumentsDirectory(docsDir)

        // Download the file
        const downloadedFile = await this.downloadFile(url, docsDir, documentsWatcher)

        console.log(`[DocumentsIpc] Downloaded file from URL: ${url}`)

        return downloadedFile
      }, 'documents:download-from-url')
    )

    /**
     * Load all documents from the workspace directory.
     *
     * Channel: 'documents:load-all'
     * Input: none
     * Output: DocumentMetadata[] - Array of all document metadata
     */
    ipcMain.handle(
      'documents:load-all',
      wrapIpcHandler(async (event: IpcMainInvokeEvent): Promise<DocumentMetadata[]> => {
        const workspace = getWindowService<WorkspaceService>(event, container, 'workspace')

        const currentWorkspace = workspace.getCurrent()

        if (!currentWorkspace) {
          console.warn('[DocumentsIpc] Load attempt with no workspace selected')
          throw new Error('No workspace selected. Please select a workspace first.')
        }

        const docsDir = path.join(currentWorkspace, this.DOCS_DIR_NAME)

        console.log(`[DocumentsIpc] Loading documents from: ${docsDir}`)

        // Check if documents directory exists
        try {
          await fs.access(docsDir)
        } catch {
          // Documents directory doesn't exist yet, return empty array
          console.log('[DocumentsIpc] Documents directory does not exist, returning empty array')
          return []
        }

        // Read all files in the documents directory
        let files: string[]
        try {
          files = await fs.readdir(docsDir)
        } catch (err) {
          const error = err as NodeJS.ErrnoException
          if (error.code === 'EACCES') {
            throw new Error(
              `Permission denied reading documents directory: ${docsDir}. ` +
                'Please check directory permissions.'
            )
          }
          throw new Error(`Failed to read documents directory: ${error.message}`)
        }

        // Filter out hidden files and directories
        const validFiles = files.filter((file) => !file.startsWith('.'))
        console.log(`[DocumentsIpc] Found ${validFiles.length} files in documents directory`)

        const documents: DocumentMetadata[] = []

        for (const file of validFiles) {
          try {
            const filePath = path.join(docsDir, file)
            const stats = await fs.stat(filePath)

            // Skip directories
            if (stats.isDirectory()) {
              continue
            }

            const metadata = this.createFileMetadata(file, filePath, stats)
            documents.push(metadata)
          } catch (err) {
            const error = err as Error
            console.warn(`[DocumentsIpc] Failed to load file ${file}:`, error.message)
          }
        }

        console.log(`[DocumentsIpc] Successfully loaded ${documents.length} documents from workspace`)

        return documents
      }, 'documents:load-all')
    )

    /**
     * Delete a document file.
     *
     * Channel: 'documents:delete-file'
     * Input: string - File ID to delete
     * Output: void
     */
    ipcMain.handle(
      'documents:delete-file',
      wrapIpcHandler(async (event: IpcMainInvokeEvent, id: string): Promise<void> => {
        const workspace = getWindowService<WorkspaceService>(event, container, 'workspace')
        const documentsWatcher = this.tryGetWindowService<DocumentsWatcherService>(event, container, 'documentsWatcher')

        const currentWorkspace = workspace.getCurrent()

        if (!currentWorkspace) {
          throw new Error('No workspace selected. Please select a workspace first.')
        }

        const docsDir = path.join(currentWorkspace, this.DOCS_DIR_NAME)
        const filePath = path.join(docsDir, id)

        try {
          // Mark file as app-written before deleting (prevents watcher from emitting event)
          if (documentsWatcher) {
            documentsWatcher.markFileAsWritten(filePath)
          }

          await fs.unlink(filePath)
          console.log(`[DocumentsIpc] Deleted document file: ${filePath}`)
        } catch (err) {
          // If file doesn't exist, that's okay (idempotent delete)
          if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw new Error(`Failed to delete document ${id}: ${(err as Error).message}`)
          }
          console.log(`[DocumentsIpc] Document ${id} already deleted (file not found)`)
        }
      }, 'documents:delete-file')
    )

    console.log(`[IPC] Registered ${this.name} module`)
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Try to get a window-scoped service, returning null if not found.
   * Useful for optional services like DocumentsWatcherService.
   */
  private tryGetWindowService<T>(
    event: IpcMainInvokeEvent,
    container: ServiceContainer,
    serviceKey: string
  ): T | null {
    try {
      return getWindowService<T>(event, container, serviceKey)
    } catch {
      return null
    }
  }

  /**
   * Ensure the documents directory exists, creating it if necessary.
   */
  private async ensureDocumentsDirectory(docsDir: string): Promise<void> {
    try {
      await fs.access(docsDir)
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        // Directory doesn't exist, create it
        try {
          await fs.mkdir(docsDir, { recursive: true })
          console.log(`[DocumentsIpc] Created documents directory: ${docsDir}`)
        } catch (mkdirErr) {
          throw new Error(
            `Failed to create documents directory: ${(mkdirErr as Error).message}. ` +
              'Please check directory permissions.'
          )
        }
      } else if ((err as NodeJS.ErrnoException).code === 'EACCES') {
        throw new Error(
          `Permission denied accessing documents directory: ${docsDir}. ` +
            'Please check directory permissions.'
        )
      } else {
        throw new Error(`Failed to access documents directory: ${(err as Error).message}`)
      }
    }
  }

  /**
   * Import a file by copying it to the documents directory.
   */
  private async importFile(
    sourceFilePath: string,
    docsDir: string,
    documentsWatcher: DocumentsWatcherService | null
  ): Promise<DocumentMetadata> {
    const fileName = path.basename(sourceFilePath)
    const destFilePath = await this.getUniqueFilePath(docsDir, fileName)

    // Copy the file
    try {
      // Mark file as app-written BEFORE writing (prevents watcher from emitting event)
      if (documentsWatcher) {
        documentsWatcher.markFileAsWritten(destFilePath)
      }

      await fs.copyFile(sourceFilePath, destFilePath)

      const stats = await fs.stat(destFilePath)
      const id = path.basename(destFilePath)

      return this.createFileMetadata(id, destFilePath, stats)
    } catch (err) {
      throw new Error(`Failed to import file ${fileName}: ${(err as Error).message}`)
    }
  }

  /**
   * Download a file from a URL to the documents directory.
   */
  private async downloadFile(
    url: string,
    docsDir: string,
    documentsWatcher: DocumentsWatcherService | null
  ): Promise<DocumentMetadata> {
    return new Promise((resolve, reject) => {
      // Extract filename from URL or generate one
      const urlObj = new URL(url)
      let fileName = path.basename(urlObj.pathname) || `download-${Date.now()}`

      // If no extension, try to guess from content-type later
      if (!path.extname(fileName)) {
        fileName = `${fileName}.download`
      }

      this.getUniqueFilePath(docsDir, fileName).then((destFilePath) => {
        const file = fs.open(destFilePath, 'w')

        const protocol = urlObj.protocol === 'https:' ? https : http

        const request = protocol.get(url, (response) => {
          if (response.statusCode !== 200) {
            reject(new Error(`Failed to download file: HTTP ${response.statusCode}`))
            return
          }

          file.then(async (fileHandle) => {
            // Mark file as app-written BEFORE writing
            if (documentsWatcher) {
              documentsWatcher.markFileAsWritten(destFilePath)
            }

            const writeStream = fileHandle.createWriteStream()

            response.pipe(writeStream)

            writeStream.on('finish', async () => {
              await fileHandle.close()

              try {
                const stats = await fs.stat(destFilePath)
                const id = path.basename(destFilePath)
                const metadata = this.createFileMetadata(id, destFilePath, stats)
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
          }).catch((err) => {
            reject(new Error(`Failed to create file: ${err.message}`))
          })
        })

        request.on('error', (err) => {
          reject(new Error(`Failed to download file: ${err.message}`))
        })

        request.end()
      }).catch(reject)
    })
  }

  /**
   * Get a unique file path by appending a counter if the file already exists.
   * Example: file.txt -> file (1).txt -> file (2).txt
   */
  private async getUniqueFilePath(docsDir: string, fileName: string): Promise<string> {
    const ext = path.extname(fileName)
    const baseName = path.basename(fileName, ext)
    let counter = 0
    let filePath = path.join(docsDir, fileName)

    while (true) {
      try {
        await fs.access(filePath)
        // File exists, try next counter
        counter++
        filePath = path.join(docsDir, `${baseName} (${counter})${ext}`)
      } catch {
        // File doesn't exist, we can use this path
        return filePath
      }
    }
  }

  /**
   * Create file metadata from stats.
   */
  private createFileMetadata(
    id: string,
    filePath: string,
    stats: { size: number; mtimeMs: number }
  ): DocumentMetadata {
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
   * Validate that a download URL is safe to download from.
   * Only allows HTTPS URLs to prevent man-in-the-middle attacks.
   * @throws Error if URL is invalid or uses an insecure protocol
   */
  private validateDownloadUrl(url: string): void {
    try {
      const urlObj = new URL(url)

      // Only allow HTTPS to prevent downloading over insecure channels
      if (urlObj.protocol !== 'https:') {
        throw new Error(`Invalid protocol "${urlObj.protocol}". Only HTTPS downloads are allowed.`)
      }

      // Basic hostname validation - reject localhost and private IPs
      const hostname = urlObj.hostname
      const privatePatterns = [
        /^localhost$/i,
        /^127\./,
        /^192\.168\./,
        /^10\./,
        /^172\.(1[6-9]|2\d|3[01])\./,
        /^::1$/,
        /^fc00:/,
        /^fd00:/
      ]

      if (privatePatterns.some(pattern => pattern.test(hostname))) {
        throw new Error(`Downloads from private networks are not allowed: ${hostname}`)
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error(`Invalid URL format: ${url}`)
    }
  }

  /**
   * Get MIME type from file extension.
   * Basic implementation - can be enhanced with mime-types package if needed.
   */
  private getMimeType(filePath: string): string {
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
