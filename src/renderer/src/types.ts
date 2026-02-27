// ---------------------------------------------------------------------------
// Renderer Process Types
// ---------------------------------------------------------------------------
// Types used exclusively within the renderer process (React UI layer).
//
// Cross-context types (shared between main, preload, renderer) live in:
//   src/shared/types/ipc/types.ts
//   src/shared/types/aiSettings.ts
//
// The preload API surface (window.app, window.workspace, etc.) is typed in:
//   src/preload/index.d.ts
//
// This file collects renderer-specific types that are referenced across
// multiple renderer modules.
// ---------------------------------------------------------------------------

// ---- AI Conversation -----------------------------------------------------

/**
 * A single message in a renderer-side AI conversation.
 *
 * This is a renderer-only type representing the UI-level message shape.
 * It is distinct from LangChain's AIMessage and from the shared IPC types.
 *
 * Note: Also declared as a global ambient type in types.d.ts so that hooks
 * written before explicit imports were standard can still reference AIMessage
 * without an import statement.
 */
export interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

// ---- Component utilities -------------------------------------------------

/**
 * Generic option shape for select/dropdown components.
 */
export interface SelectOption<T = string> {
  label: string
  value: T
  disabled?: boolean
}

/**
 * Common async operation state.
 */
export interface AsyncState<T = void> {
  data: T | null
  isLoading: boolean
  error: string | null
}
