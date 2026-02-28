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

export function createBlock(): Block {
  const now = new Date().toISOString()
  return { id: crypto.randomUUID(), type: 'paragraph', content: '', createdAt: now, updatedAt: now }
}
