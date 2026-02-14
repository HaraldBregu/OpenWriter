import { app, Tray as ElectronTray, Menu, nativeImage } from 'electron'
import path from 'node:path'
import { is } from '@electron-toolkit/utils'
import { loadTranslations } from './i18n'

interface TrayManagerCallbacks {
  onShowApp: () => void
}

export class Tray {
  private tray: ElectronTray | null = null
  private currentLanguage = 'en'
  private callbacks: TrayManagerCallbacks

  constructor(callbacks: TrayManagerCallbacks) {
    this.callbacks = callbacks
  }

  create(): void {
    const icon = nativeImage.createFromPath(
      is.dev
        ? path.join(__dirname, '../../resources/icons/icon.png')
        : path.join(process.resourcesPath, 'resources/icons/icon.png')
    )

    this.tray = new ElectronTray(icon.resize({ width: 16, height: 16 }))
    this.tray.setToolTip('Tesseract')
    this.buildContextMenu()
  }

  updateLanguage(lng: string): void {
    this.currentLanguage = lng
    this.buildContextMenu()
  }

  private buildContextMenu(): void {
    if (!this.tray) return
    const t = loadTranslations(this.currentLanguage)
    const m = t.menu as Record<string, string>

    const contextMenu = Menu.buildFromTemplate([
      {
        label: m.showTesseract,
        click: () => this.callbacks.onShowApp()
      },
      { type: 'separator' },
      {
        label: m.quit,
        click: () => app.quit()
      }
    ])

    this.tray.setContextMenu(contextMenu)
  }
}
