/**
 * enhancementService — module-level singleton for AI block enhancement.
 *
 * Submits an 'ai-enhance' task, subscribes to its events via taskEventBus,
 * and dispatches Redux actions for streaming updates and terminal state.
 * Because this is a plain module (not a React component), it is never
 * unmounted on navigation — tasks run to completion regardless of which
 * route is active.
 */

import type { AppDispatch } from '../store'
import {
  markEnhancing,
  updateStreamingEntry,
  clearEnhancingBlock,
} from '../store/enhancementSlice'
import { updateBlockContent } from '../store/writingItemsSlice'
import { subscribeToTask } from './taskEventBus'

export interface StartEnhancementInput {
  blockId: string
  entryId: string
  text: string
}

/** Tracks blocks whose tasks are currently in-flight. */
const inFlightBlocks = new Set<string>()

/**
 * startEnhancement — submit an AI enhancement task for a single block.
 *
 * Safe to call from any hook; does not require React context.
 *
 * @param dispatch Redux dispatch from the calling component.
 * @param input    Block/entry identifiers and the text to enhance.
 */
export async function startEnhancement(
  dispatch: AppDispatch,
  { blockId, entryId, text }: StartEnhancementInput,
): Promise<void> {
  if (inFlightBlocks.has(blockId)) return
  if (!text.trim()) return
  if (typeof window.tasksManager?.submit !== 'function') {
    console.warn('[enhancementService] window.tasksManager.submit is not available.')
    return
  }

  inFlightBlocks.add(blockId)
  dispatch(markEnhancing(blockId))

  const originalText = text
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

  // Buffer seeded with the original text; tokens are appended on each event.
  const streamBuffer = { value: originalText }

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
