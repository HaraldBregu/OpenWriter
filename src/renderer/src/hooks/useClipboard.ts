import { useState, useCallback } from 'react'

interface ClipboardContent {
  type: 'text' | 'image' | 'html'
  text?: string
  html?: string
  dataURL?: string
  width?: number
  height?: number
  timestamp: number
}

interface UseClipboardReturn {
  content: ClipboardContent | null
  error: string | null
  loading: boolean
  writeText: (text: string) => Promise<boolean>
  readText: () => Promise<string>
  writeHTML: (html: string) => Promise<boolean>
  readHTML: () => Promise<string>
  writeImage: (dataURL: string) => Promise<boolean>
  readImage: () => Promise<{ dataURL: string; width: number; height: number } | null>
  clear: () => Promise<boolean>
  getContent: () => Promise<ClipboardContent | null>
  refresh: () => Promise<void>
  hasText: () => Promise<boolean>
  hasImage: () => Promise<boolean>
  hasHTML: () => Promise<boolean>
}

export function useClipboard(): UseClipboardReturn {
  const [content, setContent] = useState<ClipboardContent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const writeText = useCallback(async (text: string): Promise<boolean> => {
    try {
      setError(null)
      setLoading(true)
      const success = await window.clipboard.writeText(text)
      if (success) {
        // Update content preview
        setContent({
          type: 'text',
          text,
          timestamp: Date.now()
        })
      }
      return success
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to write text to clipboard'
      setError(errorMsg)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const readText = useCallback(async (): Promise<string> => {
    try {
      setError(null)
      setLoading(true)
      return await window.clipboard.readText()
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to read text from clipboard'
      setError(errorMsg)
      return ''
    } finally {
      setLoading(false)
    }
  }, [])

  const writeHTML = useCallback(async (html: string): Promise<boolean> => {
    try {
      setError(null)
      setLoading(true)
      const success = await window.clipboard.writeHTML(html)
      if (success) {
        setContent({
          type: 'html',
          html,
          text: html.replace(/<[^>]*>/g, ''),
          timestamp: Date.now()
        })
      }
      return success
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to write HTML to clipboard'
      setError(errorMsg)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const readHTML = useCallback(async (): Promise<string> => {
    try {
      setError(null)
      setLoading(true)
      return await window.clipboard.readHTML()
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to read HTML from clipboard'
      setError(errorMsg)
      return ''
    } finally {
      setLoading(false)
    }
  }, [])

  const writeImage = useCallback(async (dataURL: string): Promise<boolean> => {
    try {
      setError(null)
      setLoading(true)
      const success = await window.clipboard.writeImage(dataURL)
      if (success) {
        // Create image to get dimensions
        const img = new Image()
        img.src = dataURL
        await new Promise((resolve) => {
          img.onload = resolve
        })
        setContent({
          type: 'image',
          dataURL,
          width: img.width,
          height: img.height,
          timestamp: Date.now()
        })
      }
      return success
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to write image to clipboard'
      setError(errorMsg)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const readImage = useCallback(async (): Promise<{ dataURL: string; width: number; height: number } | null> => {
    try {
      setError(null)
      setLoading(true)
      return await window.clipboard.readImage()
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to read image from clipboard'
      setError(errorMsg)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const clear = useCallback(async (): Promise<boolean> => {
    try {
      setError(null)
      setLoading(true)
      const success = await window.clipboard.clear()
      if (success) {
        setContent(null)
      }
      return success
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to clear clipboard'
      setError(errorMsg)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const getContent = useCallback(async (): Promise<ClipboardContent | null> => {
    try {
      setError(null)
      setLoading(true)
      const clipboardContent = await window.clipboard.getContent()
      setContent(clipboardContent)
      return clipboardContent
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get clipboard content'
      setError(errorMsg)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const refresh = useCallback(async (): Promise<void> => {
    await getContent()
  }, [getContent])

  const hasText = useCallback(async (): Promise<boolean> => {
    try {
      return await window.clipboard.hasText()
    } catch (err) {
      console.error('Failed to check if clipboard has text:', err)
      return false
    }
  }, [])

  const hasImage = useCallback(async (): Promise<boolean> => {
    try {
      return await window.clipboard.hasImage()
    } catch (err) {
      console.error('Failed to check if clipboard has image:', err)
      return false
    }
  }, [])

  const hasHTML = useCallback(async (): Promise<boolean> => {
    try {
      return await window.api.clipboardHasHTML()
    } catch (err) {
      console.error('Failed to check if clipboard has HTML:', err)
      return false
    }
  }, [])

  return {
    content,
    error,
    loading,
    writeText,
    readText,
    writeHTML,
    readHTML,
    writeImage,
    readImage,
    clear,
    getContent,
    refresh,
    hasText,
    hasImage,
    hasHTML
  }
}
