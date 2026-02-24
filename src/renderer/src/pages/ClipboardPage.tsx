import React, { useState, useEffect, useRef } from 'react'
import { useClipboard } from '../hooks/useClipboard'
import { useLanguage } from '../hooks/useLanguage'
import {
  Clipboard,
  ClipboardCopy,
  ClipboardPaste,
  Image as ImageIcon,
  Type,
  Code,
  Trash2,
  RefreshCw,
  Copy,
  CheckCircle2,
  AlertCircle,
  FileImage
} from 'lucide-react'

const ClipboardPage: React.FC = () => {
  const {
    content,
    error,
    loading,
    writeText,
    writeHTML,
    writeImage,
    readText,
    clear,
    refresh
  } = useClipboard()

  const [customText, setCustomText] = useState('Hello from Tesseract AI clipboard!')
  const [customHTML, setCustomHTML] = useState('<h1>Hello World</h1><p>This is <strong>HTML</strong> content</p>')
  const [pastedText, setPastedText] = useState('')
  const [copySuccess, setCopySuccess] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useLanguage()

  // Auto-refresh clipboard content on mount
  useEffect(() => {
    refresh()
  }, [refresh])

  const handleCopyText = async (): Promise<void> => {
    const success = await writeText(customText)
    if (success) {
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    }
  }

  const handleCopyHTML = async (): Promise<void> => {
    const success = await writeHTML(customHTML)
    if (success) {
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    }
  }

  const handlePasteText = async (): Promise<void> => {
    const text = await readText()
    setPastedText(text)
  }

  const handleCopyImage = async (): Promise<void> => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Create a sample image on canvas
    const width = 400
    const height = 300
    canvas.width = width
    canvas.height = height

    // Draw gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, '#667eea')
    gradient.addColorStop(1, '#764ba2')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    // Draw circle
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(width / 2, height / 2, 60, 0, Math.PI * 2)
    ctx.fill()

    // Draw text
    ctx.fillStyle = '#000000'
    ctx.font = 'bold 24px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('Tesseract AI', width / 2, height / 2 + 8)

    // Draw timestamp
    ctx.fillStyle = '#ffffff'
    ctx.font = '14px Arial'
    ctx.fillText(new Date().toLocaleTimeString(), width / 2, height - 20)

    // Copy to clipboard
    const dataURL = canvas.toDataURL('image/png')
    const success = await writeImage(dataURL)
    if (success) {
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    }
  }

  const handleClear = async (): Promise<void> => {
    await clear()
  }

  const handleRefresh = async (): Promise<void> => {
    await refresh()
  }

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString()
  }

  const typeColors: Record<string, string> = {
    text: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    html: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
    image: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
  }

  const typeIcons: Record<string, React.FC<{ className?: string }>> = {
    text: Type,
    html: Code,
    image: ImageIcon
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Clipboard Manager</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Copy and paste text, HTML, and images using the system clipboard
        </p>
      </div>

      {/* Success/Error Notifications */}
      {copySuccess && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            <p className="text-green-800 dark:text-green-300 font-semibold">
              Copied to clipboard successfully!
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <div>
              <p className="text-red-800 dark:text-red-300 font-semibold">Error</p>
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Copy Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Copy Text */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <Type className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold">Copy Text</h2>
          </div>
          <div className="space-y-3">
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Enter text to copy"
              rows={4}
            />
            <button
              onClick={handleCopyText}
              disabled={loading || !customText}
              className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ClipboardCopy className="h-4 w-4" />
              Copy Text
            </button>
          </div>
        </div>

        {/* Copy HTML */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <Code className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-xl font-semibold">Copy HTML</h2>
          </div>
          <div className="space-y-3">
            <textarea
              value={customHTML}
              onChange={(e) => setCustomHTML(e.target.value)}
              className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 outline-none font-mono text-sm"
              placeholder="Enter HTML to copy"
              rows={4}
            />
            <button
              onClick={handleCopyHTML}
              disabled={loading || !customHTML}
              className="w-full px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Code className="h-4 w-4" />
              Copy HTML
            </button>
          </div>
        </div>

        {/* Copy Image */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <ImageIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
            <h2 className="text-xl font-semibold">Copy Image</h2>
          </div>
          <div className="space-y-3">
            <div className="border dark:border-gray-600 rounded-lg overflow-hidden">
              <canvas ref={canvasRef} className="w-full" style={{ maxHeight: '200px' }} />
            </div>
            <button
              onClick={handleCopyImage}
              disabled={loading}
              className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ImageIcon className="h-4 w-4" />
              Generate & Copy Image
            </button>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Generates a sample image with gradient background and copies it to clipboard
            </p>
          </div>
        </div>

        {/* Paste Text */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardPaste className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <h2 className="text-xl font-semibold">Paste Text</h2>
          </div>
          <div className="space-y-3">
            <button
              onClick={handlePasteText}
              disabled={loading}
              className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ClipboardPaste className="h-4 w-4" />
              Paste from Clipboard
            </button>
            {pastedText && (
              <div className="border dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pasted Content:</p>
                <p className="text-sm break-all">{pastedText}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Clipboard Preview Panel */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Clipboard className="h-5 w-5" />
            Current Clipboard Content
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-1.5 text-sm disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleClear}
              disabled={loading || !content}
              className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-1.5 text-sm disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </button>
          </div>
        </div>

        {content ? (
          <div className="space-y-4">
            {/* Content Type Badge */}
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 text-sm font-semibold rounded-full flex items-center gap-1.5 ${
                  typeColors[content.type]
                }`}
              >
                {React.createElement(typeIcons[content.type], { className: 'h-4 w-4' })}
                {content.type.toUpperCase()}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {formatTimestamp(content.timestamp)}
              </span>
            </div>

            {/* Content Display */}
            {content.type === 'text' && content.text && (
              <div className="border dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Text Content:</p>
                  <button
                    onClick={() => navigator.clipboard.writeText(content.text || '')}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <Copy className="h-3 w-3" />
                    Copy
                  </button>
                </div>
                <p className="text-sm break-all whitespace-pre-wrap">{content.text}</p>
                <div className="mt-2 pt-2 border-t dark:border-gray-600">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Length: {content.text.length} characters
                  </p>
                </div>
              </div>
            )}

            {content.type === 'html' && (
              <div className="space-y-3">
                <div className="border dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">HTML Source:</p>
                  <pre className="text-xs font-mono bg-white dark:bg-gray-800 p-3 rounded border dark:border-gray-600 overflow-x-auto">
                    {content.html}
                  </pre>
                </div>
                {content.text && (
                  <div className="border dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Plain Text:</p>
                    <p className="text-sm break-all">{content.text}</p>
                  </div>
                )}
              </div>
            )}

            {content.type === 'image' && content.dataURL && (
              <div className="border dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                <div className="flex items-center gap-2 mb-3">
                  <FileImage className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Image Preview
                  </p>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {content.width} × {content.height} px
                  </span>
                </div>
                <div className="rounded border dark:border-gray-600 overflow-hidden bg-white dark:bg-gray-800 p-2">
                  <img
                    src={content.dataURL}
                    alt="Clipboard content"
                    className="max-w-full h-auto mx-auto"
                    style={{ maxHeight: '400px' }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Clipboard className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Clipboard is empty</p>
            <p className="text-sm mt-2">Copy something to see it appear here</p>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>Note:</strong> The clipboard module provides full access to system clipboard operations.
        </p>
        <ul className="text-sm text-blue-800 dark:text-blue-300 list-disc list-inside mt-2 space-y-1">
          <li>Copy and paste plain text, HTML, and images</li>
          <li>Real-time preview of clipboard content</li>
          <li>Supports multiple clipboard formats simultaneously</li>
          <li>Canvas-based image generation example included</li>
        </ul>
      </div>
    </div>
  )
}

export default ClipboardPage
