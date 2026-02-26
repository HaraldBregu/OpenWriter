// ---------------------------------------------------------------------------
// Shared IPC Result Types
// ---------------------------------------------------------------------------
// Single source of truth for IPC result envelope types.
// Imported by main (IpcErrorHandler), preload (typed-ipc), and renderer.
//
// DO NOT import Electron, Node.js, React, or any browser APIs here.
// This file must be valid in all three process contexts.
// ---------------------------------------------------------------------------

/**
 * Standardized IPC error response.
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
 * Standardized IPC success response.
 */
export interface IpcSuccess<T> {
  success: true
  data: T
}

/**
 * Union type for IPC responses.
 */
export type IpcResult<T> = IpcSuccess<T> | IpcError
