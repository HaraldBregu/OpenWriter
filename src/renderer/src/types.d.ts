// ---------------------------------------------------------------------------
// Renderer Global Ambient Types
// ---------------------------------------------------------------------------
// This file provides GLOBAL (no-import-needed) type declarations for the
// renderer process. It is included by tsconfig.web.json via the `include`
// glob, making its declarations available everywhere in the renderer.
//
// Keep this file minimal. Prefer importing from:
//   - @/types  (src/renderer/src/types.ts)  for renderer-specific types
//   - src/shared/types/  for cross-context IPC types
//   - src/preload/index.d.ts  for window API types
//
// ---------------------------------------------------------------------------

/**
 * A single message in a renderer-side AI conversation.
 *
 * Declared as a global ambient type so that hooks and components can use
 * `AIMessage` without an explicit import.  The canonical definition lives in
 * src/renderer/src/types.ts; this declaration mirrors it for ambient access.
 */
interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}
