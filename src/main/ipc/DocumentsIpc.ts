import { ipcMain, dialog } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { WorkspaceService } from '../services/workspace'
import type { DocumentsWatcherService } from '../services/documents-watcher'
import type { FileManagementService } from '../services/FileManagementService'
import { DocumentsService } from '../services/documents'
import { wrapIpcHandler } from './IpcErrorHandler'
import { getWindowService } from './IpcHelpers'
import { getAllTextExtensions, getSupportedFileTypesDescription } from '../utils/file-type-validator'

/**
 * IPC handlers for managing documents in the workspace.
 *
 * This is a thin routing layer that:
 *   - Handles dialog interactions for file selection
 *   - Validates IPC inputs
 *   - Coordinates between IPC and DocumentsService
 *   - Delegates all business logic to DocumentsService
 *
 * All file operations, validation, and metadata management are handled by DocumentsService,
 * which in turn delegates to FileManagementService for low-level file operations.
 */
export class DocumentsIpc implements IpcModule {
  readonly name = 'documents'

  register(container: ServiceContainer, _eventBus: EventBus): void {
    /**
     * Import files using system file picker dialog.
     *
     * Channel: 'documents:import-files'
     * Input: none
     * Output: FileMetadata[] - Array of imported file metadata
     */
    ipcMain.handle(
      'documents:import-files',
      wrapIpcHandler(async (event: IpcMainInvokeEvent) => {
        const workspace = getWindowService<WorkspaceService>(event, container, 'workspace')
        const fileManagement = container.get<FileManagementService>('fileManagement')
        const watcher = this.tryGetWindowService<DocumentsWatcherService>(event, container, 'documentsWatcher')

        const currentWorkspace = workspace.getCurrent()
        if (!currentWorkspace) {
          throw new Error('No workspace selected. Please select a workspace first.')
        }

        // Show file picker dialog
        const textExtensions = getAllTextExtensions().map((ext) => ext.replace('.', ''))
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

        // Import files using DocumentsService
        const documentsService = new DocumentsService(fileManagement, watcher)
        try {
          return await documentsService.importFiles(currentWorkspace, result.filePaths)
        } catch (err) {
          // Show error dialog if validation failed
          const error = err as Error
          if (error.message.includes('not supported')) {
            await dialog.showMessageBox({
              type: 'warning',
              title: 'Invalid File Types',
              message: error.message
            })
            return []
          }
          throw err
        }
      }, 'documents:import-files')
    )

    /**
     * Import files from an array of file paths (e.g., from drag & drop).
     *
     * Channel: 'documents:import-by-paths'
     * Input: string[] - Array of absolute file paths
     * Output: FileMetadata[] - Array of imported file metadata
     */
    ipcMain.handle(
      'documents:import-by-paths',
      wrapIpcHandler(async (event: IpcMainInvokeEvent, paths: string[]) => {
        const workspace = getWindowService<WorkspaceService>(event, container, 'workspace')
        const fileManagement = container.get<FileManagementService>('fileManagement')
        const watcher = this.tryGetWindowService<DocumentsWatcherService>(event, container, 'documentsWatcher')

        const currentWorkspace = workspace.getCurrent()
        if (!currentWorkspace) {
          throw new Error('No workspace selected. Please select a workspace first.')
        }

        const documentsService = new DocumentsService(fileManagement, watcher)
        return await documentsService.importFiles(currentWorkspace, paths)
      }, 'documents:import-by-paths')
    )

    /**
     * Download a file from a URL.
     *
     * Channel: 'documents:download-from-url'
     * Input: string - URL to download from
     * Output: FileMetadata - Downloaded file metadata
     */
    ipcMain.handle(
      'documents:download-from-url',
      wrapIpcHandler(async (event: IpcMainInvokeEvent, url: string) => {
        // Validate URL format and protocol
        this.validateDownloadUrl(url)

        const workspace = getWindowService<WorkspaceService>(event, container, 'workspace')
        const fileManagement = container.get<FileManagementService>('fileManagement')
        const watcher = this.tryGetWindowService<DocumentsWatcherService>(event, container, 'documentsWatcher')

        const currentWorkspace = workspace.getCurrent()
        if (!currentWorkspace) {
          throw new Error('No workspace selected. Please select a workspace first.')
        }

        const documentsService = new DocumentsService(fileManagement, watcher)
        return await documentsService.downloadFromUrl(currentWorkspace, url)
      }, 'documents:download-from-url')
    )

    /**
     * Load all documents from the workspace directory.
     *
     * Channel: 'documents:load-all'
     * Input: none
     * Output: FileMetadata[] - Array of all document metadata
     */
    ipcMain.handle(
      'documents:load-all',
      wrapIpcHandler(async (event: IpcMainInvokeEvent) => {
        const workspace = getWindowService<WorkspaceService>(event, container, 'workspace')
        const fileManagement = container.get<FileManagementService>('fileManagement')
        const watcher = this.tryGetWindowService<DocumentsWatcherService>(event, container, 'documentsWatcher')

        const currentWorkspace = workspace.getCurrent()
        if (!currentWorkspace) {
          throw new Error('No workspace selected. Please select a workspace first.')
        }

        const documentsService = new DocumentsService(fileManagement, watcher)
        return await documentsService.loadAll(currentWorkspace)
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
      wrapIpcHandler(async (event: IpcMainInvokeEvent, id: string) => {
        const workspace = getWindowService<WorkspaceService>(event, container, 'workspace')
        const fileManagement = container.get<FileManagementService>('fileManagement')
        const watcher = this.tryGetWindowService<DocumentsWatcherService>(event, container, 'documentsWatcher')

        const currentWorkspace = workspace.getCurrent()
        if (!currentWorkspace) {
          throw new Error('No workspace selected. Please select a workspace first.')
        }

        const documentsService = new DocumentsService(fileManagement, watcher)
        await documentsService.deleteFile(id, currentWorkspace)
      }, 'documents:delete-file')
    )

    console.log(`[IPC] Registered ${this.name} module`)
  }

  /**
   * Try to get a window-scoped service, returning null if it doesn't exist.
   * Used for optional services that may not be initialized in all contexts.
   */
  private tryGetWindowService<T>(event: IpcMainInvokeEvent, container: ServiceContainer, serviceName: string): T | null {
    try {
      // Window-scoped services are stored with a window-specific key
      const windowService = (container as any).windowServices?.get(event.sender.id)?.[serviceName]
      return windowService || null
    } catch {
      return null
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

      if (privatePatterns.some((pattern) => pattern.test(hostname))) {
        throw new Error(`Downloads from private networks are not allowed: ${hostname}`)
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error(`Invalid URL format: ${url}`)
    }
  }
}
