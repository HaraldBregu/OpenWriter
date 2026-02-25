import React from 'react'
import { useTranslation } from 'react-i18next'
import { MoreVertical, Eye, Copy, Trash2 } from 'lucide-react'
import {
  AppButton,
  AppDropdownMenu,
  AppDropdownMenuContent,
  AppDropdownMenuItem,
  AppDropdownMenuSeparator,
  AppDropdownMenuTrigger,
} from '@/components/app'

export interface DocumentActionMenuProps {
  onView: () => void
  onCopyPath: () => void
  onDelete: () => void
  /** Extra className applied to the trigger button. Useful for applying
   * parent-group–scoped visibility classes like "opacity-0 group-hover:opacity-100". */
  triggerClassName?: string
}

export const DocumentActionMenu = React.memo(function DocumentActionMenu({
  onView,
  onCopyPath,
  onDelete,
  triggerClassName = '',
}: DocumentActionMenuProps) {
  const { t } = useTranslation()

  return (
    <AppDropdownMenu>
      <AppDropdownMenuTrigger asChild>
        <AppButton
          variant="ghost"
          size="icon"
          className={`h-8 w-8 transition-opacity ${triggerClassName}`}
        >
          <MoreVertical className="h-4 w-4" />
        </AppButton>
      </AppDropdownMenuTrigger>
      <AppDropdownMenuContent align="end">
        <AppDropdownMenuItem onClick={onView}>
          <Eye className="h-4 w-4" />
          {t('common.view')}
        </AppDropdownMenuItem>
        <AppDropdownMenuItem onClick={onCopyPath}>
          <Copy className="h-4 w-4" />
          {t('documents.copyPath')}
        </AppDropdownMenuItem>
        <AppDropdownMenuSeparator />
        <AppDropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
          {t('common.delete')}
        </AppDropdownMenuItem>
      </AppDropdownMenuContent>
    </AppDropdownMenu>
  )
})
DocumentActionMenu.displayName = 'DocumentActionMenu'
