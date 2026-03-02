import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { SaveOutputResult } from '../../preload/index.d'

export interface UseCreateWritingOptions {
  /** Called immediately after the workspace IPC resolves, before navigation. */
  onCreated?: (result: SaveOutputResult) => void
}

export interface UseCreateWritingResult {
  createWriting: () => Promise<void>
  isCreating: boolean
  error: string | null
  clearError: () => void
}

/**
 * Encapsulates the "New Writing" creation flow:
 *   1. Calls window.workspace.saveOutput to persist the folder on disk.
 *   2. Invokes options.onCreated with the result (if provided) so callers
 *      can optimistically update their UI before the file-watcher fires.
 *   3. Navigates to /content/:id on success.
 *
 * Uses a ref-based in-flight guard so rapid successive clicks are ignored
 * without requiring the caller to track the loading state in their own
 * dependency array.
 *
 * Block names are stable UUIDs so the block .md filename is unique even
 * if two writings are created within the same second.
 */
export function useCreateWriting(options?: UseCreateWritingOptions): UseCreateWritingResult {
  const navigate = useNavigate()
  const inFlightRef = useRef(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Keep options in a ref so the createWriting callback never needs to be
  // recreated when the caller's onCreated identity changes.
  const optionsRef = useRef(options)
  optionsRef.current = options

  const createWriting = useCallback(async () => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    setIsCreating(true)
    setError(null)

    try {
      const now = new Date().toISOString()
      const blockId = crypto.randomUUID()

      const result = await window.workspace.saveOutput({
        type: 'writings',
        blocks: [{ name: blockId, content: '', createdAt: now, updatedAt: now }],
        metadata: { title: '' },
      })

      // Notify caller immediately — before navigation — so the sidebar list
      // can be updated optimistically without waiting for the file watcher.
      optionsRef.current?.onCreated?.(result)

      navigate(`/content/${result.id}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create writing.'
      setError(message)
    } finally {
      setIsCreating(false)
      inFlightRef.current = false
    }
  }, [navigate])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return { createWriting, isCreating, error, clearError }
}
