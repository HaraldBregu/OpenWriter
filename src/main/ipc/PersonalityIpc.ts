import { ipcMain } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type {
  PersonalityFilesService,
  PersonalityFile,
  SavePersonalityFileInput,
  SavePersonalityFileResult,
  SectionConfig,
  SectionConfigUpdate,
} from '../services/personality-files'
import { wrapIpcHandler } from './IpcErrorHandler'
import { getWindowService } from './IpcHelpers'
import { WorkspaceChannels } from '../../shared/types/ipc/channels'

/**
 * IPC handlers for personality conversation files.
 *
 * Responsibilities:
 *   - Save conversation files as markdown with YAML frontmatter
 *   - Load all personality files from workspace
 *   - Load specific files by section and ID
 *   - Delete personality files
 *   - Provide file watching events to renderer
 *
 * File organization: <workspace>/personality/<section>/<timestamp>.md
 * File format: Markdown with YAML frontmatter
 */
export class PersonalityIpc implements IpcModule {
  readonly name = 'personality'

  register(container: ServiceContainer, _eventBus: EventBus): void {
    /**
     * Save a personality conversation file.
     *
     * Channel: 'personality:save'
     * Input: SavePersonalityFileInput - { sectionId, content, metadata }
     * Output: SavePersonalityFileResult - { id, path, savedAt }
     */
    ipcMain.handle(
      WorkspaceChannels.personality.save,
      wrapIpcHandler(
        async (event: IpcMainInvokeEvent, input: SavePersonalityFileInput): Promise<SavePersonalityFileResult> => {
          const personalityFiles = getWindowService<PersonalityFilesService>(event, container, 'personalityFiles')

          // Validate input
          if (!input.sectionId || typeof input.sectionId !== 'string') {
            throw new Error('Invalid sectionId: must be a non-empty string')
          }

          if (!input.content || typeof input.content !== 'string') {
            throw new Error('Invalid content: must be a non-empty string')
          }

          const result = await personalityFiles.save(input)

          console.log(`[PersonalityIpc] Saved personality file for section ${input.sectionId}: ${result.id}`)

          return result
        },
        WorkspaceChannels.personality.save
      )
    )

    /**
     * Load all personality files from workspace.
     *
     * Channel: 'personality:load-all'
     * Input: none
     * Output: PersonalityFile[] - Array of all personality files
     */
    ipcMain.handle(
      WorkspaceChannels.personality.loadAll,
      wrapIpcHandler(async (event: IpcMainInvokeEvent): Promise<PersonalityFile[]> => {
        const personalityFiles = getWindowService<PersonalityFilesService>(event, container, 'personalityFiles')

        const files = await personalityFiles.loadAll()

        console.log(`[PersonalityIpc] Loaded ${files.length} personality files`)

        return files
      }, WorkspaceChannels.personality.loadAll)
    )

    /**
     * Load a specific personality file.
     *
     * Channel: 'personality:load-one'
     * Input: { sectionId: string, id: string }
     * Output: PersonalityFile | null - The personality file or null if not found
     */
    ipcMain.handle(
      WorkspaceChannels.personality.loadOne,
      wrapIpcHandler(
        async (
          event: IpcMainInvokeEvent,
          params: { sectionId: string; id: string }
        ): Promise<PersonalityFile | null> => {
          const personalityFiles = getWindowService<PersonalityFilesService>(event, container, 'personalityFiles')

          // Validate input
          if (!params.sectionId || typeof params.sectionId !== 'string') {
            throw new Error('Invalid sectionId: must be a non-empty string')
          }

          if (!params.id || typeof params.id !== 'string') {
            throw new Error('Invalid id: must be a non-empty string')
          }

          const file = await personalityFiles.loadOne(params.sectionId, params.id)

          if (file) {
            console.log(`[PersonalityIpc] Loaded personality file: ${params.sectionId}/${params.id}`)
          } else {
            console.log(`[PersonalityIpc] Personality file not found: ${params.sectionId}/${params.id}`)
          }

          return file
        },
        WorkspaceChannels.personality.loadOne
      )
    )

    /**
     * Delete a personality file.
     *
     * Channel: 'personality:delete'
     * Input: { sectionId: string, id: string }
     * Output: void
     */
    ipcMain.handle(
      WorkspaceChannels.personality.delete,
      wrapIpcHandler(
        async (event: IpcMainInvokeEvent, params: { sectionId: string; id: string }): Promise<void> => {
          const personalityFiles = getWindowService<PersonalityFilesService>(event, container, 'personalityFiles')

          // Validate input
          if (!params.sectionId || typeof params.sectionId !== 'string') {
            throw new Error('Invalid sectionId: must be a non-empty string')
          }

          if (!params.id || typeof params.id !== 'string') {
            throw new Error('Invalid id: must be a non-empty string')
          }

          await personalityFiles.delete(params.sectionId, params.id)

          console.log(`[PersonalityIpc] Deleted personality file: ${params.sectionId}/${params.id}`)
        },
        WorkspaceChannels.personality.delete
      )
    )

    /**
     * Load the section-level config for the given section.
     *
     * Channel: 'personality:load-section-config'
     * Input: { sectionId: string }
     * Output: SectionConfig | null — the config object, or null if not yet created
     */
    ipcMain.handle(
      PersonalityChannels.loadSectionConfig,
      wrapIpcHandler(
        async (
          event: IpcMainInvokeEvent,
          params: { sectionId: string }
        ): Promise<SectionConfig | null> => {
          const personalityFiles = getWindowService<PersonalityFilesService>(event, container, 'personalityFiles')

          // Validate input
          if (!params.sectionId || typeof params.sectionId !== 'string') {
            throw new Error('Invalid sectionId: must be a non-empty string')
          }

          const config = await personalityFiles.loadSectionConfig(params.sectionId)

          if (config) {
            console.log(`[PersonalityIpc] Loaded section config for: ${params.sectionId}`)
          } else {
            console.log(`[PersonalityIpc] No section config found for: ${params.sectionId}`)
          }

          return config
        },
        PersonalityChannels.loadSectionConfig
      )
    )

    /**
     * Create or update the section-level config for the given section.
     *
     * Channel: 'personality:save-section-config'
     * Input: { sectionId: string, update: SectionConfigUpdate }
     * Output: SectionConfig — the full updated config
     */
    ipcMain.handle(
      WorkspaceChannels.personality.saveSectionConfig,
      wrapIpcHandler(
        async (
          event: IpcMainInvokeEvent,
          params: { sectionId: string; update: SectionConfigUpdate }
        ): Promise<SectionConfig> => {
          const personalityFiles = getWindowService<PersonalityFilesService>(event, container, 'personalityFiles')

          // Validate sectionId
          if (!params.sectionId || typeof params.sectionId !== 'string') {
            throw new Error('Invalid sectionId: must be a non-empty string')
          }

          // Validate update object
          if (!params.update || typeof params.update !== 'object' || Array.isArray(params.update)) {
            throw new Error('Invalid update: must be an object')
          }

          const config = await personalityFiles.saveSectionConfig(params.sectionId, params.update)

          console.log(`[PersonalityIpc] Saved section config for: ${params.sectionId}`)

          return config
        },
        WorkspaceChannels.personality.saveSectionConfig
      )
    )

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
