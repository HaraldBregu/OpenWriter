import { BrowserWindow, ipcMain } from 'electron'
import { exec } from 'node:child_process'
import path from 'node:path'
import { is } from '@electron-toolkit/utils'
import { MediaPermissionsService } from './services/media-permissions'
import { BluetoothService } from './services/bluetooth'

export class Main {
  private window: BrowserWindow | null = null
  private mediaPermissions: MediaPermissionsService
  private bluetoothService: BluetoothService

  constructor() {
    // Initialize services
    this.mediaPermissions = new MediaPermissionsService()
    this.bluetoothService = new BluetoothService()

    // Existing sound handler
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

    // Media permission handlers
    ipcMain.handle('request-microphone-permission', async () => {
      return await this.mediaPermissions.requestMicrophonePermission()
    })

    ipcMain.handle('request-camera-permission', async () => {
      return await this.mediaPermissions.requestCameraPermission()
    })

    ipcMain.handle('get-microphone-status', async () => {
      return await this.mediaPermissions.getMicrophonePermissionStatus()
    })

    ipcMain.handle('get-camera-status', async () => {
      return await this.mediaPermissions.getCameraPermissionStatus()
    })

    ipcMain.handle('get-media-devices', async (_event, type: 'audioinput' | 'videoinput') => {
      return await this.mediaPermissions.getMediaDevices(type)
    })

    // Bluetooth handlers
    ipcMain.handle('bluetooth-is-supported', () => {
      return this.bluetoothService.isBluetoothSupported()
    })

    ipcMain.handle('bluetooth-get-permission-status', async () => {
      return await this.bluetoothService.getBluetoothPermissionStatus()
    })

    ipcMain.handle('bluetooth-get-info', () => {
      return this.bluetoothService.getBluetoothInfo()
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
