import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Send, StopCircle } from 'lucide-react'
import { AppButton } from '@/components/app/AppButton'

export interface PersonalityChatInputProps {
  onSubmit: (prompt: string) => void | Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  placeholder?: string
  disabled?: boolean
}

export const PersonalityChatInput: React.FC<PersonalityChatInputProps> = React.memo(({
  onSubmit,
  onCancel,
  isLoading = false,
  placeholder = 'Ask a question...',
  disabled = false
}) => {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [])

  useEffect(() => {
    adjustHeight()
  }, [value, adjustHeight])

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim()
    if (!trimmed || isLoading || disabled) return

    await onSubmit(trimmed)
    setValue('')

    // Reset height after submit
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, isLoading, disabled, onSubmit])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit])

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel()
    }
  }, [onCancel])

  return (
    <div className="border-t border-border bg-background p-4">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-end gap-2">
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled || isLoading}
              className="w-full resize-none rounded-lg border border-input bg-background px-4 py-3 pr-12 text-sm outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
              rows={1}
              style={{ maxHeight: '200px' }}
            />
          </div>

          {isLoading ? (
            <AppButton
              onClick={handleCancel}
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0"
            >
              <StopCircle className="h-5 w-5" />
            </AppButton>
          ) : (
            <AppButton
              onClick={handleSubmit}
              disabled={!value.trim() || disabled}
              size="icon"
              className="h-10 w-10 shrink-0"
            >
              <Send className="h-4 w-4" />
            </AppButton>
          )}
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
})

PersonalityChatInput.displayName = 'PersonalityChatInput'
