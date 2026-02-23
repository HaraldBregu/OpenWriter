import React, { useState, useCallback } from 'react'
import { History, Loader2, PlusCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAppSelector, useAppDispatch } from '@/store'
import { selectPersonalityFilesBySection, selectPersonalityFilesLoading, deletePersonalityFile } from '@/store/personalityFilesSlice'
import type { PersonalityFile } from '@/store/personalityFilesSlice'
import { PersonalityFileItem } from './PersonalityFileItem'
import { AppButton } from '@/components/app/AppButton'

export interface PersonalityFilesListProps {
  sectionId: string
  activeFileId: string | null
  onFileSelect: (file: PersonalityFile) => void
  onNewConversation: () => void
  collapsed: boolean
  onToggleCollapse: () => void
}

export const PersonalityFilesList: React.FC<PersonalityFilesListProps> = React.memo(({
  sectionId,
  activeFileId,
  onFileSelect,
  onNewConversation,
  collapsed,
  onToggleCollapse
}) => {
  const dispatch = useAppDispatch()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Get files for this section using memoized selector
  const files = useAppSelector(
    selectPersonalityFilesBySection(sectionId as 'emotional-depth' | 'consciousness' | 'motivation' | 'moral-intuition' | 'irrationality' | 'growth' | 'social-identity' | 'creativity' | 'mortality' | 'contradiction')
  )
  const isLoading = useAppSelector(selectPersonalityFilesLoading)

  const handleDelete = useCallback(async (file: PersonalityFile) => {
    if (!confirm(`Delete "${file.metadata.title || 'Untitled Conversation'}"?`)) {
      return
    }

    setDeletingId(file.id)
    try {
      await dispatch(deletePersonalityFile({
        id: file.id,
        sectionId: file.sectionId
      })).unwrap()
      console.log(`[PersonalityFilesList] Deleted file: ${file.id}`)
    } catch (error) {
      console.error('[PersonalityFilesList] Failed to delete file:', error)
      alert('Failed to delete conversation. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }, [dispatch])

  // Collapsed view - just show toggle button
  if (collapsed) {
    return (
      <div className="flex h-full flex-col border-r border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-4">
          <button
            onClick={onToggleCollapse}
            className="rounded-lg p-2 hover:bg-accent"
            title="Expand sidebar"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center p-4">
          <History className="h-6 w-6 text-muted-foreground" />
        </div>
      </div>
    )
  }

  // Expanded view
  return (
    <div className="flex h-full w-80 flex-col border-r border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold text-sm">Saved Conversations</h2>
        </div>

        <button
          onClick={onToggleCollapse}
          className="rounded-lg p-1 hover:bg-accent"
          title="Collapse sidebar"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* New Conversation Button */}
      <div className="border-b border-border p-4">
        <AppButton
          onClick={onNewConversation}
          variant="outline"
          size="sm"
          className="w-full"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          New Conversation
        </AppButton>
      </div>

      {/* Files List */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading && files.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <History className="mb-3 h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground/80">No saved conversations</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Your saved conversations will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <PersonalityFileItem
                key={file.id}
                file={file}
                isActive={file.id === activeFileId}
                onClick={onFileSelect}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {deletingId && (
          <div className="mt-4 flex items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Deleting...
          </div>
        )}
      </div>

      {/* Footer Info */}
      {files.length > 0 && (
        <div className="border-t border-border p-4">
          <p className="text-xs text-muted-foreground text-center">
            {files.length} {files.length === 1 ? 'conversation' : 'conversations'}
          </p>
        </div>
      )}
    </div>
  )
})

PersonalityFilesList.displayName = 'PersonalityFilesList'
