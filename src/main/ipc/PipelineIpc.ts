import { ipcMain, BrowserWindow } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { PipelineService } from '../pipeline/PipelineService'
import { wrapIpcHandler, wrapSimpleHandler } from './IpcErrorHandler'
import { PipelineChannels } from '../../shared/types/ipc/channels'

/**
 * IPC handlers for the agent pipeline.
 *
 * Channels:
 *  - pipeline:run    (invoke) -- Start an agent run. Returns { runId }.
 *  - pipeline:cancel (send)   -- Cancel a running agent by runId.
 *  - pipeline:list-agents (invoke) -- List registered agent names.
 *  - pipeline:list-runs   (invoke) -- List currently active runs.
 *
 * Streaming events are pushed from PipelineService via EventBus on the
 * `pipeline:event` channel. The renderer subscribes with onPipelineEvent().
 */
export class PipelineIpc implements IpcModule {
  readonly name = 'pipeline'

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  register(container: ServiceContainer, _eventBus: EventBus): void {
    const pipeline = container.get<PipelineService>('pipeline')

    // Start a run -- returns the generated runId to the caller
    ipcMain.handle(
      PipelineChannels.run,
      wrapIpcHandler(async (event, agentName: string, input: { prompt: string; context?: Record<string, unknown> }) => {
        const win = BrowserWindow.fromWebContents(event.sender)
        const windowId = win && !win.isDestroyed() ? win.id : undefined
        const runId = await pipeline.start(agentName, input, windowId)
        return { runId }
      }, PipelineChannels.run)
    )

    // Cancel a run -- fire-and-forget (ipcMain.on, not handle)
    ipcMain.on(PipelineChannels.cancel, (_event, runId: string) => {
      pipeline.cancel(runId)
    })

    // List registered agents
    ipcMain.handle(
      PipelineChannels.listAgents,
      wrapSimpleHandler(() => pipeline.listAgents(), PipelineChannels.listAgents)
    )

    // List active runs
    ipcMain.handle(
      PipelineChannels.listRuns,
      wrapSimpleHandler(() => pipeline.listActiveRuns(), PipelineChannels.listRuns)
    )

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
