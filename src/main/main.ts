import { BrowserWindow, ipcMain, app } from 'electron'
import { exec } from 'node:child_process'
import path from 'node:path'
import { is } from '@electron-toolkit/utils'
import { MediaPermissionsService } from './services/media-permissions'
import { BluetoothService } from './services/bluetooth'
import { NetworkService } from './services/network'
import { CronService } from './services/cron'
import { UpdateService } from './services/update'
import { LifecycleService } from './services/lifecycle'

export class Main {
  private window: BrowserWindow | null = null
  private mediaPermissions: MediaPermissionsService
  private bluetoothService: BluetoothService
  private networkService: NetworkService
  private cronService: CronService
  private updateService: UpdateService
  private lifecycleService: LifecycleService

  constructor(lifecycleService: LifecycleService) {
    // Initialize services
    this.mediaPermissions = new MediaPermissionsService()
    this.bluetoothService = new BluetoothService()
    this.networkService = new NetworkService()
    this.cronService = new CronService()
    this.updateService = new UpdateService()
    this.lifecycleService = lifecycleService

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

    // Network handlers
    ipcMain.handle('network-is-supported', () => {
      return this.networkService.isNetworkSupported()
    })

    ipcMain.handle('network-get-connection-status', async () => {
      return await this.networkService.getConnectionStatus()
    })

    ipcMain.handle('network-get-interfaces', () => {
      return this.networkService.getNetworkInterfaces()
    })

    ipcMain.handle('network-get-info', () => {
      return this.networkService.getNetworkInfo()
    })

    // Network event listeners would go here
    // Note: Electron doesn't have a built-in network status change event
    // For real-time monitoring, consider using a Node.js library like 'internet-available'

    // Cron handlers
    ipcMain.handle('cron-get-all-jobs', () => {
      return this.cronService.getAllJobs()
    })

    ipcMain.handle('cron-get-job', (_event, id: string) => {
      return this.cronService.getJob(id)
    })

    ipcMain.handle('cron-start-job', (_event, id: string) => {
      return this.cronService.startJob(id)
    })

    ipcMain.handle('cron-stop-job', (_event, id: string) => {
      return this.cronService.stopJob(id)
    })

    ipcMain.handle('cron-delete-job', (_event, id: string) => {
      return this.cronService.deleteJob(id)
    })

    ipcMain.handle('cron-create-job', (_event, config) => {
      return this.cronService.createJob(config)
    })

    ipcMain.handle('cron-update-schedule', (_event, id: string, schedule: string) => {
      return this.cronService.updateJobSchedule(id, schedule)
    })

    ipcMain.handle('cron-validate-expression', (_event, expression: string) => {
      return this.cronService.validateCronExpression(expression)
    })

    // Set up cron job result listener
    this.cronService.onJobResult((result) => {
      BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send('cron-job-result', result)
      })
    })

    // Initialize default cron jobs
    this.cronService.initialize()

    // Update handlers
    ipcMain.handle('update-get-state', () => {
      return this.updateService.getState()
    })

    ipcMain.handle('update-get-version', () => {
      return app.getVersion()
    })

    ipcMain.handle('update-check', () => {
      this.updateService.checkForUpdates()
    })

    ipcMain.handle('update-install', () => {
      this.updateService.installUpdate()
    })

    // Forward update state changes to all renderer windows
    this.updateService.onStateChange((state) => {
      BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send('update-state-changed', state)
      })
    })

    // Initialize auto-update
    this.updateService.initialize()

    // Lifecycle handlers
    ipcMain.handle('lifecycle-get-state', () => {
      return this.lifecycleService.getState()
    })

    ipcMain.handle('lifecycle-get-events', () => {
      return this.lifecycleService.getEvents()
    })

    ipcMain.handle('lifecycle-restart', () => {
      this.lifecycleService.restart()
    })

    // Forward lifecycle events to all renderer windows
    this.lifecycleService.onEvent((event) => {
      BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send('lifecycle-event', event)
      })
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
