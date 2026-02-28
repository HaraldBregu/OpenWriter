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
  isOnly: boolean
  isLast?: boolean
  /** Called when block rich-text content changes. */
  onChange: (id: string, content: string) => void
  onDelete: (id: string) => void
  onAdd?: (afterId: string) => void
  /** Writing entry UUID — used to commit enhanced content to the correct Redux entry. */
  entryId: string
  placeholder?: string
  /** When true the editor will grab focus immediately after mount. */
  autoFocus?: boolean
  /** @deprecated TipTap is now managed internally by AppTextEditor. This prop is ignored. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onEditorReady?: (blockId: string, editor: any) => void
}

export function createBlock(): Block {
  const now = new Date().toISOString()
  return { id: crypto.randomUUID(), type: 'paragraph', content: '', createdAt: now, updatedAt: now }
}
