import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/core'
import { PluginKey } from '@tiptap/pm/state'
import { PromptInputPlugin, type PromptInputView } from './prompt-input-plugin'
import { GUTTER_WIDTH } from '../BlockControls'
import { AppInput } from '@components/app/AppInput'

interface PromptInputProps {
  editor: Editor
  /** The editor container div — used to match the content area width. */
  containerRef: React.RefObject<HTMLDivElement | null>
  onSubmit: (prompt: string, triggerPos: number) => void
}

const pluginKey = new PluginKey('promptInput')

export function PromptInput({
  editor,
  containerRef,
  onSubmit,
}: PromptInputProps): React.JSX.Element {
  const floatingRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pluginViewRef = useRef<PromptInputView | null>(null)
  const [prompt, setPrompt] = useState('')
  const triggerPosRef = useRef<number | null>(null)
  // Track visibility so the mousedown listener knows whether to act.
  const visibleRef = useRef(false)

  const promptRef = useRef(prompt)
  promptRef.current = prompt

  // ------------------------------------------------------------------
  // Sync width from the container to the floating element.
  // Called from onBeforeShow so the element is sized before Floating UI
  // computes its position.
  // ------------------------------------------------------------------
  const syncWidth = useCallback(() => {
    const container = containerRef.current
    const floating = floatingRef.current
    if (!container || !floating) return
    const contentWidth = container.getBoundingClientRect().width - GUTTER_WIDTH * 2
    floating.style.width = `${Math.max(contentWidth, 200)}px`
  }, [containerRef])

  // ------------------------------------------------------------------
  // dismiss — clears React state only (called by the plugin's onDismiss)
  // ------------------------------------------------------------------
  const dismiss = useCallback(() => {
    visibleRef.current = false
    setPrompt('')
    triggerPosRef.current = null
  }, [])

  // ------------------------------------------------------------------
  // hide — tells the plugin view to hide (triggers dismiss via onDismiss)
  // ------------------------------------------------------------------
  const hide = useCallback(() => {
    pluginViewRef.current?.hide()
  }, [])

  // ------------------------------------------------------------------
  // submit
  // ------------------------------------------------------------------
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

  // ------------------------------------------------------------------
  // Register the ProseMirror plugin once on mount.
  // ------------------------------------------------------------------
  useEffect(() => {
    const el = floatingRef.current
    if (!el || editor.isDestroyed) return

    const plugin = PromptInputPlugin({
      pluginKey,
      editor,
      element: el,
      onTrigger: (pos) => {
        triggerPosRef.current = pos
        visibleRef.current = true
        requestAnimationFrame(() => inputRef.current?.focus())
      },
      onDismiss: dismiss,
      onKeyEvent,
      onBeforeShow: () => {
        syncWidth()
      },
      onViewReady: (view) => {
        pluginViewRef.current = view
      },
    })

    editor.registerPlugin(plugin)
    return () => {
      editor.unregisterPlugin(pluginKey)
    }
  }, [editor, dismiss, onKeyEvent, syncWidth])

  // ------------------------------------------------------------------
  // Click-outside dismissal — attach once, check visibleRef at runtime.
  // Using mousedown (not click) so the input doesn't re-open on fast
  // double-clicks and so we fire before the editor's own mousedown.
  // ------------------------------------------------------------------
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent): void => {
      if (!visibleRef.current) return
      const floating = floatingRef.current
      if (!floating) return
      // If the click is inside the floating element, do nothing.
      if (floating.contains(e.target as Node)) return
      // Otherwise dismiss.
      pluginViewRef.current?.hide()
    }

    document.addEventListener('mousedown', handleMouseDown, true)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown, true)
    }
  }, [])

  return (
    <div
      ref={floatingRef}
      className="z-50 flex items-center gap-2 rounded-md border border-border bg-popover px-3 py-2 shadow-md"
      style={{ visibility: 'hidden', position: 'absolute' }}
    >
      <AppInput
        ref={inputRef}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            submit()
            requestAnimationFrame(() => { if (!editor.isDestroyed) editor.commands.focus() })
          } else if (e.key === 'Escape') {
            hide()
            requestAnimationFrame(() => { if (!editor.isDestroyed) editor.commands.focus() })
          }
        }}
        placeholder="Ask AI anything…"
        className="flex-1 border-none bg-transparent shadow-none focus-visible:ring-0"
      />
    </div>
  )
}
