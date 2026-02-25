import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Upload,
  Download,
  Search,
  Grid3x3,
  List,
  FileText,
  File,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Trash2,
  Eye,
  Copy,
  Filter,
  Calendar,
  HardDrive,
  Info,
  FileCode,
  FileJson,
  Code2
} from 'lucide-react'
import {
  AppButton,
  AppInput,
  AppDropdownMenu,
  AppDropdownMenuContent,
  AppDropdownMenuItem,
  AppDropdownMenuSeparator,
  AppDropdownMenuTrigger
} from '@/components/app'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Document {
  id: string
  name: string
  path: string
  size: number
  mimeType?: string
  importedAt: number
  lastModified: number
}

type ViewMode = 'grid' | 'list'
type SortBy = 'name' | 'date' | 'size' | 'type'
type DownloadStatus = 'idle' | 'downloading' | 'success' | 'error'

// Supported text file types for display
const SUPPORTED_FILE_TYPES = [
  'Text files (.txt, .md)',
  'Code files (.js, .ts, .jsx, .tsx, .py, .java, etc.)',
  'Web files (.html, .css, .scss, .json, .xml)',
  'Config files (.yaml, .yml, .toml, .ini, .env)',
  'Shell scripts (.sh, .bash)',
  'And other text-based formats'
]

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getFileIcon(doc: Document): React.ComponentType<{ className?: string }> {
  const ext = doc.name.split('.').pop()?.toLowerCase()

  // Return specific icons based on file type
  switch (ext) {
    // Text and markdown
    case 'txt':
    case 'md':
    case 'markdown':
      return FileText

    // Code files
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
    case 'py':
    case 'java':
    case 'cpp':
    case 'c':
    case 'cs':
    case 'go':
    case 'rs':
    case 'php':
    case 'rb':
    case 'sh':
    case 'bash':
      return FileCode

    // JSON and config
    case 'json':
    case 'yaml':
    case 'yml':
    case 'toml':
    case 'xml':
      return FileJson

    // Web files
    case 'html':
    case 'css':
    case 'scss':
    case 'sass':
      return Code2

    default:
      return File
  }
}

function sortDocuments(docs: Document[], sortBy: SortBy): Document[] {
  const sorted = [...docs]

  switch (sortBy) {
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name))
    case 'date':
      return sorted.sort((a, b) => b.importedAt - a.importedAt)
    case 'size':
      return sorted.sort((a, b) => b.size - a.size)
    case 'type':
      return sorted.sort((a, b) => {
        const extA = a.name.split('.').pop()?.toLowerCase() || ''
        const extB = b.name.split('.').pop()?.toLowerCase() || ''
        if (extA === extB) return a.name.localeCompare(b.name)
        return extA.localeCompare(extB)
      })
    default:
      return sorted
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface EmptyStateProps {
  onImportFiles: () => void
  onDownloadRemote: () => void
  isImporting: boolean
}

const EmptyState = React.memo(function EmptyState({
  onImportFiles,
  onDownloadRemote,
  isImporting
}: EmptyStateProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="w-20 h-20 rounded-2xl bg-muted/60 flex items-center justify-center mb-6">
        <Upload className="h-10 w-10 text-muted-foreground/40" />
      </div>

      <h2 className="text-xl font-semibold text-foreground mb-2">
        {t('documents.noDocumentsTitle')}
      </h2>
      <p className="text-sm text-muted-foreground mb-4 max-w-md">
        {t('documents.noDocumentsDescription')}
      </p>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <AppButton onClick={onImportFiles} size="default" disabled={isImporting}>
          {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {isImporting ? t('documents.importing') : t('documents.importFiles')}
        </AppButton>
        <AppButton onClick={onDownloadRemote} variant="outline" size="default">
          <Download className="h-4 w-4" />
          {t('documents.downloadFromURL')}
        </AppButton>
      </div>

      <div className="max-w-lg rounded-lg border border-border bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-left">
            <p className="text-sm font-medium text-foreground mb-2">{t('documents.supportedFileTypes')}</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              {SUPPORTED_FILE_TYPES.map((type, index) => (
                <li key={index}>• {type}</li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
              <span className="font-medium">Note:</span> {t('documents.supportedNote')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
})
EmptyState.displayName = 'EmptyState'

interface DropZoneOverlayProps {
  isDragging: boolean
}

const DropZoneOverlay = React.memo(function DropZoneOverlay({ isDragging }: DropZoneOverlayProps) {
  const { t } = useTranslation()
  if (!isDragging) return null

  return (
    <div className="absolute inset-0 z-50 bg-background/95 border-2 border-dashed border-primary/50 rounded-lg flex items-center justify-center backdrop-blur-sm">
      <div className="text-center max-w-md">
        <Upload className="h-12 w-12 text-primary mx-auto mb-4" />
        <p className="text-lg font-medium text-foreground">{t('documents.dropFilesHere')}</p>
        <p className="text-sm text-muted-foreground mt-2">{t('documents.dropFilesDescription')}</p>
        <p className="text-xs text-muted-foreground mt-3 px-4">
          {t('documents.dropFilesRestriction')}
        </p>
      </div>
    </div>
  )
})
DropZoneOverlay.displayName = 'DropZoneOverlay'

interface DocumentCardProps {
  document: Document
  onDelete: (id: string) => void
  onView: (doc: Document) => void
}

const DocumentCard = React.memo(function DocumentCard({
  document,
  onDelete,
  onView
}: DocumentCardProps) {
  const Icon = getFileIcon(document)

  return (
    <div className="group relative rounded-lg border border-border bg-background p-4 hover:shadow-sm hover:border-border/80 transition-all">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-muted">
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate mb-1">
            {document.name}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatFileSize(document.size)}</span>
            <span>•</span>
            <span>{formatDate(document.importedAt)}</span>
          </div>
        </div>

        <AppDropdownMenu>
          <AppDropdownMenuTrigger asChild>
            <AppButton
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-4 w-4" />
            </AppButton>
          </AppDropdownMenuTrigger>
          <AppDropdownMenuContent align="end">
            <AppDropdownMenuItem onClick={() => onView(document)}>
              <Eye className="h-4 w-4" />
              View
            </AppDropdownMenuItem>
            <AppDropdownMenuItem>
              <Copy className="h-4 w-4" />
              Copy Path
            </AppDropdownMenuItem>
            <AppDropdownMenuSeparator />
            <AppDropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(document.id)}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </AppDropdownMenuItem>
          </AppDropdownMenuContent>
        </AppDropdownMenu>
      </div>
    </div>
  )
})
DocumentCard.displayName = 'DocumentCard'

interface DocumentListItemProps {
  document: Document
  onDelete: (id: string) => void
  onView: (doc: Document) => void
}

const DocumentListItem = React.memo(function DocumentListItem({
  document,
  onDelete,
  onView
}: DocumentListItemProps) {
  const Icon = getFileIcon(document)

  return (
    <div className="group flex items-center gap-4 px-4 py-3 hover:bg-muted/60 transition-colors">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-muted">
        <Icon className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {document.name}
        </p>
      </div>

      <div className="flex items-center gap-6 text-xs text-muted-foreground">
        <span className="w-20 text-right">{formatFileSize(document.size)}</span>
        <span className="w-24 text-right">{formatDate(document.importedAt)}</span>
      </div>

      <AppDropdownMenu>
        <AppDropdownMenuTrigger asChild>
          <AppButton
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="h-4 w-4" />
          </AppButton>
        </AppDropdownMenuTrigger>
        <AppDropdownMenuContent align="end">
          <AppDropdownMenuItem onClick={() => onView(document)}>
            <Eye className="h-4 w-4" />
            View
          </AppDropdownMenuItem>
          <AppDropdownMenuItem>
            <Copy className="h-4 w-4" />
            Copy Path
          </AppDropdownMenuItem>
          <AppDropdownMenuSeparator />
          <AppDropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => onDelete(document.id)}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </AppDropdownMenuItem>
        </AppDropdownMenuContent>
      </AppDropdownMenu>
    </div>
  )
})
DocumentListItem.displayName = 'DocumentListItem'

interface RemoteDownloadModalProps {
  isOpen: boolean
  onClose: () => void
  onDownload: (url: string) => Promise<void>
}

const RemoteDownloadModal = React.memo(function RemoteDownloadModal({
  isOpen,
  onClose,
  onDownload
}: RemoteDownloadModalProps) {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<DownloadStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  const handleDownload = useCallback(async () => {
    if (!url.trim()) return

    try {
      setStatus('downloading')
      setProgress(30)

      // Simulate download progress (replace with actual implementation)
      await new Promise(resolve => setTimeout(resolve, 500))
      setProgress(60)

      await onDownload(url)

      setProgress(100)
      setStatus('success')

      // Auto-close after success
      setTimeout(() => {
        onClose()
        setUrl('')
        setStatus('idle')
        setProgress(0)
      }, 1500)
    } catch (error) {
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Download failed')
    }
  }, [url, onDownload, onClose])

  const handleClose = useCallback(() => {
    if (status === 'downloading') return
    setUrl('')
    setStatus('idle')
    setProgress(0)
    setErrorMessage('')
    onClose()
  }, [status, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-background shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">Download from URL</h3>
          </div>
          <AppButton
            variant="ghost"
            size="icon"
            onClick={handleClose}
            disabled={status === 'downloading'}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </AppButton>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Document URL
            </label>
            <AppInput
              type="url"
              placeholder="https://example.com/document.pdf"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={status === 'downloading'}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && status === 'idle') {
                  handleDownload()
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Enter the URL of the document you want to download
            </p>
          </div>

          {/* Progress indicator */}
          {status === 'downloading' && (
            <div className="space-y-2">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Downloading... {progress}%
              </p>
            </div>
          )}

          {/* Success message */}
          {status === 'success' && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <p className="text-sm text-green-600 dark:text-green-400">
                Download completed successfully
              </p>
            </div>
          )}

          {/* Error message */}
          {status === 'error' && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">Download failed</p>
                <p className="text-xs text-destructive/80 mt-1">{errorMessage}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <AppButton
            variant="outline"
            onClick={handleClose}
            disabled={status === 'downloading'}
          >
            Cancel
          </AppButton>
          <AppButton
            onClick={handleDownload}
            disabled={!url.trim() || status === 'downloading' || status === 'success'}
          >
            {status === 'downloading' && <Loader2 className="h-4 w-4 animate-spin" />}
            {status === 'success' && <CheckCircle2 className="h-4 w-4" />}
            {status === 'idle' || status === 'error' ? 'Download' : status === 'downloading' ? 'Downloading' : 'Downloaded'}
          </AppButton>
        </div>
      </div>
    </div>
  )
})
RemoteDownloadModal.displayName = 'RemoteDownloadModal'

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

const DocumentsPage: React.FC = () => {
  // State
  const [documents, setDocuments] = useState<Document[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [searchQuery, setSearchQuery] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isRemoteModalOpen, setIsRemoteModalOpen] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const dragCounterRef = useRef(0)
  const isListeningRef = useRef(false)

  // Shared reload function — always fetches from disk for consistency
  const reloadDocuments = useCallback(async () => {
    try {
      const docs = await window.documents.loadAll()
      setDocuments(docs)
      return docs
    } catch (error) {
      console.error('[DocumentsPage] Failed to load documents:', error)
      return null
    }
  }, [])

  // Load documents from workspace on mount
  useEffect(() => {
    reloadDocuments()
  }, [reloadDocuments])

  // File watcher: Listen for external document changes
  useEffect(() => {
    if (isListeningRef.current) return
    isListeningRef.current = true

    const handleFileChange = async (event: {
      type: 'added' | 'changed' | 'removed'
      fileId: string
      filePath: string
      timestamp: number
    }): Promise<void> => {
      console.log('[DocumentsPage] File change detected:', event.type, event.fileId)

      // Always reload the full list from disk — this is the simplest
      // way to stay in sync regardless of event type
      await reloadDocuments()
    }

    const unsubscribeFileChange = window.documents.onFileChange(handleFileChange)

    return () => {
      unsubscribeFileChange()
      isListeningRef.current = false
    }
  }, [reloadDocuments])

  // Filter and sort documents
  const filteredDocuments = sortDocuments(
    documents.filter(doc =>
      doc.name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    sortBy
  )

  // Import files handler
  const handleImportFiles = useCallback(async () => {
    try {
      setIsImporting(true)
      setImportError(null)
      await window.documents.importFiles()
      await reloadDocuments()
    } catch (error) {
      console.error('[DocumentsPage] Failed to import files:', error)
      setImportError(error instanceof Error ? error.message : 'Failed to import files')
    } finally {
      setIsImporting(false)
    }
  }, [reloadDocuments])

  // Download from remote handler
  const handleDownloadRemote = useCallback(async (url: string) => {
    try {
      await window.documents.downloadFromUrl(url)
      await reloadDocuments()
    } catch (error) {
      console.error('[DocumentsPage] Failed to download file:', error)
      throw error
    }
  }, [reloadDocuments])

  // Delete document handler
  const handleDeleteDocument = useCallback(async (id: string) => {
    try {
      await window.documents.delete(id)
      await reloadDocuments()
    } catch (error) {
      console.error('[DocumentsPage] Failed to delete document:', error)
    }
  }, [reloadDocuments])

  // View document handler
  const handleViewDocument = useCallback((doc: Document) => {
    console.log('[DocumentsPage] View document:', doc)
    // TODO: Open document in appropriate viewer or external app
  }, [])

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    dragCounterRef.current = 0

    try {
      const files = Array.from(e.dataTransfer.files)
      if (files.length === 0) return

      setIsImporting(true)
      setImportError(null)
      const paths = files.map(file => (file as File & { path: string }).path)
      await window.documents.importByPaths(paths)
      await reloadDocuments()
    } catch (error) {
      console.error('[DocumentsPage] Failed to handle drop:', error)
      setImportError(error instanceof Error ? error.message : 'Failed to import dropped files')
    } finally {
      setIsImporting(false)
    }
  }, [reloadDocuments])

  const hasDocuments = documents.length > 0
  const hasFilteredDocuments = filteredDocuments.length > 0

  return (
    <div
      className="h-full flex flex-col relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <DropZoneOverlay isDragging={isDragging} />

      {!hasDocuments ? (
        <EmptyState
          onImportFiles={handleImportFiles}
          onDownloadRemote={() => setIsRemoteModalOpen(true)}
          isImporting={isImporting}
        />
      ) : (
        <>
          {/* Header */}
          <div className="shrink-0 px-8 py-5 border-b border-border">
            {/* Error notification */}
            {importError && (
              <div className="mb-4 flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-destructive">Import Failed</p>
                  <p className="text-xs text-destructive/80 mt-1">{importError}</p>
                </div>
                <AppButton
                  variant="ghost"
                  size="icon"
                  onClick={() => setImportError(null)}
                  className="h-6 w-6 shrink-0"
                >
                  <X className="h-4 w-4" />
                </AppButton>
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-semibold text-foreground">Documents</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {documents.length} {documents.length === 1 ? 'item' : 'items'} in workspace • Text files only
                </p>
              </div>

              <div className="flex items-center gap-2">
                <AppButton onClick={handleImportFiles} size="sm" disabled={isImporting}>
                  {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {isImporting ? 'Importing...' : 'Import Files'}
                </AppButton>
                <AppButton onClick={() => setIsRemoteModalOpen(true)} variant="outline" size="sm">
                  <Download className="h-4 w-4" />
                  Download from URL/Remote
                </AppButton>
              </div>
            </div>

            {/* Filters and controls */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <AppInput
                    type="text"
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <AppDropdownMenu>
                  <AppDropdownMenuTrigger asChild>
                    <AppButton variant="outline" size="sm">
                      <Filter className="h-4 w-4" />
                      Sort: {sortBy === 'name' ? 'Name' : sortBy === 'date' ? 'Date' : sortBy === 'size' ? 'Size' : 'Type'}
                    </AppButton>
                  </AppDropdownMenuTrigger>
                  <AppDropdownMenuContent align="end">
                    <AppDropdownMenuItem onClick={() => setSortBy('name')}>
                      Sort by Name
                    </AppDropdownMenuItem>
                    <AppDropdownMenuItem onClick={() => setSortBy('date')}>
                      Sort by Date
                    </AppDropdownMenuItem>
                    <AppDropdownMenuItem onClick={() => setSortBy('size')}>
                      Sort by Size
                    </AppDropdownMenuItem>
                    <AppDropdownMenuItem onClick={() => setSortBy('type')}>
                      Sort by Type
                    </AppDropdownMenuItem>
                  </AppDropdownMenuContent>
                </AppDropdownMenu>

                <div className="flex items-center gap-1 border border-border rounded-lg p-1">
                  <AppButton
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid3x3 className="h-4 w-4" />
                  </AppButton>
                  <AppButton
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </AppButton>
                </div>
              </div>

              {/* File type info */}
              <div className="flex items-start gap-2 px-3 py-2 bg-muted/30 rounded-lg border border-border/50">
                <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Supported:</span> Text files (.txt, .md), code files (.js, .ts, .py, .html, .css, .json, etc.)
                    <span className="mx-1.5">•</span>
                    <span className="font-medium text-foreground">Not supported:</span> Images, videos, audio, binary documents
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Document list */}
          <div className="flex-1 overflow-y-auto">
            {!hasFilteredDocuments ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <Search className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No documents found
                </h3>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your search query
                </p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="p-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredDocuments.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      document={doc}
                      onDelete={handleDeleteDocument}
                      onView={handleViewDocument}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="border-t border-border">
                <div className="divide-y divide-border">
                  {filteredDocuments.map((doc) => (
                    <DocumentListItem
                      key={doc.id}
                      document={doc}
                      onDelete={handleDeleteDocument}
                      onView={handleViewDocument}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer stats */}
          <div className="shrink-0 px-8 py-3 border-t border-border bg-muted/20">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <HardDrive className="h-3.5 w-3.5" />
                  {filteredDocuments.length} items
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Last updated: {formatDate(Math.max(...documents.map(d => d.importedAt)))}
                </span>
              </div>
              <span>
                Total size: {formatFileSize(documents.reduce((sum, doc) => sum + doc.size, 0))}
              </span>
            </div>
          </div>
        </>
      )}

      {/* Remote download modal */}
      <RemoteDownloadModal
        isOpen={isRemoteModalOpen}
        onClose={() => setIsRemoteModalOpen(false)}
        onDownload={handleDownloadRemote}
      />
    </div>
  )
}

export default DocumentsPage
