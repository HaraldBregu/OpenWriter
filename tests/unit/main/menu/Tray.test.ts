/**
 * Tests for Tray class.
 * Validates tray creation, context menu, and language updates.
 */
import { Tray as ElectronTray, Menu, nativeImage } from 'electron'
import { Tray } from '../../../../src/main/tray'

// Mock @electron-toolkit/utils
jest.mock('@electron-toolkit/utils', () => ({
  is: { dev: true }
}))

// Mock i18n
jest.mock('../../../../src/main/i18n', () => ({
  loadTranslations: jest.fn().mockReturnValue({
    showTesseractAI: 'Show Tesseract AI',
    hideTesseractAI: 'Hide Tesseract AI',
    quit: 'Quit'
  })
}))

describe('Tray', () => {
  let tray: Tray
  let callbacks: {
    onShowApp: jest.Mock
    onHideApp: jest.Mock
    onToggleApp: jest.Mock
    onQuit: jest.Mock
    isAppVisible: jest.Mock
  }
  let mockTrayInstance: Record<string, jest.Mock>

  beforeEach(() => {
    jest.clearAllMocks()

    callbacks = {
      onShowApp: jest.fn(),
      onHideApp: jest.fn(),
      onToggleApp: jest.fn(),
      onQuit: jest.fn(),
      isAppVisible: jest.fn().mockReturnValue(true)
    }

    mockTrayInstance = {
      setToolTip: jest.fn(),
      setContextMenu: jest.fn(),
      on: jest.fn(),
      destroy: jest.fn()
    }

    ;(ElectronTray as unknown as jest.Mock).mockImplementation(() => mockTrayInstance)

    // Make nativeImage.createFromPath return an object with resize
    ;(nativeImage.createFromPath as jest.Mock).mockReturnValue({
      resize: jest.fn().mockReturnValue({})
    })

    tray = new Tray(callbacks)
  })

  describe('create', () => {
    it('should create an ElectronTray with icon', () => {
      tray.create()
      expect(nativeImage.createFromPath).toHaveBeenCalled()
      expect(ElectronTray).toHaveBeenCalled()
    })

    it('should set tooltip to Tesseract AI', () => {
      tray.create()
      expect(mockTrayInstance.setToolTip).toHaveBeenCalledWith('Tesseract AI')
    })

    it('should register double-click handler', () => {
      tray.create()
      expect(mockTrayInstance.on).toHaveBeenCalledWith('double-click', expect.any(Function))
    })

    it('should set context menu', () => {
      tray.create()
      expect(mockTrayInstance.setContextMenu).toHaveBeenCalled()
      expect(Menu.buildFromTemplate).toHaveBeenCalled()
    })
  })

  describe('updateLanguage', () => {
    it('should rebuild context menu with new language', () => {
      tray.create()
      jest.clearAllMocks()
      tray.updateLanguage('it')
      expect(Menu.buildFromTemplate).toHaveBeenCalled()
      expect(mockTrayInstance.setContextMenu).toHaveBeenCalled()
    })
  })

  describe('updateContextMenu', () => {
    it('should rebuild the context menu', () => {
      tray.create()
      jest.clearAllMocks()
      tray.updateContextMenu()
      expect(Menu.buildFromTemplate).toHaveBeenCalled()
    })

    it('should do nothing if tray not created', () => {
      // No create() called
      expect(() => tray.updateContextMenu()).not.toThrow()
    })
  })
})
