import { ipcMain } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type {
  OutputFilesService,
  OutputFile,
  OutputType,
  SaveOutputFileInput,
  SaveOutputFileResult,
} from '../services/output-files'
import { VALID_OUTPUT_TYPES } from '../services/output-files'
import { wrapIpcHandler } from './IpcErrorHandler'
import { getWindowService } from './IpcHelpers'

/**
 * IPC handlers for output content files (posts, writings, notes, messages).
 *
 * Responsibilities:
 *   - Save output files as folder-based format (config.json + DATA.md)
 *   - Load all output files from workspace
 *   - Load output files by type
 *   - Load specific files by type and ID
 *   - Delete output files
 *   - Provide file watching events to renderer
 *
 * File organization: <workspace>/output/<type>/<YYYY-MM-DD_HHmmss>/
 */
export class OutputIpc implements IpcModule {
  readonly name = 'output'

  register(container: ServiceContainer, _eventBus: EventBus): void {
    /**
     * Save an output file.
     *
     * Channel: 'output:save'
     * Input: SaveOutputFileInput - { type, content, metadata }
     * Output: SaveOutputFileResult - { id, path, savedAt }
     */
    ipcMain.handle(
      'output:save',
      wrapIpcHandler(
        async (event: IpcMainInvokeEvent, input: SaveOutputFileInput): Promise<SaveOutputFileResult> => {
          const outputFiles = getWindowService<OutputFilesService>(event, container, 'outputFiles')

          // Validate input
          if (!input.type || typeof input.type !== 'string') {
            throw new Error('Invalid type: must be a non-empty string')
          }

          if (!this.isValidOutputType(input.type)) {
            throw new Error(
              `Invalid output type "${input.type}". Must be one of: ${VALID_OUTPUT_TYPES.join(', ')}`
            )
          }

          if (!input.content || typeof input.content !== 'string') {
            throw new Error('Invalid content: must be a non-empty string')
          }

          if (!input.metadata || typeof input.metadata !== 'object' || Array.isArray(input.metadata)) {
            throw new Error('Invalid metadata: must be an object')
          }

          const result = await outputFiles.save(input)

          console.log(`[OutputIpc] Saved output file for type ${input.type}: ${result.id}`)

          return result
        },
        'output:save'
      )
    )

    /**
     * Load all output files from workspace (across all types).
     *
     * Channel: 'output:load-all'
     * Input: none
     * Output: OutputFile[] - Array of all output files
     */
    ipcMain.handle(
      'output:load-all',
      wrapIpcHandler(async (event: IpcMainInvokeEvent): Promise<OutputFile[]> => {
        const outputFiles = getWindowService<OutputFilesService>(event, container, 'outputFiles')

        const files = await outputFiles.loadAll()

        console.log(`[OutputIpc] Loaded ${files.length} output files`)

        return files
      }, 'output:load-all')
    )

    /**
     * Load all output files for a specific type.
     *
     * Channel: 'output:load-by-type'
     * Input: string - The output type (posts, writings, notes, messages)
     * Output: OutputFile[] - Array of output files for that type
     */
    ipcMain.handle(
      'output:load-by-type',
      wrapIpcHandler(
        async (event: IpcMainInvokeEvent, outputType: string): Promise<OutputFile[]> => {
          const outputFiles = getWindowService<OutputFilesService>(event, container, 'outputFiles')

          // Validate input
          if (!outputType || typeof outputType !== 'string') {
            throw new Error('Invalid type: must be a non-empty string')
          }

          if (!this.isValidOutputType(outputType)) {
            throw new Error(
              `Invalid output type "${outputType}". Must be one of: ${VALID_OUTPUT_TYPES.join(', ')}`
            )
          }

          const files = await outputFiles.loadByType(outputType as OutputType)

          console.log(`[OutputIpc] Loaded ${files.length} output files for type "${outputType}"`)

          return files
        },
        'output:load-by-type'
      )
    )

    /**
     * Load a specific output file.
     *
     * Channel: 'output:load-one'
     * Input: { type: string, id: string }
     * Output: OutputFile | null - The output file or null if not found
     */
    ipcMain.handle(
      'output:load-one',
      wrapIpcHandler(
        async (
          event: IpcMainInvokeEvent,
          params: { type: string; id: string }
        ): Promise<OutputFile | null> => {
          const outputFiles = getWindowService<OutputFilesService>(event, container, 'outputFiles')

          // Validate input
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
            console.log(`[OutputIpc] Loaded output file: ${params.type}/${params.id}`)
          } else {
            console.log(`[OutputIpc] Output file not found: ${params.type}/${params.id}`)
          }

          return file
        },
        'output:load-one'
      )
    )

    /**
     * Delete an output file.
     *
     * Channel: 'output:delete'
     * Input: { type: string, id: string }
     * Output: void
     */
    ipcMain.handle(
      'output:delete',
      wrapIpcHandler(
        async (event: IpcMainInvokeEvent, params: { type: string; id: string }): Promise<void> => {
          const outputFiles = getWindowService<OutputFilesService>(event, container, 'outputFiles')

          // Validate input
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

          console.log(`[OutputIpc] Deleted output file: ${params.type}/${params.id}`)
        },
        'output:delete'
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
