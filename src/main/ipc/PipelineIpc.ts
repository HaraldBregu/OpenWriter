import { ipcMain, BrowserWindow } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { PipelineService } from '../pipeline/PipelineService'
import { wrapIpcHandler, wrapSimpleHandler } from './IpcErrorHandler'

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
      'pipeline:run',
      wrapIpcHandler(async (event, agentName: string, input: { prompt: string; context?: Record<string, unknown> }) => {
        const win = BrowserWindow.fromWebContents(event.sender)
        const windowId = win && !win.isDestroyed() ? win.id : undefined
        const runId = await pipeline.start(agentName, input, windowId)
        return { runId }
      }, 'pipeline:run')
    )

    // Cancel a run -- fire-and-forget (ipcMain.on, not handle)
    ipcMain.on('pipeline:cancel', (_event, runId: string) => {
      pipeline.cancel(runId)
    })

    // List registered agents
    ipcMain.handle(
      'pipeline:list-agents',
      wrapSimpleHandler(() => pipeline.listAgents(), 'pipeline:list-agents')
    )

    // List active runs
    ipcMain.handle(
      'pipeline:list-runs',
      wrapSimpleHandler(() => pipeline.listActiveRuns(), 'pipeline:list-runs')
    )

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
