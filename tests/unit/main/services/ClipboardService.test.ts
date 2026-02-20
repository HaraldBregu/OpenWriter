/**
 * Tests for ClipboardService.
 * Validates clipboard read/write operations using mocked Electron clipboard API.
 */
import { clipboard, nativeImage } from 'electron'
import { ClipboardService } from '../../../../src/main/services/clipboard'

describe('ClipboardService', () => {
  let service: ClipboardService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new ClipboardService()
  })

  describe('writeText', () => {
    it('should write text to clipboard and return true', () => {
      const result = service.writeText('hello')
      expect(clipboard.writeText).toHaveBeenCalledWith('hello')
      expect(result).toBe(true)
    })

    it('should return false when clipboard.writeText throws', () => {
      ;(clipboard.writeText as jest.Mock).mockImplementationOnce(() => {
        throw new Error('write failed')
      })
      const result = service.writeText('hello')
      expect(result).toBe(false)
    })
  })

  describe('readText', () => {
    it('should return text from clipboard', () => {
      ;(clipboard.readText as jest.Mock).mockReturnValueOnce('world')
      expect(service.readText()).toBe('world')
    })

    it('should return empty string on error', () => {
      ;(clipboard.readText as jest.Mock).mockImplementationOnce(() => {
        throw new Error('read failed')
      })
      expect(service.readText()).toBe('')
    })
  })

  describe('writeHTML', () => {
    it('should write HTML and return true', () => {
      const result = service.writeHTML('<b>bold</b>')
      expect(clipboard.writeHTML).toHaveBeenCalledWith('<b>bold</b>')
      expect(result).toBe(true)
    })

    it('should return false on error', () => {
      ;(clipboard.writeHTML as jest.Mock).mockImplementationOnce(() => {
        throw new Error('fail')
      })
      expect(service.writeHTML('<b>bold</b>')).toBe(false)
    })
  })

  describe('readHTML', () => {
    it('should return HTML from clipboard', () => {
      ;(clipboard.readHTML as jest.Mock).mockReturnValueOnce('<p>hi</p>')
      expect(service.readHTML()).toBe('<p>hi</p>')
    })

    it('should return empty string on error', () => {
      ;(clipboard.readHTML as jest.Mock).mockImplementationOnce(() => {
        throw new Error('fail')
      })
      expect(service.readHTML()).toBe('')
    })
  })

  describe('writeImage', () => {
    it('should create nativeImage from data URL and write to clipboard', () => {
      const result = service.writeImage('data:image/png;base64,abc')
      expect(nativeImage.createFromDataURL).toHaveBeenCalledWith('data:image/png;base64,abc')
      expect(clipboard.writeImage).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('should return false on error', () => {
      ;(nativeImage.createFromDataURL as jest.Mock).mockImplementationOnce(() => {
        throw new Error('bad image')
      })
      expect(service.writeImage('invalid')).toBe(false)
    })
  })

  describe('readImage', () => {
    it('should return null when clipboard image is empty', () => {
      ;(clipboard.readImage as jest.Mock).mockReturnValueOnce({
        isEmpty: () => true,
        getSize: () => ({ width: 0, height: 0 }),
        toDataURL: () => ''
      })
      expect(service.readImage()).toBeNull()
    })

    it('should return image data when image exists', () => {
      ;(clipboard.readImage as jest.Mock).mockReturnValueOnce({
        isEmpty: () => false,
        getSize: () => ({ width: 100, height: 200 }),
        toDataURL: () => 'data:image/png;base64,xyz'
      })
      const result = service.readImage()
      expect(result).toEqual({
        dataURL: 'data:image/png;base64,xyz',
        width: 100,
        height: 200
      })
    })

    it('should return null on error', () => {
      ;(clipboard.readImage as jest.Mock).mockImplementationOnce(() => {
        throw new Error('fail')
      })
      expect(service.readImage()).toBeNull()
    })
  })

  describe('clear', () => {
    it('should clear clipboard and return true', () => {
      expect(service.clear()).toBe(true)
      expect(clipboard.clear).toHaveBeenCalled()
    })

    it('should return false on error', () => {
      ;(clipboard.clear as jest.Mock).mockImplementationOnce(() => {
        throw new Error('fail')
      })
      expect(service.clear()).toBe(false)
    })
  })

  describe('getContent', () => {
    it('should return image data when clipboard has image', () => {
      ;(clipboard.readImage as jest.Mock).mockReturnValueOnce({
        isEmpty: () => false,
        getSize: () => ({ width: 50, height: 50 }),
        toDataURL: () => 'data:image/png;base64,img'
      })
      const result = service.getContent()
      expect(result).not.toBeNull()
      expect(result!.type).toBe('image')
    })

    it('should return HTML data when clipboard has HTML but no image', () => {
      ;(clipboard.readImage as jest.Mock).mockReturnValueOnce({
        isEmpty: () => true,
        getSize: () => ({ width: 0, height: 0 }),
        toDataURL: () => ''
      })
      ;(clipboard.readHTML as jest.Mock).mockReturnValueOnce('<p>html</p>')
      ;(clipboard.readText as jest.Mock).mockReturnValueOnce('html')
      const result = service.getContent()
      expect(result).not.toBeNull()
      expect(result!.type).toBe('html')
    })

    it('should return text data when clipboard has only text', () => {
      ;(clipboard.readImage as jest.Mock).mockReturnValueOnce({
        isEmpty: () => true,
        getSize: () => ({ width: 0, height: 0 }),
        toDataURL: () => ''
      })
      ;(clipboard.readHTML as jest.Mock).mockReturnValueOnce('')
      ;(clipboard.readText as jest.Mock).mockReturnValueOnce('just text')
      const result = service.getContent()
      expect(result).not.toBeNull()
      expect(result!.type).toBe('text')
    })

    it('should return null when clipboard is empty', () => {
      ;(clipboard.readImage as jest.Mock).mockReturnValueOnce({
        isEmpty: () => true,
        getSize: () => ({ width: 0, height: 0 }),
        toDataURL: () => ''
      })
      ;(clipboard.readHTML as jest.Mock).mockReturnValueOnce('')
      ;(clipboard.readText as jest.Mock).mockReturnValueOnce('')
      expect(service.getContent()).toBeNull()
    })

    it('should return null on error', () => {
      ;(clipboard.readImage as jest.Mock).mockImplementationOnce(() => {
        throw new Error('fail')
      })
      expect(service.getContent()).toBeNull()
    })
  })

  describe('getAvailableFormats', () => {
    it('should return available formats', () => {
      ;(clipboard.availableFormats as jest.Mock).mockReturnValueOnce(['text/plain', 'text/html'])
      expect(service.getAvailableFormats()).toEqual(['text/plain', 'text/html'])
    })

    it('should return empty array on error', () => {
      ;(clipboard.availableFormats as jest.Mock).mockImplementationOnce(() => {
        throw new Error('fail')
      })
      expect(service.getAvailableFormats()).toEqual([])
    })
  })

  describe('hasText', () => {
    it('should return true when clipboard has text', () => {
      ;(clipboard.readText as jest.Mock).mockReturnValueOnce('some text')
      expect(service.hasText()).toBe(true)
    })

    it('should return false when clipboard has no text', () => {
      ;(clipboard.readText as jest.Mock).mockReturnValueOnce('')
      expect(service.hasText()).toBe(false)
    })
  })

  describe('hasImage', () => {
    it('should return true when clipboard has image', () => {
      ;(clipboard.readImage as jest.Mock).mockReturnValueOnce({
        isEmpty: () => false,
        getSize: () => ({ width: 10, height: 10 }),
        toDataURL: () => 'data:...'
      })
      expect(service.hasImage()).toBe(true)
    })

    it('should return false when clipboard has no image', () => {
      // Default mock returns isEmpty() => true
      expect(service.hasImage()).toBe(false)
    })
  })

  describe('hasHTML', () => {
    it('should return true when clipboard has HTML', () => {
      ;(clipboard.readHTML as jest.Mock).mockReturnValueOnce('<p>hi</p>')
      expect(service.hasHTML()).toBe(true)
    })

    it('should return false when clipboard has no HTML', () => {
      ;(clipboard.readHTML as jest.Mock).mockReturnValueOnce('')
      expect(service.hasHTML()).toBe(false)
    })
  })
})
