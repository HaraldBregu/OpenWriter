import { app, Menu as ElectronMenu } from 'electron'
import { loadTranslations } from './i18n'

interface MenuManagerCallbacks {
  onLanguageChange: (lng: string) => void
}

export class Menu {
  private currentLanguage = 'en'
  private callbacks: MenuManagerCallbacks

  constructor(callbacks: MenuManagerCallbacks) {
    this.callbacks = callbacks
  }

  create(): void {
    this.buildMenu()
  }

  updateLanguage(lng: string): void {
    this.currentLanguage = lng
    this.buildMenu()
  }

  private buildMenu(): void {
    const isMac = process.platform === 'darwin'
    const t = loadTranslations(this.currentLanguage)
    const m = t.menu as Record<string, string>

    const switchLanguage = (lng: string): void => {
      this.currentLanguage = lng
      this.buildMenu()
      this.callbacks.onLanguageChange(lng)
    }

    const template: Electron.MenuItemConstructorOptions[] = [
      ...(isMac
        ? [
            {
              label: app.name,
              submenu: [
                { label: m.about, role: 'about' as const },
                { type: 'separator' as const },
                { label: m.services, role: 'services' as const },
                { type: 'separator' as const },
                { label: m.hide, role: 'hide' as const },
                { label: m.hideOthers, role: 'hideOthers' as const },
                { label: m.unhide, role: 'unhide' as const },
                { type: 'separator' as const },
                { label: m.quit, role: 'quit' as const }
              ]
            }
          ]
        : []),
      {
        label: m.file,
        submenu: [
          isMac
            ? { label: m.close, role: 'close' as const }
            : { label: m.quit, role: 'quit' as const }
        ]
      },
      {
        label: m.edit,
        submenu: [
          { label: m.undo, role: 'undo' as const },
          { label: m.redo, role: 'redo' as const },
          { type: 'separator' as const },
          { label: m.cut, role: 'cut' as const },
          { label: m.copy, role: 'copy' as const },
          { label: m.paste, role: 'paste' as const },
          { label: m.selectAll, role: 'selectAll' as const }
        ]
      },
      {
        label: m.view,
        submenu: [
          { label: m.reload, role: 'reload' as const },
          { label: m.forceReload, role: 'forceReload' as const },
          { type: 'separator' as const },
          { label: m.resetZoom, role: 'resetZoom' as const },
          { label: m.zoomIn, role: 'zoomIn' as const },
          { label: m.zoomOut, role: 'zoomOut' as const },
          { type: 'separator' as const },
          { label: m.toggleFullscreen, role: 'togglefullscreen' as const }
        ]
      },
      {
        label: m.window,
        submenu: [
          { label: m.minimize, role: 'minimize' as const },
          { label: m.zoom, role: 'zoom' as const },
          ...(isMac
            ? [{ type: 'separator' as const }, { label: m.front, role: 'front' as const }]
            : [{ label: m.close, role: 'close' as const }])
        ]
      },
      {
        label: m.developer,
        submenu: [
          {
            label: m.language,
            submenu: [
              {
                label: 'English',
                type: 'radio' as const,
                checked: this.currentLanguage === 'en',
                click: (): void => switchLanguage('en')
              },
              {
                label: 'Italiano',
                type: 'radio' as const,
                checked: this.currentLanguage === 'it',
                click: (): void => switchLanguage('it')
              }
            ]
          }
        ]
      }
    ]

    const menu = ElectronMenu.buildFromTemplate(template)
    ElectronMenu.setApplicationMenu(menu)
  }
}
