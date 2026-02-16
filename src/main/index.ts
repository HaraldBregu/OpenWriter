import { app, BrowserWindow } from 'electron'
import { Main } from './main'
import { Tray } from './tray'
import { Menu } from './menu'
import { LifecycleService } from './services/lifecycle'

// Must be created before app.whenReady() for single-instance lock
const lifecycleService = new LifecycleService()

const mainWindow = new Main(lifecycleService)

const trayManager = new Tray({
  onShowApp: () => mainWindow.showOrCreate()
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

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow.create()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
