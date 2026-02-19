import { BrowserWindow, ipcMain, app, Menu, dialog } from 'electron'
import { exec } from 'node:child_process'
import path from 'node:path'
import { is } from '@electron-toolkit/utils'
import { MediaPermissionsService } from './services/media-permissions'
import { BluetoothService } from './services/bluetooth'
import { NetworkService } from './services/network'
import { CronService } from './services/cron'
import { UpdateService } from './services/update'
import { LifecycleService } from './services/lifecycle'
import { WindowManagerService } from './services/window-manager'
import { FilesystemService } from './services/filesystem'
import { DialogService } from './services/dialogs'
import { NotificationService } from './services/notification'
import { ClipboardService } from './services/clipboard'
import { UpdateSimulator } from './services/update-simulator'
import { StoreService } from './services/store'
import { AgentService } from './services/agent'
import { RagController } from './rag/RagController'

export class Main {
  private window: BrowserWindow | null = null
  private mediaPermissions: MediaPermissionsService
  private bluetoothService: BluetoothService
  private networkService: NetworkService
  private cronService: CronService
  private updateService: UpdateService
  private updateSimulator: UpdateSimulator
  private lifecycleService: LifecycleService
  private windowManagerService: WindowManagerService
  private filesystemService: FilesystemService
  private dialogService: DialogService
  private notificationService: NotificationService
  private clipboardService: ClipboardService
  private storeService: StoreService
  private agentService: AgentService
  private ragController: RagController
  private currentWorkspace: string | null = null
  private onWindowVisibilityChange?: () => void

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
    this.agentService = new AgentService(this.storeService)
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

    // Workspace handlers
    ipcMain.handle('workspace:select-folder', async () => {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory'],
        title: 'Select Workspace Folder',
        buttonLabel: 'Select Workspace'
      })

      if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0]
      }
      return null
    })

    ipcMain.handle('workspace-get-current', () => {
      return this.currentWorkspace
    })

    ipcMain.handle('workspace-set-current', (_event, workspacePath: string) => {
      console.log('[Main] Setting current workspace:', workspacePath)
      this.currentWorkspace = workspacePath
      // Add to recent workspaces in store for persistence
      this.storeService.setCurrentWorkspace(workspacePath)
    })

    ipcMain.handle('workspace-get-recent', () => {
      return this.storeService.getRecentWorkspaces()
    })

    ipcMain.handle('workspace-clear', () => {
      console.log('[Main] Clearing current workspace')
      this.currentWorkspace = null
      this.storeService.clearCurrentWorkspace()
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

    ipcMain.handle('update-sim-reset', () => {
      this.updateSimulator.reset()
    })

    ipcMain.handle('update-sim-get-state', () => {
      return this.updateSimulator.getState()
    })

    // Forward update simulator state changes to all renderer windows
    this.updateSimulator.onStateChange((state) => {
      BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send('update-sim-state-changed', state)
      })
    })

    // Forward update simulator progress to all renderer windows
    this.updateSimulator.onProgress((progress) => {
      BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send('update-sim-progress', progress)
      })
    })

    // Agent handlers - register all multi-agent IPC handlers
    this.agentService.registerHandlers()

    // RAG handlers
    ipcMain.handle(
      'rag:index',
      async (_event, filePath: string, providerId: string) => {
        const win = BrowserWindow.fromWebContents(_event.sender)
        if (!win) throw new Error('No window')
        return this.ragController.indexFile(filePath, providerId, win)
      }
    )

    ipcMain.handle(
      'rag:query',
      (_event, filePath: string, question: string, runId: string, providerId: string) => {
        const win = BrowserWindow.fromWebContents(_event.sender)
        if (!win) return
        this.ragController.queryFile(filePath, question, runId, providerId, win).catch((err) => {
          console.error('[RAG] Unhandled error:', err)
        })
      }
    )

    ipcMain.on('rag:cancel', (_event, runId: string) => {
      this.ragController.cancel(runId)
    })

    ipcMain.handle('rag:status', () => {
      return this.ragController.getStatus()
    })

    // Application popup menu (hamburger button)
    ipcMain.handle('window:popup-menu', (event) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) return

      const menu = Menu.buildFromTemplate([
        {
          label: 'File',
          submenu: [
            { label: 'New File', accelerator: 'CmdOrCtrl+N', click: () => {} },
            { label: 'Open File...', accelerator: 'CmdOrCtrl+O', click: () => {} },
            { type: 'separator' },
            { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => {} },
            { label: 'Save As...', accelerator: 'CmdOrCtrl+Shift+S', click: () => {} },
            { type: 'separator' },
            {
              label: 'Exit',
              click: () => {
                ;(app as { isQuitting?: boolean }).isQuitting = true
                app.quit()
              }
            }
          ]
        },
        {
          label: 'Edit',
          submenu: [
            { role: 'undo' as const },
            { role: 'redo' as const },
            { type: 'separator' as const },
            { role: 'cut' as const },
            { role: 'copy' as const },
            { role: 'paste' as const },
            { role: 'selectAll' as const }
          ]
        },
        {
          label: 'View',
          submenu: [
            { role: 'reload' as const },
            { role: 'forceReload' as const },
            { type: 'separator' as const },
            { role: 'zoomIn' as const },
            { role: 'zoomOut' as const },
            { role: 'resetZoom' as const },
            { type: 'separator' as const },
            { role: 'togglefullscreen' as const }
          ]
        },
        {
          label: 'Help',
          submenu: [{ label: 'About Tesseract AI', click: () => {} }]
        }
      ])

      menu.popup({ window: win })
    })

    // Window control handlers
    ipcMain.on('window:minimize', (event) => {
      BrowserWindow.fromWebContents(event.sender)?.minimize()
    })

    ipcMain.on('window:maximize', (event) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) return
      if (win.isMaximized()) {
        win.unmaximize()
      } else {
        win.maximize()
      }
    })

    ipcMain.on('window:close', (event) => {
      BrowserWindow.fromWebContents(event.sender)?.close()
    })

    ipcMain.handle('window:is-maximized', (event) => {
      return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false
    })

    ipcMain.handle('window:get-platform', () => {
      return process.platform
    })
  }

  create(): BrowserWindow {
    this.window = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      show: false,
      // titleBarStyle: 'hidden', // optional macOS polish
      // titleBarStyle: "hiddenInset",
      // titleBarOverlay: true,
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
      frame: false,
      titleBarStyle: 'hidden',
      trafficLightPosition: {
        x: 16,
        y: 16,
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

    this.window.on('maximize', () => {
      this.window?.webContents.send('window:maximize-change', true)
    })

    this.window.on('unmaximize', () => {
      this.window?.webContents.send('window:maximize-change', false)
    })

    // Minimize to tray instead of closing
    this.window.on('close', (event) => {
      if (!(app as { isQuitting?: boolean }).isQuitting) {
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
    const win = new BrowserWindow({
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
      win.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      win.loadFile(path.join(__dirname, '../renderer/index.html'))
    }

    win.once('ready-to-show', () => {
      win.show()
      win.webContents.send('file-opened', filePath)
    })

    return win
  }

  getWindow(): BrowserWindow | null {
    return this.window
  }
}
