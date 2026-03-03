import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { type Editor } from '@tiptap/react'
import Suggestion from '@tiptap/suggestion'
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Code2,
  TextQuote,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  SLASH_COMMANDS,
  SLASH_PLUGIN_KEY,
  type SlashCommandItem,
  type SlashMenuHandler,
  type SlashMenuState,
} from './extensions/SlashCommand'

// ---------------------------------------------------------------------------
// Icon map — keyed by command title
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Text: Type,
  'Heading 1': Heading1,
  'Heading 2': Heading2,
  'Heading 3': Heading3,
  'Bullet List': List,
  'Ordered List': ListOrdered,
  'Code Block': Code2,
  Blockquote: TextQuote,
}

// ---------------------------------------------------------------------------
// AppTextEditorOptionMenu
// ---------------------------------------------------------------------------

interface AppTextEditorOptionMenuProps {
  editor: Editor
}

/**
 * Slash-command palette that appears when the user types "/" in the editor.
 * Usage: `<AppTextEditorOptionMenu editor={editor} />`
 *
 * The component self-registers TipTap's Suggestion plugin on mount and cleans
 * it up on unmount — no changes to DEFAULT_EXTENSIONS are needed.
 */
export function AppTextEditorOptionMenu({
  editor,
}: AppTextEditorOptionMenuProps): React.JSX.Element | null {
  const [menu, setMenu] = useState<SlashMenuState | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Refs give the Suggestion callbacks synchronous access to the latest state
  // without stale-closure issues.
  const menuRef = useRef<SlashMenuState | null>(null)
  const selectedIndexRef = useRef(0)

  const updateMenu = (props: SlashMenuState | null) => {
    menuRef.current = props
    setMenu(props)
  }

  const updateIndex = (idx: number) => {
    selectedIndexRef.current = idx
    setSelectedIndex(idx)
  }

  // Stable ref used as the bridge between the Suggestion plugin callbacks
  // (which run outside React) and our component state.
  const handlerRef = useRef<SlashMenuHandler>({
    onStart: (props) => {
      updateIndex(0)
      updateMenu(props)
    },
    onUpdate: (props) => {
      updateIndex(0)
      updateMenu(props)
    },
    onKeyDown: ({ event }) => {
      const current = menuRef.current
      if (!current || current.items.length === 0) return false

      if (event.key === 'ArrowDown') {
        updateIndex((selectedIndexRef.current + 1) % current.items.length)
        return true
      }
      if (event.key === 'ArrowUp') {
        updateIndex(
          (selectedIndexRef.current - 1 + current.items.length) % current.items.length,
        )
        return true
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        current.command(current.items[selectedIndexRef.current])
        return true
      }
      return false
    },
    onExit: () => updateMenu(null),
  })

  // Register the Suggestion plugin when the editor is ready; clean up on unmount.
  useEffect(() => {
    const plugin = Suggestion<SlashCommandItem>({
      pluginKey: SLASH_PLUGIN_KEY,
      editor,
      char: '/',
      startOfLine: false,
      items: ({ query }) =>
        SLASH_COMMANDS.filter((cmd) => cmd.title.toLowerCase().includes(query.toLowerCase())),
      render: () => ({
        onStart: (props) => handlerRef.current.onStart(props),
        onUpdate: (props) => handlerRef.current.onUpdate(props),
        onKeyDown: (props) => handlerRef.current.onKeyDown(props),
        onExit: () => handlerRef.current.onExit(),
      }),
      command: ({ editor: ed, range, props: item }) => {
        item.command(ed as Editor, range)
      },
    })

    // Register at the front so its handleKeyDown runs before StarterKit's Enter handler.
    editor.registerPlugin(plugin, (newPlugin, plugins) => [newPlugin, ...plugins])
    return () => {
      editor.unregisterPlugin(SLASH_PLUGIN_KEY)
    }
  }, [editor])

  // Computed position — null until measured via useLayoutEffect.
  const menuElRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  // Measure the rendered menu and flip above/below + clamp horizontally.
  useLayoutEffect(() => {
    if (!menu || !menuElRef.current) {
      setPos(null)
      return
    }
    const trigger = menu.clientRect?.()
    if (!trigger) return

    const { offsetHeight: h, offsetWidth: w } = menuElRef.current
    const vw = window.innerWidth
    const vh = window.innerHeight
    const GAP = 6

    const spaceBelow = vh - trigger.bottom - GAP
    const top =
      spaceBelow >= h
        ? trigger.bottom + GAP           // enough room below → open downward
        : trigger.top - h - GAP          // not enough → open upward

    // Clamp so the menu never overflows the viewport horizontally.
    const left = Math.max(8, Math.min(trigger.left, vw - w - 8))

    setPos({ top, left })
  }, [menu])

  // Prevent page scroll while the command palette is open.
  useEffect(() => {
    if (!menu) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const prevent = (e: WheelEvent) => e.preventDefault()
    window.addEventListener('wheel', prevent, { passive: false })
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('wheel', prevent)
    }
  }, [menu])

  if (!menu || menu.items.length === 0) return null

  return createPortal(
    <div
      ref={menuElRef}
      style={{
        position: 'fixed',
        // Hidden until useLayoutEffect calculates the final position.
        visibility: pos ? 'visible' : 'hidden',
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        zIndex: 9999,
      }}
      className="w-56 rounded-lg border border-border bg-popover shadow-lg overflow-hidden py-1"
      onMouseDown={(e) => e.preventDefault()}
    >
      {menu.items.map((item, index) => {
        const Icon = ICON_MAP[item.title]
        return (
          <button
            key={item.title}
            onClick={() => menu.command(item)}
            onMouseEnter={() => updateIndex(index)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
              index === selectedIndex
                ? 'bg-accent text-accent-foreground'
                : 'text-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            {Icon && (
              <span className="flex-shrink-0 text-muted-foreground">
                <Icon size={15} />
              </span>
            )}
            <span className="flex flex-col">
              <span className="text-sm font-medium leading-none">{item.title}</span>
              <span className="text-xs text-muted-foreground mt-0.5">{item.description}</span>
            </span>
          </button>
        )
      })}
    </div>,
    document.body,
  )
}
