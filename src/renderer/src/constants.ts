// ---------------------------------------------------------------------------
// Renderer Process Constants
// ---------------------------------------------------------------------------
// Constants used exclusively within the renderer (React UI) process.
//
// AI provider/model configuration lives in src/renderer/src/config/aiProviders.ts.
// This file collects other renderer-specific constants.
//
// Do NOT import Node.js or Electron main-process APIs here.
// ---------------------------------------------------------------------------

// ---- Task system ---------------------------------------------------------

/** Polling interval (ms) used by task hooks when no push events are available. */
export const TASK_POLL_INTERVAL_MS = 1000

/** Maximum number of task events to keep in the per-task event history. */
export const TASK_MAX_EVENT_HISTORY = 50

// ---- UI / UX -------------------------------------------------------------

/** Default debounce delay (ms) for user input fields. */
export const INPUT_DEBOUNCE_MS = 300

/** Breakpoint (px) below which the mobile layout is used. */
export const MOBILE_BREAKPOINT_PX = 768

// ---- AI defaults ---------------------------------------------------------

/**
 * Fallback provider ID used when no provider is explicitly selected.
 * Must match one of the ids in src/renderer/src/config/aiProviders.ts.
 */
export const DEFAULT_PROVIDER_ID = 'openai'

/** Fallback task type string for generic AI chat submissions. */
export const DEFAULT_TASK_TYPE = 'ai-agent'

// ---- Routing -------------------------------------------------------------

/** Hash prefix used for React Router navigation. */
export const ROUTE_HOME = '/'
export const ROUTE_WELCOME = '/welcome'
export const ROUTE_SETTINGS = '/settings'
export const ROUTE_DOCUMENTS = '/documents'
export const ROUTE_DIRECTORIES = '/directories'
export const ROUTE_NEW_WRITING = '/writing/new'
