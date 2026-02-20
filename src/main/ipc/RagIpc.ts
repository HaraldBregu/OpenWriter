import { ipcMain, BrowserWindow } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { RagController } from '../rag/RagController'
import { wrapIpcHandler, wrapSimpleHandler } from './IpcErrorHandler'

/**
 * IPC handlers for RAG (Retrieval-Augmented Generation) operations.
 */
export class RagIpc implements IpcModule {
  readonly name = 'rag'

  register(container: ServiceContainer, _eventBus: EventBus): void {
    const rag = container.get<RagController>('rag')

    // Indexing
    ipcMain.handle(
      'rag:index',
      wrapIpcHandler(async (event, filePath: string, providerId: string) => {
        const win = BrowserWindow.fromWebContents(event.sender)
        if (!win) throw new Error('No window found')
        return rag.indexFile(filePath, providerId, win)
      }, 'rag:index')
    )

    // Querying (streaming)
    ipcMain.handle(
      'rag:query',
      wrapIpcHandler(
        async (event, filePath: string, question: string, runId: string, providerId: string) => {
          const win = BrowserWindow.fromWebContents(event.sender)
          if (!win) throw new Error('No window found')
          return rag.queryFile(filePath, question, runId, providerId, win)
        },
        'rag:query'
      )
    )

    // Cancellation (no wrapping for 'on' listeners)
    ipcMain.on('rag:cancel', (_event, runId: string) => {
      rag.cancel(runId)
    })

    // Status
    ipcMain.handle('rag:status', wrapSimpleHandler(() => rag.getStatus(), 'rag:status'))

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
