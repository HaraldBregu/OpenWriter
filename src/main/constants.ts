// ---------------------------------------------------------------------------
// Main Process Constants
// ---------------------------------------------------------------------------
// Central location for constants used across the main process.
//
// Context-specific constants that only make sense within their own module
// (e.g. LOG_PREFIX strings, private retry limits) remain co-located with
// their implementation.  This file collects constants that are referenced
// from multiple main-process modules or that document important boundaries.
//
// DO NOT import Electron APIs that are only available after app.whenReady().
// Pure string/number/boolean literals are safe to define at module scope.
// ---------------------------------------------------------------------------

// ---- File system ---------------------------------------------------------

/** Proprietary project file extension for this application. */
export const TSRCT_EXT = '.tsrct'

// ---- Task system ---------------------------------------------------------

/** Default task priority when none is specified. */
export const DEFAULT_TASK_PRIORITY = 'normal' as const

/** Maximum number of tasks in the queue before new submissions are rejected. */
export const MAX_QUEUE_SIZE = 100

// ---- AI defaults ---------------------------------------------------------

/** Default system prompt used by the AIChatHandler when none is provided. */
export const DEFAULT_AI_SYSTEM_PROMPT = 'You are a helpful AI assistant.'

/** Default temperature used when a request does not override it. */
export const DEFAULT_AI_TEMPERATURE = 0.7

// ---- File download -------------------------------------------------------

/** Throttle interval (ms) for download progress IPC events. */
export const DOWNLOAD_PROGRESS_THROTTLE_MS = 100

/** Default number of retries for failed downloads. */
export const DOWNLOAD_DEFAULT_MAX_RETRIES = 3

/** Base retry delay (ms); multiplied exponentially on subsequent retries. */
export const DOWNLOAD_BASE_RETRY_DELAY_MS = 1000

// ---- Store ---------------------------------------------------------------

/** Maximum number of recent workspace entries to keep. */
export const MAX_RECENT_WORKSPACES = 10

// ---- Logger --------------------------------------------------------------

/** Default log flush interval in milliseconds. */
export const LOG_FLUSH_INTERVAL_MS = 5000

/** Default maximum buffer size (lines) before forcing a flush. */
export const LOG_MAX_BUFFER_SIZE = 100

/** Default log retention period in days. */
export const LOG_MAX_RETENTION_DAYS = 30

// ---- Workspace -----------------------------------------------------------

/** How often (ms) to validate that the current workspace folder still exists. */
export const WORKSPACE_VALIDATION_INTERVAL_MS = 5_000
