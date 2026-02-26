import { ipcMain, dialog } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import fs from 'node:fs'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { WorkspaceService } from '../services/workspace'
import type { LoggerService } from '../services/logger'
import type {
  OutputFilesService,
  OutputFile,
  OutputType,
  SaveOutputFileInput,
  SaveOutputFileResult,
} from '../services/output-files'
import { VALID_OUTPUT_TYPES } from '../services/output-files'
import { wrapSimpleHandler, wrapIpcHandler } from './IpcErrorHandler'
import { getWindowService } from './IpcHelpers'
import { WorkspaceChannels, OutputChannels } from '../../shared/types/ipc/channels'

/**
 * IPC handlers for workspace management.
 *
 * This is a thin routing layer -- all state and logic live in WorkspaceService.
 * Each handler delegates to the service and lets the error wrapper handle failures.
 */
export class WorkspaceIpc implements IpcModule {
  readonly name = 'workspace'

  register(container: ServiceContainer, _eventBus: EventBus): void {
    const logger = container.get<LoggerService>('logger')

    // Workspace folder selection dialog (global, not window-specific)
    // Shows folder picker and returns the selected path
    ipcMain.handle(
      WorkspaceChannels.selectFolder,
      wrapSimpleHandler(async () => {
        const result = await dialog.showOpenDialog({
          properties: ['openDirectory', 'createDirectory'],
          title: 'Select Workspace Folder',
          buttonLabel: 'Select Workspace'
        })

        if (!result.canceled && result.filePaths.length > 0) {
          const workspacePath = result.filePaths[0]
          logger.info('WorkspaceIpc', `Folder selected: ${workspacePath}`)
          return workspacePath
        }
        return null
      }, WorkspaceChannels.selectFolder)
    )

    // Get current workspace (window-scoped)
    ipcMain.handle(
      WorkspaceChannels.getCurrent,
      wrapIpcHandler((event: IpcMainInvokeEvent) => {
        const workspace = getWindowService<WorkspaceService>(event, container, 'workspace')
        return workspace.getCurrent()
      }, WorkspaceChannels.getCurrent)
    )

    // Set current workspace (window-scoped)
    // Sets the workspace in the current window
    ipcMain.handle(
      WorkspaceChannels.setCurrent,
      wrapIpcHandler((event: IpcMainInvokeEvent, workspacePath: string) => {
        const workspace = getWindowService<WorkspaceService>(event, container, 'workspace')
        logger.info('WorkspaceIpc', `Setting workspace: ${workspacePath}`)
        workspace.setCurrent(workspacePath)
      }, WorkspaceChannels.setCurrent)
    )

    // Get recent workspaces (window-scoped)
    ipcMain.handle(
      WorkspaceChannels.getRecent,
      wrapIpcHandler((event: IpcMainInvokeEvent) => {
        const workspace = getWindowService<WorkspaceService>(event, container, 'workspace')
        return workspace.getRecent()
      }, WorkspaceChannels.getRecent)
    )

    // Clear current workspace (window-scoped)
    ipcMain.handle(
      WorkspaceChannels.clear,
      wrapIpcHandler((event: IpcMainInvokeEvent) => {
        const workspace = getWindowService<WorkspaceService>(event, container, 'workspace')
        workspace.clear()
      }, WorkspaceChannels.clear)
    )

    // Check if a directory exists (global utility, read-only boolean check)
    ipcMain.handle(
      WorkspaceChannels.directoryExists,
      wrapSimpleHandler((directoryPath: string) => {
        try {
          return fs.existsSync(directoryPath) && fs.statSync(directoryPath).isDirectory()
        } catch {
          return false
        }
      }, WorkspaceChannels.directoryExists)
    )

    // Remove workspace from recent history (window-scoped)
    ipcMain.handle(
      WorkspaceChannels.removeRecent,
      wrapIpcHandler((event: IpcMainInvokeEvent, workspacePath: string) => {
        const workspace = getWindowService<WorkspaceService>(event, container, 'workspace')
        workspace.removeRecent(workspacePath)
        logger.info('WorkspaceIpc', `Removed from recent: ${workspacePath}`)
      }, WorkspaceChannels.removeRecent)
    )

    // -------------------------------------------------------------------------
    // Output file handlers — delegated to OutputFilesService (window-scoped)
    // Exposed via window.workspace.output.* in the renderer.
    // -------------------------------------------------------------------------

    /**
     * Save an output file.
     *
     * Channel: 'output:save'
     * Input: SaveOutputFileInput - { type, blocks, metadata }
     * Output: SaveOutputFileResult - { id, path, savedAt }
     */
    ipcMain.handle(
      OutputChannels.save,
      wrapIpcHandler(
        async (event: IpcMainInvokeEvent, input: SaveOutputFileInput): Promise<SaveOutputFileResult> => {
          const outputFiles = getWindowService<OutputFilesService>(event, container, 'outputFiles')

          if (!input.type || typeof input.type !== 'string') {
            throw new Error('Invalid type: must be a non-empty string')
          }
          if (!this.isValidOutputType(input.type)) {
            throw new Error(
              `Invalid output type "${input.type}". Must be one of: ${VALID_OUTPUT_TYPES.join(', ')}`
            )
          }
          if (!Array.isArray(input.blocks) || input.blocks.length === 0) {
            throw new Error('Invalid blocks: must be a non-empty array')
          }
          for (const block of input.blocks) {
            if (!block.name || typeof block.name !== 'string') {
              throw new Error('Each block must have a non-empty string `name` field')
            }
            if (typeof block.content !== 'string') {
              throw new Error(`Block "${block.name}": content must be a string`)
            }
          }
          if (!input.metadata || typeof input.metadata !== 'object' || Array.isArray(input.metadata)) {
            throw new Error('Invalid metadata: must be an object')
          }

          const result = await outputFiles.save(input)
          logger.info('WorkspaceIpc', `Saved output file for type ${input.type}: ${result.id}`)
          return result
        },
        OutputChannels.save
      )
    )

    /**
     * Update an existing output file (blocks + metadata).
     *
     * Channel: 'output:update'
     * Input: { type, id, blocks, metadata }
     * Output: void
     */
    ipcMain.handle(
      OutputChannels.update,
      wrapIpcHandler(
        async (
          event: IpcMainInvokeEvent,
          params: {
            type: string
            id: string
            blocks: Array<{ name: string; content: string; createdAt?: string; filetype?: 'markdown'; type?: 'content' }>
            metadata: Record<string, unknown>
          }
        ): Promise<void> => {
          const outputFiles = getWindowService<OutputFilesService>(event, container, 'outputFiles')

          if (!params.type || typeof params.type !== 'string') {
            throw new Error('Invalid type: must be a non-empty string')
          }
          if (!this.isValidOutputType(params.type)) {
            throw new Error(`Invalid output type "${params.type}". Must be one of: ${VALID_OUTPUT_TYPES.join(', ')}`)
          }
          if (!params.id || typeof params.id !== 'string') {
            throw new Error('Invalid id: must be a non-empty string')
          }
          if (!Array.isArray(params.blocks) || params.blocks.length === 0) {
            throw new Error('Invalid blocks: must be a non-empty array')
          }
          for (const block of params.blocks) {
            if (!block.name || typeof block.name !== 'string') {
              throw new Error('Each block must have a non-empty string `name` field')
            }
            if (typeof block.content !== 'string') {
              throw new Error(`Block "${block.name}": content must be a string`)
            }
          }
          if (!params.metadata || typeof params.metadata !== 'object' || Array.isArray(params.metadata)) {
            throw new Error('Invalid metadata: must be an object')
          }

          await outputFiles.update(params.type as OutputType, params.id, {
            blocks: params.blocks,
            metadata: params.metadata as Parameters<OutputFilesService['update']>[2]['metadata'],
          })

          logger.info('WorkspaceIpc', `Updated output file: ${params.type}/${params.id}`)
        },
        OutputChannels.update
      )
    )

    /**
     * Load all output files from workspace (across all types).
     *
     * Channel: 'output:load-all'
     * Input: none
     * Output: OutputFile[]
     */
    ipcMain.handle(
      OutputChannels.loadAll,
      wrapIpcHandler(async (event: IpcMainInvokeEvent): Promise<OutputFile[]> => {
        const outputFiles = getWindowService<OutputFilesService>(event, container, 'outputFiles')
        const files = await outputFiles.loadAll()
        logger.info('WorkspaceIpc', `Loaded ${files.length} output files`)
        return files
      }, OutputChannels.loadAll)
    )

    /**
     * Load all output files for a specific type.
     *
     * Channel: 'output:load-by-type'
     * Input: string - The output type
     * Output: OutputFile[]
     */
    ipcMain.handle(
      OutputChannels.loadByType,
      wrapIpcHandler(
        async (event: IpcMainInvokeEvent, outputType: string): Promise<OutputFile[]> => {
          const outputFiles = getWindowService<OutputFilesService>(event, container, 'outputFiles')

          if (!outputType || typeof outputType !== 'string') {
            throw new Error('Invalid type: must be a non-empty string')
          }
          if (!this.isValidOutputType(outputType)) {
            throw new Error(
              `Invalid output type "${outputType}". Must be one of: ${VALID_OUTPUT_TYPES.join(', ')}`
            )
          }

          const files = await outputFiles.loadByType(outputType as OutputType)
          logger.info('WorkspaceIpc', `Loaded ${files.length} output files for type "${outputType}"`)
          return files
        },
        OutputChannels.loadByType
      )
    )

    /**
     * Load a specific output file.
     *
     * Channel: 'output:load-one'
     * Input: { type, id }
     * Output: OutputFile | null
     */
    ipcMain.handle(
      OutputChannels.loadOne,
      wrapIpcHandler(
        async (
          event: IpcMainInvokeEvent,
          params: { type: string; id: string }
        ): Promise<OutputFile | null> => {
          const outputFiles = getWindowService<OutputFilesService>(event, container, 'outputFiles')

          if (!params.type || typeof params.type !== 'string') {
            throw new Error('Invalid type: must be a non-empty string')
          }
          if (!this.isValidOutputType(params.type)) {
            throw new Error(
              `Invalid output type "${params.type}". Must be one of: ${VALID_OUTPUT_TYPES.join(', ')}`
            )
          }
          if (!params.id || typeof params.id !== 'string') {
            throw new Error('Invalid id: must be a non-empty string')
          }

          const file = await outputFiles.loadOne(params.type as OutputType, params.id)
          if (file) {
            logger.info('WorkspaceIpc', `Loaded output file: ${params.type}/${params.id}`)
          } else {
            logger.info('WorkspaceIpc', `Output file not found: ${params.type}/${params.id}`)
          }
          return file
        },
        OutputChannels.loadOne
      )
    )

    /**
     * Delete an output file.
     *
     * Channel: 'output:delete'
     * Input: { type, id }
     * Output: void
     */
    ipcMain.handle(
      OutputChannels.delete,
      wrapIpcHandler(
        async (event: IpcMainInvokeEvent, params: { type: string; id: string }): Promise<void> => {
          const outputFiles = getWindowService<OutputFilesService>(event, container, 'outputFiles')

          if (!params.type || typeof params.type !== 'string') {
            throw new Error('Invalid type: must be a non-empty string')
          }
          if (!this.isValidOutputType(params.type)) {
            throw new Error(
              `Invalid output type "${params.type}". Must be one of: ${VALID_OUTPUT_TYPES.join(', ')}`
            )
          }
          if (!params.id || typeof params.id !== 'string') {
            throw new Error('Invalid id: must be a non-empty string')
          }

          await outputFiles.delete(params.type as OutputType, params.id)
          logger.info('WorkspaceIpc', `Deleted output file: ${params.type}/${params.id}`)
        },
        OutputChannels.delete
      )
    )

    console.log(`[IPC] Registered ${this.name} module`)
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Runtime type guard for OutputType values.
   */
  private isValidOutputType(type: string): type is OutputType {
    return (VALID_OUTPUT_TYPES as readonly string[]).includes(type)
  }
}
