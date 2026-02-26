// ---------------------------------------------------------------------------
// Type-safe IPC wrappers for the preload script
// ---------------------------------------------------------------------------
import { ipcRenderer } from 'electron'
import type { IpcResult } from '../shared/types/ipc/ipc-result'
import type { InvokeChannelMap, SendChannelMap, EventChannelMap } from '../shared/types/ipc/channels'

/**
 * Type-safe wrapper around ipcRenderer.invoke.
 * Returns the raw result from the main process handler.
 */
export function typedInvoke<C extends keyof InvokeChannelMap>(
  channel: C,
  ...args: InvokeChannelMap[C]['args']
): Promise<InvokeChannelMap[C]['result']> {
  return ipcRenderer.invoke(channel, ...args)
}

/**
 * Type-safe wrapper around ipcRenderer.invoke for IpcResult-wrapped channels.
 * Returns the raw IpcResult envelope without unwrapping.
 */
export function typedInvokeRaw<C extends keyof InvokeChannelMap>(
  channel: C,
  ...args: InvokeChannelMap[C]['args']
): Promise<IpcResult<InvokeChannelMap[C]['result']>> {
  return ipcRenderer.invoke(channel, ...args)
}

/**
 * Type-safe wrapper around ipcRenderer.invoke that auto-unwraps IpcResult.
 * Throws an Error if the IPC call returned a failure envelope.
 */
export async function typedInvokeUnwrap<C extends keyof InvokeChannelMap>(
  channel: C,
  ...args: InvokeChannelMap[C]['args']
): Promise<InvokeChannelMap[C]['result']> {
  const result: IpcResult<InvokeChannelMap[C]['result']> = await ipcRenderer.invoke(channel, ...args)
  if (result.success) {
    return result.data
  }
  const err = result as { success: false; error: { code: string; message: string; stack?: string } }
  const error = new Error(err.error.message)
  error.name = err.error.code
  if (err.error.stack) {
    error.stack = err.error.stack
  }
  throw error
}

/**
 * Type-safe wrapper around ipcRenderer.send (fire-and-forget).
 */
export function typedSend<C extends keyof SendChannelMap>(
  channel: C,
  ...args: SendChannelMap[C]['args']
): void {
  ipcRenderer.send(channel, ...args)
}

/**
 * Type-safe wrapper around ipcRenderer.on for push events from main.
 * Returns a cleanup function that removes the listener.
 */
export function typedOn<C extends keyof EventChannelMap>(
  channel: C,
  callback: (data: EventChannelMap[C]['data']) => void
): () => void {
  const handler = (_event: Electron.IpcRendererEvent, data: EventChannelMap[C]['data']): void => {
    callback(data)
  }
  ipcRenderer.on(channel, handler)
  return () => {
    ipcRenderer.removeListener(channel, handler)
  }
}
