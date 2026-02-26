import { ipcMain } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type {
  WritingItemsService,
  WritingItem,
  CreateWritingItemInput,
  SaveWritingItemInput,
  WriteWritingItemResult,
} from '../services/writing-items'
import { VALID_WRITING_ITEM_STATUSES } from '../services/writing-items'
import { wrapIpcHandler } from './IpcErrorHandler'
import { getWindowService } from './IpcHelpers'
import { WritingItemsChannels } from '../../shared/types/ipc/channels'

/**
 * IPC handlers for writing item management.
 *
 * All handlers are window-scoped — each BrowserWindow has its own
 * WritingItemsService instance that is bound to that window's workspace.
 *
 * Channel contract:
 *   workspace:create-writing-item   (CreateWritingItemInput)        -> WriteWritingItemResult
 *   workspace:save-writing-item     (id: string, SaveWritingItemInput) -> WriteWritingItemResult
 *   workspace:load-writing-items    ()                              -> WritingItem[]
 *   workspace:load-writing-item     (id: string)                    -> WritingItem | null
 *   workspace:delete-writing-item   (id: string)                    -> void
 *
 * Push events (main -> renderer via EventBus.broadcast):
 *   writing-items:file-changed   WritingItemChangeEvent
 *   writing-items:watcher-error  { error: string; timestamp: number }
 */
export class WritingItemsIpc implements IpcModule {
  readonly name = 'writingItems'

  register(container: ServiceContainer, _eventBus: EventBus): void {
    /**
     * Create a new writing item.
     *
     * Channel: 'workspace:create-writing-item'
     * Input:   CreateWritingItemInput — { title, content?, status?, category?, tags? }
     * Output:  WriteWritingItemResult — { id, path, savedAt }
     */
    ipcMain.handle(
      WritingItemsChannels.create,
      wrapIpcHandler(
        async (event: IpcMainInvokeEvent, input: CreateWritingItemInput): Promise<WriteWritingItemResult> => {
          const service = getWindowService<WritingItemsService>(event, container, 'writingItems')

          // Validate required field
          if (!input || typeof input !== 'object' || Array.isArray(input)) {
            throw new Error('Invalid input: must be an object')
          }
          if (!input.title || typeof input.title !== 'string' || !input.title.trim()) {
            throw new Error('Invalid title: must be a non-empty string')
          }

          // Validate optional status
          if (input.status !== undefined && !this.isValidStatus(input.status)) {
            throw new Error(
              `Invalid status "${input.status}". Must be one of: ${VALID_WRITING_ITEM_STATUSES.join(', ')}`
            )
          }

          // Validate optional arrays
          if (input.tags !== undefined && !Array.isArray(input.tags)) {
            throw new Error('Invalid tags: must be an array')
          }

          // Validate optional strings
          if (input.content !== undefined && typeof input.content !== 'string') {
            throw new Error('Invalid content: must be a string')
          }
          if (input.category !== undefined && typeof input.category !== 'string') {
            throw new Error('Invalid category: must be a string')
          }

          const result = await service.create(input)

          console.log(`[WritingItemsIpc] Created writing item: ${result.id}`)
          return result
        },
        WritingItemsChannels.create
      )
    )

    /**
     * Save (update) an existing writing item.
     *
     * Channel: 'workspace:save-writing-item'
     * Input:   id: string, SaveWritingItemInput — partial update, only supplied fields mutated
     * Output:  WriteWritingItemResult — { id, path, savedAt }
     */
    ipcMain.handle(
      WritingItemsChannels.save,
      wrapIpcHandler(
        async (
          event: IpcMainInvokeEvent,
          id: string,
          input: SaveWritingItemInput
        ): Promise<WriteWritingItemResult> => {
          const service = getWindowService<WritingItemsService>(event, container, 'writingItems')

          if (!id || typeof id !== 'string') {
            throw new Error('Invalid id: must be a non-empty string')
          }
          if (!input || typeof input !== 'object' || Array.isArray(input)) {
            throw new Error('Invalid input: must be an object')
          }

          // Validate optional fields if provided
          if (input.title !== undefined && (typeof input.title !== 'string' || !input.title.trim())) {
            throw new Error('Invalid title: must be a non-empty string when provided')
          }
          if (input.status !== undefined && !this.isValidStatus(input.status)) {
            throw new Error(
              `Invalid status "${input.status}". Must be one of: ${VALID_WRITING_ITEM_STATUSES.join(', ')}`
            )
          }
          if (input.tags !== undefined && !Array.isArray(input.tags)) {
            throw new Error('Invalid tags: must be an array when provided')
          }
          if (input.content !== undefined && typeof input.content !== 'string') {
            throw new Error('Invalid content: must be a string when provided')
          }
          if (input.category !== undefined && typeof input.category !== 'string') {
            throw new Error('Invalid category: must be a string when provided')
          }

          const result = await service.save(id, input)

          console.log(`[WritingItemsIpc] Saved writing item: ${result.id}`)
          return result
        },
        WritingItemsChannels.save
      )
    )

    /**
     * Load all writing items from the current workspace.
     *
     * Channel: 'workspace:load-writing-items'
     * Input:   none
     * Output:  WritingItem[] — sorted newest-first, empty array if none exist
     */
    ipcMain.handle(
      WritingItemsChannels.loadAll,
      wrapIpcHandler(async (event: IpcMainInvokeEvent): Promise<WritingItem[]> => {
        const service = getWindowService<WritingItemsService>(event, container, 'writingItems')

        const items = await service.loadAll()
        console.log(`[WritingItemsIpc] Loaded ${items.length} writing items`)
        return items
      }, WritingItemsChannels.loadAll)
    )

    /**
     * Load a single writing item by its ID.
     *
     * Channel: 'workspace:load-writing-item'
     * Input:   id: string
     * Output:  WritingItem | null — null if the item does not exist
     */
    ipcMain.handle(
      WritingItemsChannels.loadOne,
      wrapIpcHandler(
        async (event: IpcMainInvokeEvent, id: string): Promise<WritingItem | null> => {
          const service = getWindowService<WritingItemsService>(event, container, 'writingItems')

          if (!id || typeof id !== 'string') {
            throw new Error('Invalid id: must be a non-empty string')
          }

          const item = await service.loadOne(id)

          if (item) {
            console.log(`[WritingItemsIpc] Loaded writing item: ${id}`)
          } else {
            console.log(`[WritingItemsIpc] Writing item not found: ${id}`)
          }

          return item
        },
        WritingItemsChannels.loadOne
      )
    )

    /**
     * Delete a writing item by its ID.
     *
     * Channel: 'workspace:delete-writing-item'
     * Input:   id: string
     * Output:  void
     */
    ipcMain.handle(
      WritingItemsChannels.delete,
      wrapIpcHandler(
        async (event: IpcMainInvokeEvent, id: string): Promise<void> => {
          const service = getWindowService<WritingItemsService>(event, container, 'writingItems')

          if (!id || typeof id !== 'string') {
            throw new Error('Invalid id: must be a non-empty string')
          }

          await service.delete(id)

          console.log(`[WritingItemsIpc] Deleted writing item: ${id}`)
        },
        WritingItemsChannels.delete
      )
    )

    console.log(`[IPC] Registered ${this.name} module`)
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private isValidStatus(status: string): boolean {
    return (VALID_WRITING_ITEM_STATUSES as readonly string[]).includes(status)
  }
}
