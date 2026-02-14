import { app, BrowserWindow } from 'electron'
import { Main } from './main'
import { Tray } from './tray'
import { Menu } from './menu'

const mainWindow = new Main()

const trayManager = new Tray({
  onShowApp: () => mainWindow.showOrCreate()
})

const menuManager = new Menu({
  onLanguageChange: (lng) => {
    trayManager.updateLanguage(lng)
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('change-language', lng)
    })
  }
})

app.whenReady().then(() => {
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
