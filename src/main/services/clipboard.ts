import { clipboard, nativeImage } from 'electron'

export interface ClipboardTextData {
  type: 'text'
  text: string
  timestamp: number
}

export interface ClipboardImageData {
  type: 'image'
  dataURL: string
  width: number
  height: number
  timestamp: number
}

export interface ClipboardHTMLData {
  type: 'html'
  html: string
  text: string
  timestamp: number
}

export type ClipboardData = ClipboardTextData | ClipboardImageData | ClipboardHTMLData

export class ClipboardService {
  /**
   * Write plain text to clipboard
   */
  writeText(text: string): boolean {
    try {
      clipboard.writeText(text)
      return true
    } catch (error) {
      console.error('Failed to write text to clipboard:', error)
      return false
    }
  }

  /**
   * Read plain text from clipboard
   */
  readText(): string {
    try {
      return clipboard.readText()
    } catch (error) {
      console.error('Failed to read text from clipboard:', error)
      return ''
    }
  }

  /**
   * Write HTML to clipboard
   */
  writeHTML(html: string): boolean {
    try {
      clipboard.writeHTML(html)
      return true
    } catch (error) {
      console.error('Failed to write HTML to clipboard:', error)
      return false
    }
  }

  /**
   * Read HTML from clipboard
   */
  readHTML(): string {
    try {
      return clipboard.readHTML()
    } catch (error) {
      console.error('Failed to read HTML from clipboard:', error)
      return ''
    }
  }

  /**
   * Write image to clipboard from data URL
   */
  writeImage(dataURL: string): boolean {
    try {
      const image = nativeImage.createFromDataURL(dataURL)
      clipboard.writeImage(image)
      return true
    } catch (error) {
      console.error('Failed to write image to clipboard:', error)
      return false
    }
  }

  /**
   * Read image from clipboard as data URL
   */
  readImage(): { dataURL: string; width: number; height: number } | null {
    try {
      const image = clipboard.readImage()
      if (image.isEmpty()) {
        return null
      }
      const size = image.getSize()
      return {
        dataURL: image.toDataURL(),
        width: size.width,
        height: size.height
      }
    } catch (error) {
      console.error('Failed to read image from clipboard:', error)
      return null
    }
  }

  /**
   * Clear clipboard
   */
  clear(): boolean {
    try {
      clipboard.clear()
      return true
    } catch (error) {
      console.error('Failed to clear clipboard:', error)
      return false
    }
  }

  /**
   * Get current clipboard content with type detection
   */
  getContent(): ClipboardData | null {
    try {
      const timestamp = Date.now()

      // Check for image first
      const image = clipboard.readImage()
      if (!image.isEmpty()) {
        const size = image.getSize()
        return {
          type: 'image',
          dataURL: image.toDataURL(),
          width: size.width,
          height: size.height,
          timestamp
        }
      }

      // Check for HTML
      const html = clipboard.readHTML()
      if (html) {
        return {
          type: 'html',
          html,
          text: clipboard.readText(),
          timestamp
        }
      }

      // Check for plain text
      const text = clipboard.readText()
      if (text) {
        return {
          type: 'text',
          text,
          timestamp
        }
      }

      return null
    } catch (error) {
      console.error('Failed to get clipboard content:', error)
      return null
    }
  }

  /**
   * Get available clipboard formats
   */
  getAvailableFormats(): string[] {
    try {
      return clipboard.availableFormats()
    } catch (error) {
      console.error('Failed to get available formats:', error)
      return []
    }
  }

  /**
   * Check if clipboard has text
   */
  hasText(): boolean {
    return clipboard.readText().length > 0
  }

  /**
   * Check if clipboard has image
   */
  hasImage(): boolean {
    return !clipboard.readImage().isEmpty()
  }

  /**
   * Check if clipboard has HTML
   */
  hasHTML(): boolean {
    return clipboard.readHTML().length > 0
  }
}
