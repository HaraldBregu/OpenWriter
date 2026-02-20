/**
 * RagController.ts — Electron main-process controller for the RAG pipeline.
 *
 * Manages:
 *  - Multiple indexed files (filePath → retriever cache)
 *  - Streaming query runs via webContents.send (same pattern as AgentController)
 *  - Cancellation via AbortController
 *
 * IPC surface (registered in main.ts):
 *  - rag:index   — index a file, returns { chunkCount, filePath }
 *  - rag:query   — stream a question against an indexed file
 *  - rag:cancel  — abort a running query
 *  - rag:status  — list indexed files
 */

import { BrowserWindow } from 'electron'
import { indexFile } from './ragLoader'
import { buildRagChain } from './ragChain'
import type { BaseRetriever } from '@langchain/core/retrievers'
import type { StoreService } from '../services/store'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IndexedFile {
  filePath: string
  chunkCount: number
  indexedAt: number
  retriever: BaseRetriever
}

// IPC event payloads — mirrored in preload/index.d.ts
export interface RagTokenEvent   { runId: string; token: string }
export interface RagDoneEvent    { runId: string; cancelled?: boolean }
export interface RagErrorEvent   { runId: string; error: string }
export interface RagIndexResult  { filePath: string; chunkCount: number }
export interface RagStatusResult { files: Array<{ filePath: string; chunkCount: number; indexedAt: number }> }

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export class RagController {
  /** Indexed file cache: filePath → retriever + metadata */
  private index = new Map<string, IndexedFile>()
  /** Active streaming queries: runId → AbortController */
  private activeRuns = new Map<string, AbortController>()

  private storeService: StoreService

  constructor(storeService: StoreService) {
    this.storeService = storeService
  }

  // --------------------------------------------------------------------------
  // Indexing
  // --------------------------------------------------------------------------

  /**
   * Loads, splits, embeds and stores a file.
   * Returns immediately to the caller once the index is built.
   * Subsequent calls with the same path re-index (refreshes the cache).
   */
  async indexFile(
    filePath: string,
    providerId: string,
    win: BrowserWindow
  ): Promise<RagIndexResult> {
    const settings = this.storeService.getModelSettings(providerId)
    const apiKey = settings?.apiToken || import.meta.env.VITE_OPENAI_API_KEY
    if (!apiKey) {
      throw new Error(`No API token configured for provider: ${providerId}`)
    }

    console.log(`[RAG] Indexing "${filePath}" …`)

    const result = await indexFile({
      filePath,
      apiKey,
      chunkSize: 1000,
      chunkOverlap: 200,
      topK: 4
    })

    this.index.set(result.filePath, {
      filePath: result.filePath,
      chunkCount: result.chunkCount,
      indexedAt: Date.now(),
      retriever: result.retriever
    })

    console.log(`[RAG] Indexed "${result.filePath}" — ${result.chunkCount} chunks`)

    // Notify renderer of the updated index list
    win.webContents.send('rag:status', this.getStatus())

    return { filePath: result.filePath, chunkCount: result.chunkCount }
  }

  // --------------------------------------------------------------------------
  // Query (streaming)
  // --------------------------------------------------------------------------

  /**
   * Runs a RAG query against an already-indexed file.
   * Streams tokens back to the renderer window via webContents.send.
   *
   * The same event channel names as AgentController are reused so the
   * renderer can use a unified streaming hook if needed:
   *   rag:token / rag:done / rag:error
   */
  async queryFile(
    filePath: string,
    question: string,
    runId: string,
    providerId: string,
    win: BrowserWindow
  ): Promise<void> {
    const indexed = this.index.get(filePath) ?? this.findByBasename(filePath)
    if (!indexed) {
      win.webContents.send('rag:error', {
        runId,
        error: `File not indexed. Call rag:index first for: ${filePath}`
      } satisfies RagErrorEvent)
      return
    }

    const settings = this.storeService.getModelSettings(providerId)
    const apiKey = settings?.apiToken || import.meta.env.VITE_OPENAI_API_KEY
    if (!apiKey) {
      win.webContents.send('rag:error', {
        runId,
        error: `No API token configured for provider: ${providerId}`
      } satisfies RagErrorEvent)
      return
    }

    const abortController = new AbortController()
    this.activeRuns.set(runId, abortController)

    try {
      console.log(`[RAG] Run ${runId} — query: "${question}"`)

      const chain = buildRagChain({
        retriever: indexed.retriever,
        apiKey,
        modelId: settings?.selectedModel || import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini',
        signal: abortController.signal
      })

      for await (const token of chain.stream(question)) {
        if (abortController.signal.aborted) break
        win.webContents.send('rag:token', { runId, token } satisfies RagTokenEvent)
      }

      if (!abortController.signal.aborted) {
        console.log(`[RAG] Run ${runId} complete`)
        win.webContents.send('rag:done', { runId } satisfies RagDoneEvent)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      const isAbort = msg.toLowerCase().includes('abort') || msg.toLowerCase().includes('cancel')

      if (isAbort) {
        console.log(`[RAG] Run ${runId} cancelled`)
        win.webContents.send('rag:done', { runId, cancelled: true } satisfies RagDoneEvent)
      } else {
        console.error(`[RAG] Run ${runId} error:`, msg)
        win.webContents.send('rag:error', { runId, error: msg } satisfies RagErrorEvent)
      }
    } finally {
      this.activeRuns.delete(runId)
    }
  }

  // --------------------------------------------------------------------------
  // Cancellation
  // --------------------------------------------------------------------------

  cancel(runId: string): void {
    const ctrl = this.activeRuns.get(runId)
    if (ctrl) {
      console.log(`[RAG] Cancelling run ${runId}`)
      ctrl.abort()
      this.activeRuns.delete(runId)
    }
  }

  // --------------------------------------------------------------------------
  // Status / helpers
  // --------------------------------------------------------------------------

  getStatus(): RagStatusResult {
    return {
      files: Array.from(this.index.values()).map(({ filePath, chunkCount, indexedAt }) => ({
        filePath,
        chunkCount,
        indexedAt
      }))
    }
  }

  private findByBasename(filePath: string): IndexedFile | undefined {
    const base = filePath.replace(/\\/g, '/').split('/').pop()
    for (const entry of this.index.values()) {
      if (entry.filePath.replace(/\\/g, '/').split('/').pop() === base) return entry
    }
    return undefined
  }
}
