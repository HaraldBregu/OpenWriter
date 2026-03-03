/** Only paragraph blocks are supported. */
export type BlockType = 'paragraph'

export interface Block {
  id: string
  /** Always 'paragraph'. Kept in the interface for forwards-compatibility with
   *  data loaded from disk that may have been written by an older version. */
  type: BlockType
  /**
   * Rich-text / markdown content.
   */
  content: string
  /** ISO 8601 — set when the block is first created */
  createdAt: string
  /** ISO 8601 — updated whenever the block content changes */
  updatedAt: string
}

export interface ContentBlockProps {
  block: Block
  /** Called when block rich-text content changes. */
  onChange: (id: string, content: string) => void
  placeholder?: string
  /** When true the editor will grab focus immediately after mount. */
  autoFocus?: boolean
  /**
   * Called when the user clicks the "+" (add paragraph below) gutter button
   * inside this block's editor.  The parent is responsible for inserting a new
   * block after the block identified by `id`.
   */
  onAddBelow?: (id: string) => void
  onDelete?: (id: string) => void
}

export function createBlock(): Block {
  const now = new Date().toISOString()
  return { id: crypto.randomUUID(), type: 'paragraph', content: '', createdAt: now, updatedAt: now }
}
