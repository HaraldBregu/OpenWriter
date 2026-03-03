import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/core'
import { Heading, Type, List, ListOrdered } from 'lucide-react'
import { PluginKey } from '@tiptap/pm/state'
import { OptionMenuPlugin } from './option-menu-plugin'

interface OptionMenuProps {
  editor: Editor
}

interface MenuItem {
  label: string
  icon: React.ElementType
  command: (editor: Editor, slashPos: number, queryLength: number) => void
}

const MENU_ITEMS: MenuItem[] = [
  {
    label: 'Heading 1',
    icon: Heading,
    command: (editor, slashPos, queryLength) => {
      editor.chain().focus().deleteRange({ from: slashPos, to: slashPos + 1 + queryLength }).setHeading({ level: 1 }).run()
    },
  },
  {
    label: 'Heading 2',
    icon: Heading,
    command: (editor, slashPos, queryLength) => {
      editor.chain().focus().deleteRange({ from: slashPos, to: slashPos + 1 + queryLength }).setHeading({ level: 2 }).run()
    },
  },
  {
    label: 'Heading 3',
    icon: Heading,
    command: (editor, slashPos, queryLength) => {
      editor.chain().focus().deleteRange({ from: slashPos, to: slashPos + 1 + queryLength }).setHeading({ level: 3 }).run()
    },
  },
  {
    label: 'Text',
    icon: Type,
    command: (editor, slashPos, queryLength) => {
      editor.chain().focus().deleteRange({ from: slashPos, to: slashPos + 1 + queryLength }).setParagraph().run()
    },
  },
  {
    label: 'Bullet List',
    icon: List,
    command: (editor, slashPos, queryLength) => {
      editor.chain().focus().deleteRange({ from: slashPos, to: slashPos + 1 + queryLength }).toggleBulletList().run()
    },
  },
  {
    label: 'Ordered List',
    icon: ListOrdered,
    command: (editor, slashPos, queryLength) => {
      editor.chain().focus().deleteRange({ from: slashPos, to: slashPos + 1 + queryLength }).toggleOrderedList().run()
    },
  },
]

const pluginKey = new PluginKey('optionMenu')

export function OptionMenu({ editor }: OptionMenuProps): React.JSX.Element {
  const menuRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const slashPosRef = useRef<number | null>(null)

  const queryRef = useRef(query)
  queryRef.current = query
  const selectedIndexRef = useRef(selectedIndex)
  selectedIndexRef.current = selectedIndex

  const filteredItems = MENU_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase()),
  )

  const filteredItemsRef = useRef(filteredItems)
  filteredItemsRef.current = filteredItems

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const executeCommand = useCallback(
    (item: MenuItem) => {
      const slashPos = slashPosRef.current
      if (slashPos === null) return
      item.command(editor, slashPos, queryRef.current.length)
    },
    [editor],
  )

  const onKeyEvent = useCallback(
    (event: KeyboardEvent): boolean => {
      const items = filteredItemsRef.current
      const count = Math.max(items.length, 1)

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % count)
        return true
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + count) % count)
        return true
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        const idx = selectedIndexRef.current
        if (items[idx]) {
          executeCommand(items[idx])
        }
        return true
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        setVisible(false)
        return true
      }

      return false
    },
    [executeCommand],
  )

  useEffect(() => {
    const el = menuRef.current
    if (!el || editor.isDestroyed) return

    const plugin = OptionMenuPlugin({
      pluginKey,
      editor,
      element: el,
      onShow: () => setVisible(true),
      onHide: () => {
        setVisible(false)
        setQuery('')
        setSelectedIndex(0)
        slashPosRef.current = null
      },
      onQueryChange: (q, slashPos) => {
        setQuery(q)
        slashPosRef.current = slashPos
      },
      onKeyEvent,
    })

    editor.registerPlugin(plugin)
    return () => {
      editor.unregisterPlugin(pluginKey)
    }
  }, [editor, onKeyEvent])

  return (
    <div
      ref={menuRef}
      className="z-50 flex flex-col rounded-md border border-border bg-popover p-1 shadow-md"
      style={{ visibility: 'hidden', position: 'absolute', minWidth: '180px' }}
    >
      {filteredItems.length > 0
        ? filteredItems.map((item, index) => {
            const Icon = item.icon
            return (
              <button
                key={item.label}
                className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-left transition-colors ${
                  index === selectedIndex
                    ? 'bg-accent text-accent-foreground'
                    : 'text-popover-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
                onMouseEnter={() => setSelectedIndex(index)}
                onMouseDown={(e) => {
                  e.preventDefault()
                  executeCommand(item)
                }}
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{item.label}</span>
              </button>
            )
          })
        : <div className="px-2 py-1.5 text-sm text-muted-foreground">No results</div>}
    </div>
  )
}
