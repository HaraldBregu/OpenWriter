/**
 * Tests for WindowFactory.
 * Validates BrowserWindow creation with consistent security defaults.
 */
import { BrowserWindow } from 'electron'
import { WindowFactory } from '../../../../src/main/core/WindowFactory'

// Mock @electron-toolkit/utils
jest.mock('@electron-toolkit/utils', () => ({
  is: { dev: true }
}))

describe('WindowFactory', () => {
  let factory: WindowFactory

  beforeEach(() => {
    jest.clearAllMocks()
    // Set the ELECTRON_RENDERER_URL for dev mode
    process.env['ELECTRON_RENDERER_URL'] = 'http://localhost:5173'
    factory = new WindowFactory()
  })

  afterEach(() => {
    delete process.env['ELECTRON_RENDERER_URL']
  })

  describe('create', () => {
    it('should create a BrowserWindow with default options', () => {
      const win = factory.create()
      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 1600,
          height: 1000,
          minWidth: 800,
          minHeight: 600,
          show: false,
          webPreferences: expect.objectContaining({
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true,
            allowRunningInsecureContent: false
          })
        })
      )
      expect(win).toBeDefined()
    })

    it('should merge overrides with defaults', () => {
      factory.create({ width: 500, height: 300, title: 'Custom' })
      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 500,
          height: 300,
          title: 'Custom',
          minWidth: 800,
          minHeight: 600
        })
      )
    })

    it('should merge webPreferences overrides while keeping security defaults', () => {
      factory.create({
        webPreferences: {
          sandbox: true
        }
      })
      const constructorArgs = (BrowserWindow as unknown as jest.Mock).mock.calls[0][0]
      expect(constructorArgs.webPreferences.sandbox).toBe(true)
      expect(constructorArgs.webPreferences.contextIsolation).toBe(true)
      expect(constructorArgs.webPreferences.nodeIntegration).toBe(false)
    })

    it('should load content after creating window', () => {
      const win = factory.create()
      // In dev mode with ELECTRON_RENDERER_URL, loadURL should be called
      expect(win.loadURL).toHaveBeenCalledWith('http://localhost:5173')
    })
  })

  describe('loadContent', () => {
    it('should load dev URL in development mode', () => {
      const win = factory.create()
      jest.clearAllMocks()
      factory.loadContent(win)
      expect(win.loadURL).toHaveBeenCalledWith('http://localhost:5173')
    })

    it('should load dev URL with hash in development mode', () => {
      const win = factory.create()
      jest.clearAllMocks()
      factory.loadContent(win, 'settings')
      expect(win.loadURL).toHaveBeenCalledWith('http://localhost:5173#/settings')
    })
  })
})
