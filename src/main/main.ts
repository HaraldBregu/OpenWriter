import { BrowserWindow, ipcMain } from 'electron'
import { exec } from 'node:child_process'
import path from 'node:path'
import { is } from '@electron-toolkit/utils'

export class Main {
  private window: BrowserWindow | null = null

  constructor() {
    ipcMain.on('play-sound', () => {
      const soundPath = is.dev
        ? path.join(__dirname, '../../resources/sounds/click1.wav')
        : path.join(process.resourcesPath, 'resources/sounds/click1.wav')
      if (process.platform === 'darwin') {
        exec(`afplay "${soundPath}"`)
      } else if (process.platform === 'win32') {
        exec(`powershell -c "(New-Object Media.SoundPlayer '${soundPath}').PlaySync()"`)
      } else {
        exec(`aplay "${soundPath}"`)
      }
    })
  }

  create(): BrowserWindow {
    this.window = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      show: false,
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
      trafficLightPosition: {
        x: 9,
        y: 9
      },
      backgroundColor: '#FFFFFF'
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this.window.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      this.window.loadFile(path.join(__dirname, '../renderer/index.html'))
    }

    this.window.once('ready-to-show', () => {
      this.window?.show()
    })

    this.window.on('closed', () => {
      this.window = null
    })

    return this.window
  }

  showOrCreate(): void {
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      windows[0].show()
      windows[0].focus()
    } else {
      this.create()
    }
  }
}
