/**
 * Helper utilities for IPC handlers to access window-scoped services.
 */

import { BrowserWindow } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { WindowContextManager } from '../core/WindowContext'

/**
 * Get the window context for an IPC event.
 * This allows IPC handlers to access window-scoped services.
 *
 * @param event - The IPC event from ipcMain.handle()
 * @param container - The global service container
 * @returns The WindowContext for this event's window
 * @throws Error if window context not found
 */
export function getWindowContext(event: IpcMainInvokeEvent, container: ServiceContainer) {
  // Validate event and sender
  if (!event) {
    throw new Error('[IpcHelpers] IPC event is null or undefined')
  }

  if (!event.sender) {
    throw new Error('[IpcHelpers] IPC event.sender is null or undefined')
  }

  // Get WindowContextManager from global container
  const windowContextManager = container.get<WindowContextManager>('windowContextManager')

  // Get BrowserWindow from WebContents
  const window = BrowserWindow.fromWebContents(event.sender)

  if (!window) {
    throw new Error(
      `[IpcHelpers] Cannot get BrowserWindow from WebContents (sender ID: ${event.sender.id}). ` +
      'Window may have been destroyed or WebContents is detached.'
    )
  }

  // Get WindowContext for this window
  try {
    return windowContextManager.get(window.id)
  } catch (error) {
    throw new Error(
      `[IpcHelpers] No WindowContext found for window ID ${window.id}. ` +
      'Window context may not have been created. ' +
      `Original error: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Get a window-scoped service from the correct context.
 *
 * @param event - The IPC event
 * @param container - The global service container
 * @param serviceKey - The service key to retrieve
 * @returns The service instance from the window's context
 */
export function getWindowService<T>(
  event: IpcMainInvokeEvent,
  container: ServiceContainer,
  serviceKey: string
): T {
  const windowContext = getWindowContext(event, container)
  return windowContext.getService<T>(serviceKey, container)
}
