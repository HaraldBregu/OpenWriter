import { type Range } from '@tiptap/core'
import { type Editor } from '@tiptap/react'
import { PluginKey } from '@tiptap/pm/state'
import { type SuggestionKeyDownProps, type SuggestionProps } from '@tiptap/suggestion'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SlashCommandItem = {
  title: string
  description: string
  command: (editor: Editor, range: Range) => void
}

export type SlashMenuState = SuggestionProps<SlashCommandItem>

export type SlashMenuHandler = {
  onStart: (props: SlashMenuState) => void
  onUpdate: (props: SlashMenuState) => void
  onKeyDown: (props: SuggestionKeyDownProps) => boolean
  onExit: () => void
}

// ---------------------------------------------------------------------------
// Stable plugin key — used to register/unregister the suggestion plugin.
// ---------------------------------------------------------------------------

export const SLASH_PLUGIN_KEY = new PluginKey<SlashMenuState>('slashCommand')

// ---------------------------------------------------------------------------
// Built-in commands
// ---------------------------------------------------------------------------

export const SLASH_COMMANDS: SlashCommandItem[] = [
  {
    title: 'Text',
    description: 'Plain paragraph',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setParagraph().run()
    },
  },
  {
    title: 'Heading 1',
    description: 'Large section heading',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run()
    },
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run()
    },
  },
  {
    title: 'Heading 3',
    description: 'Small section heading',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run()
    },
  },
  {
    title: 'Bullet List',
    description: 'Unordered list',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run()
    },
  },
  {
    title: 'Ordered List',
    description: 'Numbered list',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run()
    },
  },
  {
    title: 'Code Block',
    description: 'Monospace code block',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run()
    },
  },
  {
    title: 'Blockquote',
    description: 'Quoted text block',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run()
    },
  },
]
