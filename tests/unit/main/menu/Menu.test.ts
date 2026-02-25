/**
 * Tests for Menu class.
 * Validates menu creation, language switching, and platform behavior.
 */
import { Menu as ElectronMenu } from 'electron'
import { Menu } from '../../../../src/main/menu'

// Mock i18n module
jest.mock('../../../../src/main/i18n', () => ({
  loadTranslations: jest.fn().mockReturnValue({
    about: 'About',
    services: 'Services',
    hide: 'Hide',
    hideOthers: 'Hide Others',
    unhide: 'Show All',
    quit: 'Quit',
    file: 'File',
    close: 'Close',
    edit: 'Edit',
    undo: 'Undo',
    redo: 'Redo',
    cut: 'Cut',
    copy: 'Copy',
    paste: 'Paste',
    selectAll: 'Select All',
    view: 'View',
    reload: 'Reload',
    forceReload: 'Force Reload',
    resetZoom: 'Reset Zoom',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    toggleFullscreen: 'Toggle Fullscreen',
    window: 'Window',
    minimize: 'Minimize',
    zoom: 'Zoom',
    front: 'Bring All to Front',
    developer: 'Developer',
    language: 'Language',
    theme: 'Theme',
    light: 'Light',
    dark: 'Dark'
  })
}))

describe('Menu', () => {
  let menu: Menu
  let callbacks: { onLanguageChange: jest.Mock; onThemeChange: jest.Mock }
  const originalPlatform = process.platform

  beforeEach(() => {
    jest.clearAllMocks()
    callbacks = {
      onLanguageChange: jest.fn(),
      onThemeChange: jest.fn()
    }
    menu = new Menu(callbacks)
  })

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform })
  })

  describe('create', () => {
    it('should set application menu to null on Windows', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' })
      menu.create()
      expect(ElectronMenu.setApplicationMenu).toHaveBeenCalledWith(null)
    })

    it('should build and set application menu on macOS', () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' })
      menu.create()
      expect(ElectronMenu.buildFromTemplate).toHaveBeenCalled()
      expect(ElectronMenu.setApplicationMenu).toHaveBeenCalledWith(expect.anything())
    })
  })

  describe('updateLanguage', () => {
    it('should rebuild menu with new language', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' })
      menu.updateLanguage('it')
      // Should call setApplicationMenu (null on win32)
      expect(ElectronMenu.setApplicationMenu).toHaveBeenCalled()
    })
  })
})
