import { BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import { is } from '@electron-toolkit/utils'

export class WorkspaceSelector {
  private window: BrowserWindow | null = null
  private selectedWorkspace: string | null = null
  private resolveWorkspace: ((workspace: string | null) => void) | null = null

  constructor() {
    // Note: 'workspace:select-folder' is now registered in WorkspaceIpc module
    // to avoid duplicate registration. Kept here are only the window-specific handlers.

    ipcMain.handle('workspace:confirm', (_event, workspacePath: string) => {
      this.selectedWorkspace = workspacePath
      if (this.resolveWorkspace) {
        this.resolveWorkspace(workspacePath)
      }
      this.close()
    })

    ipcMain.handle('workspace:cancel', () => {
      if (this.resolveWorkspace) {
        this.resolveWorkspace(null)
      }
      this.close()
    })
  }

  async show(): Promise<string | null> {
    return new Promise((resolve) => {
      this.resolveWorkspace = resolve
      this.createWindow()
    })
  }

  private createWindow(): void {
    this.window = new BrowserWindow({
      width: 600,
      height: 450,
      minWidth: 500,
      minHeight: 400,
      show: false,
      resizable: true,
      center: true,
      title: 'Select Workspace',
      icon: path.join(__dirname, '../../resources/icons/icon.png'),
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.mjs'),
        sandbox: false,
        nodeIntegration: false,
        contextIsolation: true,
        devTools: is.dev,
        webSecurity: true,
        allowRunningInsecureContent: false
      },
      frame: true,
      backgroundColor: '#FFFFFF'
    })

    // Load workspace selection page
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this.window.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/workspace-selector`)
    } else {
      this.window.loadFile(path.join(__dirname, '../renderer/index.html'), {
        hash: 'workspace-selector'
      })
    }

    this.window.once('ready-to-show', () => {
      this.window?.show()
    })

    this.window.on('closed', () => {
      this.window = null
      // If window was closed without selection, resolve with null
      if (this.resolveWorkspace) {
        this.resolveWorkspace(null)
        this.resolveWorkspace = null
      }
    })
  }

  private close(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.close()
    }
    this.window = null
  }

  getSelectedWorkspace(): string | null {
    return this.selectedWorkspace
  }
}
