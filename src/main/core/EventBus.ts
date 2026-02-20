import { BrowserWindow } from 'electron'

/**
 * Centralized event bus for Main -> Renderer communication.
 * Replaces the repeated BrowserWindow.getAllWindows().forEach() pattern.
 */
export class EventBus {
  /**
   * Broadcast a message to all open renderer windows.
   */
  broadcast(channel: string, ...args: unknown[]): void {
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, ...args)
      }
    })
  }

  /**
   * Send a message to a specific window.
   */
  sendTo(windowId: number, channel: string, ...args: unknown[]): void {
    const win = BrowserWindow.fromId(windowId)
    if (win && !win.isDestroyed()) {
      win.webContents.send(channel, ...args)
    }
  }
}
