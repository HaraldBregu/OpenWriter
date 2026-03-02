import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export interface UseCreateWritingResult {
  createWriting: () => Promise<void>
  isCreating: boolean
  error: string | null
  clearError: () => void
}

/**
 * Encapsulates the "New Writing" creation flow:
 *   1. Calls window.workspace.saveOutput to persist the folder on disk.
 *   2. Navigates to /content/:id on success.
 *
 * Uses a ref-based in-flight guard so rapid successive clicks are ignored
 * without requiring the caller to track the loading state in their own
 * dependency array.
 *
 * Block names are stable UUIDs so the block .md filename is unique even
 * if two writings are created within the same second.
 */
export function useCreateWriting(): UseCreateWritingResult {
  const navigate = useNavigate()
  const inFlightRef = useRef(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
