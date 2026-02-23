import React from 'react'
import { FileText, Trash2 } from 'lucide-react'
import type { PersonalityFile } from '@/store/personalityFilesSlice'

export interface PersonalityFileItemProps {
  file: PersonalityFile
  isActive: boolean
  onClick: (file: PersonalityFile) => void
  onDelete: (file: PersonalityFile) => void
}

/**
 * Format timestamp to relative time (e.g., "2 hours ago", "3 days ago")
 */
function formatTimeAgo(timestamp: number): string {
  const now = Date.now()
  const diffMs = now - timestamp
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins === 1) return '1 minute ago'
  if (diffMins < 60) return `${diffMins} minutes ago`
  if (diffHours === 1) return '1 hour ago'
  if (diffHours < 24) return `${diffHours} hours ago`
  if (diffDays === 1) return '1 day ago'
  if (diffDays < 7) return `${diffDays} days ago`

  // For older dates, show the actual date
  const date = new Date(timestamp)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export const PersonalityFileItem: React.FC<PersonalityFileItemProps> = React.memo(({
  file,
  isActive,
  onClick,
  onDelete
}) => {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(file)
  }

  const title = file.metadata.title || 'Untitled Conversation'
  const timeAgo = formatTimeAgo(file.savedAt)
  const messageCount = typeof file.metadata.messageCount === 'number' ? file.metadata.messageCount : null

  return (
    <button
      onClick={() => onClick(file)}
      className={`group w-full rounded-lg border p-3 text-left transition-all hover:border-primary/50 hover:bg-accent/50 ${
        isActive
          ? 'border-primary bg-accent'
          : 'border-border bg-card'
      }`}
    >
      <div className="flex items-start gap-3">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

        <div className="min-w-0 flex-1">
          <h3 className={`truncate text-sm font-medium ${
            isActive ? 'text-foreground' : 'text-foreground/90'
          }`}>
            {title}
          </h3>

          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{timeAgo}</span>
            {messageCount && (
              <>
                <span>•</span>
                <span>{messageCount} messages</span>
              </>
            )}
          </div>
        </div>

        <button
          onClick={handleDelete}
          className="shrink-0 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
          title="Delete conversation"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </button>
  )
})

PersonalityFileItem.displayName = 'PersonalityFileItem'
