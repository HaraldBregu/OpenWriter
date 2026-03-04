import React, { useEffect, useRef } from 'react'
import type { Editor } from '@tiptap/core'
import { Bold, Italic, Underline, Strikethrough, Heading1, Heading2, Heading3 } from 'lucide-react'
import { BubbleMenuPlugin } from './bubble-menu-plugin'
import { PluginKey } from '@tiptap/pm/state'
import { AppButton } from '../../AppButton'

interface BubbleMenuProps {
  editor: Editor
}

const pluginKey = new PluginKey('bubbleMenu')

export function BubbleMenu({ editor }: BubbleMenuProps): React.JSX.Element {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = menuRef.current
    if (!el || editor.isDestroyed) return

    const plugin = BubbleMenuPlugin({
      pluginKey,
      editor,
      element: el,
      updateDelay: 250,
    })

    editor.registerPlugin(plugin)
    return () => {
      editor.unregisterPlugin(pluginKey)
    }
  }, [editor])

  return (
    <div
      ref={menuRef}
      className="z-50 flex items-center gap-0.5 rounded-md border border-border bg-popover p-0.5 shadow-md"
      style={{ visibility: 'hidden', position: 'absolute' }}
    >
      <AppButton
        variant="ghost"
        size="icon"
        aria-label="Bold"
        className="h-7 w-7 text-muted-foreground hover:text-foreground"
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-3.5 w-3.5" />
      </AppButton>
      <AppButton
        variant="ghost"
        size="icon"
        aria-label="Italic"
        className="h-7 w-7 text-muted-foreground hover:text-foreground"
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-3.5 w-3.5" />
      </AppButton>
      <AppButton
        variant="ghost"
        size="icon"
        aria-label="Underline"
        className="h-7 w-7 text-muted-foreground hover:text-foreground"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline className="h-3.5 w-3.5" />
      </AppButton>
      <AppButton
        variant="ghost"
        size="icon"
        aria-label="Strikethrough"
        className="h-7 w-7 text-muted-foreground hover:text-foreground"
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </AppButton>

      <div className="mx-0.5 h-4 w-px bg-border" />

      <AppButton
        variant="ghost"
        size="icon"
        aria-label="Heading 1"
        className={`h-7 w-7 ${editor.isActive('heading', { level: 1 }) ? 'text-foreground bg-accent' : 'text-muted-foreground hover:text-foreground'}`}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 className="h-3.5 w-3.5" />
      </AppButton>
      <AppButton
        variant="ghost"
        size="icon"
        aria-label="Heading 2"
        className={`h-7 w-7 ${editor.isActive('heading', { level: 2 }) ? 'text-foreground bg-accent' : 'text-muted-foreground hover:text-foreground'}`}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="h-3.5 w-3.5" />
      </AppButton>
      <AppButton
        variant="ghost"
        size="icon"
        aria-label="Heading 3"
        className={`h-7 w-7 ${editor.isActive('heading', { level: 3 }) ? 'text-foreground bg-accent' : 'text-muted-foreground hover:text-foreground'}`}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="h-3.5 w-3.5" />
      </AppButton>
    </div>
  )
}
