/** Writings slice type definitions. */
import type { OutputFileBlock } from '../../../../shared/types'

// Re-export so consumers can import from this module.
export type { OutputFileBlock }

// ---------------------------------------------------------------------------
// Slice-specific types
// ---------------------------------------------------------------------------

export interface WritingItem {
  id: string
  title: string
  path: string
  createdAt: number
  updatedAt: number
  blocks: OutputFileBlock[]
}

export interface WritingsState {
  items: WritingItem[]
  selectedId: string | null
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null
}
