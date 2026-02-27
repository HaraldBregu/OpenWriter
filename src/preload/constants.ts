// ---------------------------------------------------------------------------
// Preload Process Constants
// ---------------------------------------------------------------------------
// Constants used within the preload script.
//
// The preload script is intentionally minimal: it wires IPC channel names
// (from src/shared/types/ipc/channels.ts) to the contextBridge API surface.
// Most constants relevant to the preload live in the shared layer.
//
// Add preload-specific constants here if they grow beyond a one-liner,
// for example timeout values, retry policies, or contextBridge namespace names.
// ---------------------------------------------------------------------------

/** Names of the namespaces exposed via contextBridge.exposeInMainWorld(). */
export const BRIDGE_NAMESPACE_APP = 'app' as const
export const BRIDGE_NAMESPACE_WIN = 'win' as const
export const BRIDGE_NAMESPACE_WORKSPACE = 'workspace' as const
export const BRIDGE_NAMESPACE_TASK = 'task' as const
