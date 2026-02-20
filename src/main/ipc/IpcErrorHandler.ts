import type { IpcMainInvokeEvent } from 'electron'

/**
 * Standardized IPC error response
 */
export interface IpcError {
  success: false
  error: {
    code: string
    message: string
    stack?: string
  }
}

/**
 * Standardized IPC success response
 */
export interface IpcSuccess<T> {
  success: true
  data: T
}

/**
 * Union type for IPC responses
 */
export type IpcResult<T> = IpcSuccess<T> | IpcError

/**
 * Wraps an IPC handler with standardized error handling
 *
 * @param handler - The IPC handler function to wrap
 * @param handlerName - Name of the handler for logging purposes
 * @returns Wrapped handler that returns IpcResult
 *
 * @example
 * ```typescript
 * ipcMain.handle('my-handler', wrapIpcHandler(
 *   async (event, arg1, arg2) => {
 *     // Your handler logic
 *     return result
 *   },
 *   'my-handler'
 * ))
 * ```
 */
export function wrapIpcHandler<TArgs extends unknown[], TResult>(
  handler: (event: IpcMainInvokeEvent, ...args: TArgs) => Promise<TResult> | TResult,
  handlerName: string
): (event: IpcMainInvokeEvent, ...args: TArgs) => Promise<IpcResult<TResult>> {
  return async (event: IpcMainInvokeEvent, ...args: TArgs): Promise<IpcResult<TResult>> => {
    try {
      const result = await handler(event, ...args)
      return { success: true, data: result }
    } catch (err) {
      console.error(`[IPC Error] ${handlerName}:`, err)
      const error = err instanceof Error ? err : new Error(String(err))
      return {
        success: false,
        error: {
          code: error.name || 'UnknownError',
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      }
    }
  }
}

/**
 * Wraps a simple handler (without event parameter) with standardized error handling
 *
 * @param handler - The handler function to wrap (without event parameter)
 * @param handlerName - Name of the handler for logging purposes
 * @returns Wrapped handler that returns IpcResult
 *
 * @example
 * ```typescript
 * ipcMain.handle('my-handler', wrapSimpleHandler(
 *   async (arg1, arg2) => {
 *     // Your handler logic
 *     return result
 *   },
 *   'my-handler'
 * ))
 * ```
 */
export function wrapSimpleHandler<TArgs extends unknown[], TResult>(
  handler: (...args: TArgs) => Promise<TResult> | TResult,
  handlerName: string
): (event: IpcMainInvokeEvent, ...args: TArgs) => Promise<IpcResult<TResult>> {
  return wrapIpcHandler((_event, ...args) => handler(...args), handlerName)
}
