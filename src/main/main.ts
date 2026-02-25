import { BrowserWindow, nativeTheme } from 'electron'
import type { AppState } from './core/AppState'
import type { WindowFactory } from './core/WindowFactory'
import type { WindowContextManager } from './core/WindowContext'

function getBackgroundColor(): string {
  return nativeTheme.shouldUseDarkColors ? '#1A1A1A' : '#F7F7F7'
}

export class Main {
  private window: BrowserWindow | null = null
  private onWindowVisibilityChange?: () => void

<<<<<<< Updated upstream
  constructor(
    private appState: AppState,
    private windowFactory: WindowFactory,
    private windowContextManager: WindowContextManager
  ) {
    // Constructor is now minimal
    // All services are managed by ServiceContainer in bootstrap
    // All IPC handlers are registered in IPC modules via bootstrap
    console.log('[Main] Main class initialized')
  }
=======
  constructor(lifecycleService: LifecycleService) {
    // Initialize services
    this.mediaPermissions = new MediaPermissionsService()
    this.bluetoothService = new BluetoothService()
    this.networkService = new NetworkService()
    this.cronService = new CronService()
    this.updateService = new UpdateService()
    this.updateSimulator = new UpdateSimulator()
    this.lifecycleService = lifecycleService
    this.windowManagerService = new WindowManagerService()
    this.filesystemService = new FilesystemService()
    this.dialogService = new DialogService()
    this.notificationService = new NotificationService()
    this.clipboardService = new ClipboardService()
    this.storeService = new StoreService()
    this.agentController = new AgentController(this.storeService)
    this.ragController = new RagController(this.storeService)

    // Existing sound handler
    ipcMain.on('play-sound', () => {
      const soundPath = is.dev
        ? path.join(__dirname, '../../resources/sounds/click6.wav')
        : path.join(process.resourcesPath, 'resources/sounds/click6.wav')
      if (process.platform === 'darwin') {
        exec(`afplay "${soundPath}"`)
      } else if (process.platform === 'win32') {
        exec(`powershell -c "(New-Object Media.SoundPlayer '${soundPath}').PlaySync()"`)
      } else {
        exec(`aplay "${soundPath}"`)
      }
    })

    // Context menu handler
    ipcMain.on('context-menu', (event) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) return

      const editMenu = Menu.buildFromTemplate([
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ])
      editMenu.popup({ window: win })
    })

    ipcMain.on('context-menu-editable', (event) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) return

      const editMenu = Menu.buildFromTemplate([
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { type: 'separator' },
        { role: 'selectAll' }
      ])
      editMenu.popup({ window: win })
    })

    // Window control handlers
    ipcMain.on('window-minimize', (event) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      win?.minimize()
    })

    ipcMain.on('window-maximize', (event) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (win?.isMaximized()) {
        win.unmaximize()
      } else {
        win?.maximize()
      }
    })

    ipcMain.on('window-close', (event) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      win?.close()
    })

    ipcMain.handle('window-is-maximized', (event) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      return win?.isMaximized() ?? false
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

    // Window Manager handlers
    ipcMain.handle('wm-get-state', () => {
      return this.windowManagerService.getState()
    })

    ipcMain.handle('wm-create-child', () => {
      return this.windowManagerService.createChildWindow()
    })

    ipcMain.handle('wm-create-modal', () => {
      return this.windowManagerService.createModalWindow()
    })

    ipcMain.handle('wm-create-frameless', () => {
      return this.windowManagerService.createFramelessWindow()
    })

    ipcMain.handle('wm-create-widget', () => {
      return this.windowManagerService.createWidgetWindow()
    })

    ipcMain.handle('wm-close-window', (_event, id: number) => {
      return this.windowManagerService.closeWindow(id)
    })

    ipcMain.handle('wm-close-all', () => {
      this.windowManagerService.closeAllManaged()
    })

    // Forward window manager state changes to all renderer windows
    this.windowManagerService.onStateChange((state) => {
      BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send('wm-state-changed', state)
      })
    })

    // Filesystem handlers
    ipcMain.handle('fs-open-file', async () => {
      return await this.filesystemService.openFileDialog()
    })

    ipcMain.handle('fs-read-file', async (_event, filePath: string) => {
      return await this.filesystemService.readFile(filePath)
    })

    ipcMain.handle('fs-save-file', async (_event, defaultName: string, content: string) => {
      return await this.filesystemService.saveFileDialog(defaultName, content)
    })

    ipcMain.handle('fs-write-file', async (_event, filePath: string, content: string) => {
      return await this.filesystemService.writeFile(filePath, content)
    })

    ipcMain.handle('fs-select-directory', async () => {
      return await this.filesystemService.selectDirectory()
    })

    ipcMain.handle('fs-watch-directory', (_event, dirPath: string) => {
      return this.filesystemService.watchDirectory(dirPath)
    })

    ipcMain.handle('fs-unwatch-directory', (_event, dirPath: string) => {
      return this.filesystemService.unwatchDirectory(dirPath)
    })

    ipcMain.handle('fs-get-watched', () => {
      return this.filesystemService.getWatchedDirectories()
    })

    // Forward filesystem watch events to all renderer windows
    this.filesystemService.onWatchEvent((event) => {
      BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send('fs-watch-event', event)
      })
    })

    // Dialog handlers
    ipcMain.handle('dialog-open', async () => {
      return await this.dialogService.showOpenDialog()
    })

    ipcMain.handle('dialog-save', async () => {
      return await this.dialogService.showSaveDialog()
    })

    ipcMain.handle('dialog-message', async (_event, message: string, detail: string, buttons: string[]) => {
      return await this.dialogService.showMessageBox(message, detail, buttons)
    })

    ipcMain.handle('dialog-error', async (_event, title: string, content: string) => {
      return await this.dialogService.showErrorDialog(title, content)
    })

    // Notification handlers
    ipcMain.handle('notification-is-supported', () => {
      return this.notificationService.isSupported()
    })

    ipcMain.handle('notification-show', (_event, options: { title: string; body: string; silent?: boolean; urgency?: 'normal' | 'critical' | 'low' }) => {
      return this.notificationService.showNotification(options)
    })

    // Forward notification events to all renderer windows
    this.notificationService.onNotificationEvent((result) => {
      BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send('notification-event', result)
      })
    })

    // Clipboard handlers
    ipcMain.handle('clipboard-write-text', (_event, text: string) => {
      return this.clipboardService.writeText(text)
    })

    ipcMain.handle('clipboard-read-text', () => {
      return this.clipboardService.readText()
    })

    ipcMain.handle('clipboard-write-html', (_event, html: string) => {
      return this.clipboardService.writeHTML(html)
    })

    ipcMain.handle('clipboard-read-html', () => {
      return this.clipboardService.readHTML()
    })

    ipcMain.handle('clipboard-write-image', (_event, dataURL: string) => {
      return this.clipboardService.writeImage(dataURL)
    })

    ipcMain.handle('clipboard-read-image', () => {
      return this.clipboardService.readImage()
    })

    ipcMain.handle('clipboard-clear', () => {
      return this.clipboardService.clear()
    })

    ipcMain.handle('clipboard-get-content', () => {
      return this.clipboardService.getContent()
    })

    ipcMain.handle('clipboard-get-formats', () => {
      return this.clipboardService.getAvailableFormats()
    })

    ipcMain.handle('clipboard-has-text', () => {
      return this.clipboardService.hasText()
    })

    ipcMain.handle('clipboard-has-image', () => {
      return this.clipboardService.hasImage()
    })

    ipcMain.handle('clipboard-has-html', () => {
      return this.clipboardService.hasHTML()
    })

    // Store handlers
    ipcMain.handle('store-get-all-model-settings', () => {
      return this.storeService.getAllModelSettings()
    })

    ipcMain.handle('store-get-model-settings', (_event, providerId: string) => {
      return this.storeService.getModelSettings(providerId)
    })

    ipcMain.handle('store-set-selected-model', (_event, providerId: string, modelId: string) => {
      this.storeService.setSelectedModel(providerId, modelId)
    })

    ipcMain.handle('store-set-api-token', (_event, providerId: string, token: string) => {
      this.storeService.setApiToken(providerId, token)
    })

    ipcMain.handle('store-set-model-settings', (_event, providerId: string, settings: { selectedModel: string; apiToken: string }) => {
      this.storeService.setModelSettings(providerId, settings)
    })

    // Update Simulator handlers
    ipcMain.handle('update-sim-check', async () => {
      await this.updateSimulator.checkForUpdates()
    })

    ipcMain.handle('update-sim-download', async () => {
      await this.updateSimulator.downloadUpdate()
    })

    ipcMain.handle('update-sim-install', async () => {
      await this.updateSimulator.installAndRestart()
    })

    ipcMain.handle('update-sim-cancel', () => {
      this.updateSimulator.cancelDownload()
    })
>>>>>>> Stashed changes

  create(): BrowserWindow {
    const isMac = process.platform === 'darwin'
    this.window = this.windowFactory.create({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      frame: false,
      // titleBarStyle:'hidden' on Windows retains native min/max/close buttons.
      // Only use it on macOS where it hides the title bar while keeping traffic lights.
      ...(isMac && {
        titleBarStyle: 'hidden' as const,
        trafficLightPosition: { x: 16, y: 16 }
      }),
      backgroundColor: getBackgroundColor()
    })

    // Create window context for isolated services
    this.windowContextManager.create(this.window)
    console.log(`[Main] Created window context for window ${this.window.id}`)

    // Registering a handler for update-target-url tells Electron that the app
    // owns the status-bar display. An intentional no-op suppresses the native
    // Chromium URL bubble that would otherwise appear on link hover.
    this.window.webContents.on('update-target-url', () => {})

    this.window.once('ready-to-show', () => {
      this.window?.show()
    })

    this.window.on('maximize', () => {
      this.window?.webContents.send('window:maximize-change', true)
    })

    this.window.on('unmaximize', () => {
      this.window?.webContents.send('window:maximize-change', false)
    })

    this.window.on('enter-full-screen', () => {
      this.window?.webContents.send('window:fullscreen-change', true)
    })

    this.window.on('leave-full-screen', () => {
      this.window?.webContents.send('window:fullscreen-change', false)
    })

    // Minimize to tray instead of closing
    this.window.on('close', (event) => {
      if (!this.appState.isQuitting) {
        event.preventDefault()
        this.window?.hide()
        this.onWindowVisibilityChange?.()
      }
    })

    // Update tray menu when window is shown/hidden
    this.window.on('show', () => {
      this.onWindowVisibilityChange?.()
    })

    this.window.on('hide', () => {
      this.onWindowVisibilityChange?.()
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

  hide(): void {
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      windows[0].hide()
    }
  }

  toggleVisibility(): void {
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      const mainWindow = windows[0]
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    } else {
      this.create()
    }
  }

  isVisible(): boolean {
    const windows = BrowserWindow.getAllWindows()
    return windows.length > 0 && windows[0].isVisible()
  }

  setOnWindowVisibilityChange(callback: () => void): void {
    this.onWindowVisibilityChange = callback
  }

  createWindowForFile(filePath: string): BrowserWindow {
    const isMac = process.platform === 'darwin'
    const win = this.windowFactory.create({
      width: 1600,
      height: 1000,
      minWidth: 800,
      minHeight: 600,
      frame: false,
      ...(isMac && {
        titleBarStyle: 'hidden' as const,
        trafficLightPosition: { x: 9, y: 9 }
      }),
      backgroundColor: getBackgroundColor()
    })

    // Create window context for isolated services
    this.windowContextManager.create(win)
    console.log(`[Main] Created window context for file window ${win.id}`)

    win.once('ready-to-show', () => {
      win.show()
      win.webContents.send('file-opened', filePath)
    })

    return win
  }

  createWorkspaceWindow(): BrowserWindow {
    // Get the main window dimensions to calculate 10% smaller size
    const mainWindow = this.window
    let width = 1080 // 1200 * 0.9
    let height = 720 // 800 * 0.9

    if (mainWindow) {
      const [mainWidth, mainHeight] = mainWindow.getSize()
      width = Math.floor(mainWidth * 0.9)
      height = Math.floor(mainHeight * 0.9)
    }

    const isMac = process.platform === 'darwin'
    const workspaceWindow = this.windowFactory.create({
      width,
      height,
      minWidth: 800,
      minHeight: 600,
      frame: false,
      ...(isMac && {
        titleBarStyle: 'hidden' as const,
        trafficLightPosition: { x: 16, y: 16 }
      }),
      backgroundColor: getBackgroundColor()
    })

    // Create window context for isolated services
    // CRITICAL: This ensures each workspace window has its own WorkspaceService
    // and WorkspaceMetadataService instances, preventing data leakage
    this.windowContextManager.create(workspaceWindow)
    console.log(`[Main] Created window context for workspace window ${workspaceWindow.id}`)

    // Registering a handler for update-target-url tells Electron that the app
    // owns the status-bar display. An intentional no-op suppresses the native
    // Chromium URL bubble that would otherwise appear on link hover.
    workspaceWindow.webContents.on('update-target-url', () => {})

    workspaceWindow.once('ready-to-show', () => {
      workspaceWindow.show()
    })

    workspaceWindow.on('maximize', () => {
      workspaceWindow?.webContents.send('window:maximize-change', true)
    })

    workspaceWindow.on('unmaximize', () => {
      workspaceWindow?.webContents.send('window:maximize-change', false)
    })

    workspaceWindow.on('enter-full-screen', () => {
      workspaceWindow?.webContents.send('window:fullscreen-change', true)
    })

    workspaceWindow.on('leave-full-screen', () => {
      workspaceWindow?.webContents.send('window:fullscreen-change', false)
    })

    return workspaceWindow
  }

  getWindow(): BrowserWindow | null {
    return this.window
  }
}
