import { app, BrowserWindow } from 'electron'
import { Main } from './main'
import { Tray } from './tray'
import { Menu } from './menu'
import { LifecycleService } from './services/lifecycle'

// Add isQuitting property to app
;(app as { isQuitting?: boolean }).isQuitting = false

// Must be created before app.whenReady() for single-instance lock
const lifecycleService = new LifecycleService()

const mainWindow = new Main(lifecycleService)

const trayManager = new Tray({
  onShowApp: () => mainWindow.showOrCreate(),
  onHideApp: () => mainWindow.hide(),
  onToggleApp: () => mainWindow.toggleVisibility(),
  onQuit: () => {
    ;(app as { isQuitting?: boolean }).isQuitting = true
    app.quit()
  },
  isAppVisible: () => mainWindow.isVisible()
})

const menuManager = new Menu({
  onLanguageChange: (lng) => {
    trayManager.updateLanguage(lng)
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('change-language', lng)
    })
  },
  onThemeChange: (theme) => {
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('change-theme', theme)
    })
  }
})

app.whenReady().then(() => {
  lifecycleService.initialize()
  menuManager.create()
  trayManager.create()
  mainWindow.create()

  // Update tray menu when window visibility changes
  mainWindow.setOnWindowVisibilityChange(() => {
    trayManager.updateContextMenu()
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow.create()
    }
  })
})

app.on('window-all-closed', () => {
  // Don't quit the app when all windows are closed
  // The app will continue running in the system tray
  // Only quit if explicitly requested via tray menu or app.quit()
  if (process.platform !== 'darwin' && (app as { isQuitting?: boolean }).isQuitting) {
    app.quit()
  }
})

app.on('before-quit', () => {
  ;(app as { isQuitting?: boolean }).isQuitting = true
})
