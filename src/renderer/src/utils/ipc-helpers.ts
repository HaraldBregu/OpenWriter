import type { IpcResult } from '../../../main/ipc/IpcErrorHandler'

/**
 * Safely unwraps an IPC result, throwing an error if the call failed
 *
 * @param promise - The IPC call promise that returns an IpcResult
 * @returns The unwrapped data from the IPC call
 * @throws Error if the IPC call failed
 *
 * @example
 * ```typescript
 * // Without helper (manual error checking)
 * const result = await window.api.someCall()
 * if (!result.success) {
 *   throw new Error(result.error.message)
 * }
 * const data = result.data
 *
 * // With helper (automatic error handling)
 * const data = await safeIpcCall(window.api.someCall())
 * ```
 */
export async function safeIpcCall<T>(promise: Promise<IpcResult<T>>): Promise<T> {
  const result = await promise
  if (!result.success) {
    throw new Error(result.error.message)
  }
  return result.data
}

/**
 * Safely unwraps an IPC result with custom error handling
 *
 * @param promise - The IPC call promise that returns an IpcResult
 * @param onError - Custom error handler function
 * @returns The unwrapped data from the IPC call, or the result of onError
 *
 * @example
 * ```typescript
 * const data = await safeIpcCallWithHandler(
 *   window.api.someCall(),
 *   (error) => {
 *     console.error('Custom error handling:', error)
 *     return defaultValue
 *   }
 * )
 * ```
 */
export async function safeIpcCallWithHandler<T, E = T>(
  promise: Promise<IpcResult<T>>,
  onError: (error: { code: string; message: string }) => E
): Promise<T | E> {
  const result = await promise
  if (!result.success) {
    return onError(result.error)
  }
  return result.data
}

/**
 * Checks if an IPC result is successful without throwing
 *
 * @param result - The IPC result to check
 * @returns true if successful, false otherwise
 */
export function isIpcSuccess<T>(result: IpcResult<T>): result is { success: true; data: T } {
  return result.success === true
}

/**
 * Checks if an IPC result is an error without throwing
 *
 * @param result - The IPC result to check
 * @returns true if error, false otherwise
 */
export function isIpcError<T>(
  result: IpcResult<T>
): result is { success: false; error: { code: string; message: string } } {
  return result.success === false
}
