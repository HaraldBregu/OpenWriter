/**
 * Tests for DialogService.
 * Validates dialog show methods using mocked Electron dialog API.
 */
import { dialog, BrowserWindow } from 'electron'
import { DialogService } from '../../../../src/main/services/dialogs'

describe('DialogService', () => {
  let service: DialogService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new DialogService()
  })

  describe('showOpenDialog', () => {
    it('should call dialog.showOpenDialog with parent window', async () => {
      const result = await service.showOpenDialog()
      expect(dialog.showOpenDialog).toHaveBeenCalled()
      expect(result.type).toBe('open')
      expect(result.data).toHaveProperty('canceled')
      expect(result.data).toHaveProperty('filePaths')
    })

    it('should use focused window as parent', async () => {
      await service.showOpenDialog()
      const parent = (dialog.showOpenDialog as jest.Mock).mock.calls[0][0]
      // getFocusedWindow is called, or fallback to getAllWindows()[0]
      expect(parent).toBeDefined()
    })
  })

  describe('showSaveDialog', () => {
    it('should call dialog.showSaveDialog with default path', async () => {
      ;(dialog.showSaveDialog as jest.Mock).mockResolvedValueOnce({
        canceled: false,
        filePath: '/fake/file.txt'
      })
      const result = await service.showSaveDialog()
      expect(dialog.showSaveDialog).toHaveBeenCalled()
      expect(result.type).toBe('save')
      expect(result.data.filePath).toBe('/fake/file.txt')
    })

    it('should handle canceled save dialog', async () => {
      ;(dialog.showSaveDialog as jest.Mock).mockResolvedValueOnce({
        canceled: true,
        filePath: undefined
      })
      const result = await service.showSaveDialog()
      expect(result.data.canceled).toBe(true)
      expect(result.data.filePath).toBeNull()
    })
  })

  describe('showMessageBox', () => {
    it('should show message box with provided options', async () => {
      ;(dialog.showMessageBox as jest.Mock).mockResolvedValueOnce({
        response: 1,
        checkboxChecked: false
      })
      const result = await service.showMessageBox('Title', 'Detail', ['OK', 'Cancel'])
      expect(result.type).toBe('message')
      expect(result.data.response).toBe(1)
      expect(result.data.buttonClicked).toBe('Cancel')
    })

    it('should use OK as default button when empty buttons array', async () => {
      ;(dialog.showMessageBox as jest.Mock).mockResolvedValueOnce({
        response: 0,
        checkboxChecked: false
      })
      const result = await service.showMessageBox('Msg', 'Detail', [])
      expect(result.data.buttonClicked).toBe('OK')
    })
  })

  describe('showErrorDialog', () => {
    it('should call dialog.showErrorBox and return error result', async () => {
      const result = await service.showErrorDialog('Error Title', 'Error content')
      expect(dialog.showErrorBox).toHaveBeenCalledWith('Error Title', 'Error content')
      expect(result.type).toBe('error')
      expect(result.data.title).toBe('Error Title')
      expect(result.data.content).toBe('Error content')
    })
  })
})
