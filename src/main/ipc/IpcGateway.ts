/**
 * CQS (Command-Query Separation) gateway helpers for IPC registration.
 *
 * `registerQuery` — read-only operations (no mutation).
 * `registerCommand` — operations that mutate state.
 *
 * Both delegate to the existing `wrapIpcHandler` / `wrapSimpleHandler` from
 * IpcErrorHandler — zero runtime cost, just an organisational signal that
 * makes intent explicit at the registration site and enables future
 * middleware hooks.
 */

import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import { wrapSimpleHandler, wrapIpcHandler } from './IpcErrorHandler'

/**
 * Register a read-only query handler on `channel`.
 * The handler does **not** receive the raw IpcMainInvokeEvent.
 */
export function registerQuery<TArgs extends unknown[], TResult>(
  channel: string,
  handler: (...args: TArgs) => Promise<TResult> | TResult
): void {
  ipcMain.handle(channel, wrapSimpleHandler(handler, channel))
}

/**
 * Register a state-mutating command handler on `channel`.
 * The handler does **not** receive the raw IpcMainInvokeEvent.
 */
export function registerCommand<TArgs extends unknown[], TResult>(
  channel: string,
  handler: (...args: TArgs) => Promise<TResult> | TResult
): void {
  ipcMain.handle(channel, wrapSimpleHandler(handler, channel))
}

/**
 * Register a state-mutating command handler that needs access to the raw
 * IpcMainInvokeEvent (e.g. to read `event.sender`).
 */
export function registerCommandWithEvent<TArgs extends unknown[], TResult>(
  channel: string,
  handler: (event: IpcMainInvokeEvent, ...args: TArgs) => Promise<TResult> | TResult
): void {
  ipcMain.handle(channel, wrapIpcHandler(handler, channel))
}
