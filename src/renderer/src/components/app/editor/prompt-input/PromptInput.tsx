import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/core'
import { PluginKey } from '@tiptap/pm/state'
import { PromptInputPlugin, type PromptInputView } from './prompt-input-plugin'

interface PromptInputProps {
  editor: Editor
  onSubmit: (prompt: string, triggerPos: number) => void
}

const pluginKey = new PluginKey('promptInput')

export function PromptInput({ editor, onSubmit }: PromptInputProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pluginViewRef = useRef<PromptInputView | null>(null)
  const [prompt, setPrompt] = useState('')
  const triggerPosRef = useRef<number | null>(null)

  const promptRef = useRef(prompt)
  promptRef.current = prompt

  const dismiss = useCallback(() => {
    setPrompt('')
    triggerPosRef.current = null
  }, [])

  const hide = useCallback(() => {
    pluginViewRef.current?.hide()
  }, [])

  const submit = useCallback(() => {
    const p = promptRef.current.trim()
    const pos = triggerPosRef.current
    if (!p || pos === null) {
      hide()
      return
    }
    onSubmit(p, pos)
    hide()
  }, [onSubmit, hide])

  const onKeyEvent = useCallback(
    (event: KeyboardEvent): boolean => {
      if (event.key === 'Enter') {
        event.preventDefault()
        submit()
        return true
      }
      return false
    },
    [submit],
  )

  useEffect(() => {
    const el = containerRef.current
    if (!el || editor.isDestroyed) return

    const plugin = PromptInputPlugin({
      pluginKey,
      editor,
      element: el,
      onTrigger: (pos) => {
        triggerPosRef.current = pos
        requestAnimationFrame(() => inputRef.current?.focus())
      },
      onDismiss: dismiss,
      onKeyEvent,
      onViewReady: (view) => {
        pluginViewRef.current = view
      },
    })

    editor.registerPlugin(plugin)
    return () => {
      editor.unregisterPlugin(pluginKey)
    }
  }, [editor, dismiss, onKeyEvent])

  return (
    <div
      ref={containerRef}
      className="z-50 flex items-center gap-2 rounded-md border border-border bg-popover px-3 py-2 shadow-md"
      style={{ visibility: 'hidden', position: 'absolute', minWidth: '280px' }}
    >
      <input
        ref={inputRef}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            submit()
          } else if (e.key === 'Escape') {
            hide()
          }
        }}
        placeholder="Ask AI anything…"
        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
      />
    </div>
  )
}
