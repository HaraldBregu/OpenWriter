/**
 * enhancementService — module-level service for AI block enhancement.
 *
 * Replaces EnhancementProvider/useEnhancementContext with a plain module.
 * Uses taskEventBus to receive task events without requiring React context.
 *
 * Guards:
 *  - No-op if the block is already in-flight (tracked in inFlightBlocks).
 *  - No-op if text is empty.
 *  - No-op if window.tasksManager.submit is unavailable.
 */

import type { AppDispatch } from '../store'
import {
  markEnhancing,
  updateStreamingEntry,
  clearEnhancingBlock,
} from '../store/enhancementSlice'
import { updateBlockContent } from '../store/writingItemsSlice'
import { subscribeToTask } from './taskEventBus'

// ---------------------------------------------------------------------------
// Input type
// ---------------------------------------------------------------------------

export interface StartEnhancementInput {
  blockId: string
  entryId: string
  text: string
}

// ---------------------------------------------------------------------------
// Module-level guard: tracks blocks that are currently being enhanced.
// ---------------------------------------------------------------------------

const inFlightBlocks = new Set<string>()

// ---------------------------------------------------------------------------
// startEnhancement
// ---------------------------------------------------------------------------

/**
 * startEnhancement — submits an AI enhancement task for the given block and
 * wires up task event callbacks via taskEventBus.
 *
 * This function is safe to call from any React hook; it does NOT require
 * a React context.
 *
 * @param dispatch  Redux dispatch from the calling hook.
 * @param input     Block, entry, and text to enhance.
 */
export async function startEnhancement(
  dispatch: AppDispatch,
  { blockId, entryId, text }: StartEnhancementInput,
): Promise<void> {
  // 1. Guard: skip if already in-flight.
  if (inFlightBlocks.has(blockId)) return

  // 2. Guard: skip empty blocks.
  if (!text.trim()) return

  // 3. Guard: skip if IPC bridge is unavailable.
  if (typeof window.tasksManager?.submit !== 'function') {
    console.warn('[enhancementService] window.tasksManager.submit is not available.')
    return
  }

  // 4. Mark as in-flight and optimistically update Redux.
  inFlightBlocks.add(blockId)
  dispatch(markEnhancing(blockId))

  const originalText = text

  // 5. Submit the task.
  let taskId: string
  try {
    const ipcResult = await window.tasksManager.submit('ai-enhance', { text })
    if (!ipcResult.success) {
      console.error('[enhancementService] Submit failed for block', blockId, ipcResult.error?.message)
      inFlightBlocks.delete(blockId)
      dispatch(clearEnhancingBlock(blockId))
      return
    }
    taskId = ipcResult.data.taskId
  } catch (err) {
    console.error('[enhancementService] Submit threw for block', blockId, err)
    inFlightBlocks.delete(blockId)
    dispatch(clearEnhancingBlock(blockId))
    return
  }

  // Accumulator for streaming tokens.
  const streamBuffer = { value: originalText }

  // 6. Subscribe to task events via the module-level bus.
  const unsub = subscribeToTask(taskId, (snap) => {
    if (snap.streamedContent) {
      streamBuffer.value = originalText + snap.streamedContent
      dispatch(updateStreamingEntry({ blockId, content: streamBuffer.value }))
    }

    if (snap.status === 'completed') {
      dispatch(updateBlockContent({ entryId, blockId, content: streamBuffer.value }))
      cleanup()
    } else if (snap.status === 'error') {
      console.error('[enhancementService] Enhance error for block', blockId, snap.error)
      dispatch(updateBlockContent({ entryId, blockId, content: originalText }))
      cleanup()
    } else if (snap.status === 'cancelled') {
      dispatch(updateBlockContent({ entryId, blockId, content: originalText }))
      cleanup()
    }
  })

  function cleanup(): void {
    unsub()
    inFlightBlocks.delete(blockId)
    dispatch(clearEnhancingBlock(blockId))
  }
}
