import { ipcMain } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type {
  BrainFilesService,
  BrainFile,
  SaveBrainFileInput,
  SaveBrainFileResult
} from '../services/brain-files'
import { wrapIpcHandler } from './IpcErrorHandler'
import { getWindowService } from './IpcHelpers'

/**
 * IPC handlers for brain conversation files.
 *
 * Responsibilities:
 *   - Save conversation files as markdown with YAML frontmatter
 *   - Load all brain files from workspace
 *   - Load specific files by section and ID
 *   - Delete brain files
 *   - Provide file watching events to renderer
 *
 * File organization: <workspace>/brain/<section>/<timestamp>.md
 * File format: Markdown with YAML frontmatter
 */
export class BrainIpc implements IpcModule {
  readonly name = 'brain'

  register(container: ServiceContainer, _eventBus: EventBus): void {
    /**
     * Save a brain conversation file.
     *
     * Channel: 'brain:save'
     * Input: SaveBrainFileInput - { sectionId, content, metadata }
     * Output: SaveBrainFileResult - { id, path, savedAt }
     */
    ipcMain.handle(
      'brain:save',
      wrapIpcHandler(
        async (event: IpcMainInvokeEvent, input: SaveBrainFileInput): Promise<SaveBrainFileResult> => {
          const brainFiles = getWindowService<BrainFilesService>(event, container, 'brainFiles')

          // Validate input
          if (!input.sectionId || typeof input.sectionId !== 'string') {
            throw new Error('Invalid sectionId: must be a non-empty string')
          }

          if (!input.content || typeof input.content !== 'string') {
            throw new Error('Invalid content: must be a non-empty string')
          }

          const result = await brainFiles.save(input)

          console.log(`[BrainIpc] Saved brain file for section ${input.sectionId}: ${result.id}`)

          return result
        },
        'brain:save'
      )
    )

    /**
     * Load all brain files from workspace.
     *
     * Channel: 'brain:load-all'
     * Input: none
     * Output: BrainFile[] - Array of all brain files
     */
    ipcMain.handle(
      'brain:load-all',
      wrapIpcHandler(async (event: IpcMainInvokeEvent): Promise<BrainFile[]> => {
        const brainFiles = getWindowService<BrainFilesService>(event, container, 'brainFiles')

        const files = await brainFiles.loadAll()

        console.log(`[BrainIpc] Loaded ${files.length} brain files`)

        return files
      }, 'brain:load-all')
    )

    /**
     * Load a specific brain file.
     *
     * Channel: 'brain:load-one'
     * Input: { sectionId: string, id: string }
     * Output: BrainFile | null - The brain file or null if not found
     */
    ipcMain.handle(
      'brain:load-one',
      wrapIpcHandler(
        async (
          event: IpcMainInvokeEvent,
          params: { sectionId: string; id: string }
        ): Promise<BrainFile | null> => {
          const brainFiles = getWindowService<BrainFilesService>(event, container, 'brainFiles')

          // Validate input
          if (!params.sectionId || typeof params.sectionId !== 'string') {
            throw new Error('Invalid sectionId: must be a non-empty string')
          }

          if (!params.id || typeof params.id !== 'string') {
            throw new Error('Invalid id: must be a non-empty string')
          }

          const file = await brainFiles.loadOne(params.sectionId, params.id)

          if (file) {
            console.log(`[BrainIpc] Loaded brain file: ${params.sectionId}/${params.id}`)
          } else {
            console.log(`[BrainIpc] Brain file not found: ${params.sectionId}/${params.id}`)
          }

          return file
        },
        'brain:load-one'
      )
    )

    /**
     * Delete a brain file.
     *
     * Channel: 'brain:delete'
     * Input: { sectionId: string, id: string }
     * Output: void
     */
    ipcMain.handle(
      'brain:delete',
      wrapIpcHandler(
        async (event: IpcMainInvokeEvent, params: { sectionId: string; id: string }): Promise<void> => {
          const brainFiles = getWindowService<BrainFilesService>(event, container, 'brainFiles')

          // Validate input
          if (!params.sectionId || typeof params.sectionId !== 'string') {
            throw new Error('Invalid sectionId: must be a non-empty string')
          }

          if (!params.id || typeof params.id !== 'string') {
            throw new Error('Invalid id: must be a non-empty string')
          }

          await brainFiles.delete(params.sectionId, params.id)

          console.log(`[BrainIpc] Deleted brain file: ${params.sectionId}/${params.id}`)
        },
        'brain:delete'
      )
    )

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
