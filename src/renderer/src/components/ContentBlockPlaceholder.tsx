import React from 'react'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

// ---------------------------------------------------------------------------
// ContentBlockPlaceholder
// ---------------------------------------------------------------------------

export interface ContentBlockPlaceholderProps {
  onClick: () => void
}

export const ContentBlockPlaceholder = React.memo(function ContentBlockPlaceholder({ onClick }: ContentBlockPlaceholderProps) {
  const { t } = useTranslation()
  return (
    <div className="px-5 py-2">
      <button
        type="button"
        onClick={onClick}
        className="w-full py-3 flex items-center justify-center gap-2 border border-dashed border-border/70 rounded-lg opacity-70 hover:opacity-80 transition-opacity cursor-pointer text-muted-foreground"
      >
        <Plus className="h-4 w-4" />
        <span className="text-sm">{t('writing.insertSection')}</span>
      </button>
    </div>
  )
})
ContentBlockPlaceholder.displayName = 'ContentBlockPlaceholder'
