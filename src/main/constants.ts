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
export const TSRCT_EXT = '.tsrct';

// ---- Store ---------------------------------------------------------------

/** Maximum number of recent workspace entries to keep. */
export const MAX_RECENT_WORKSPACES = 10;

// ---- Workspace -----------------------------------------------------------

/** How often (ms) to validate that the current workspace folder still exists. */
export const WORKSPACE_VALIDATION_INTERVAL_MS = 5_000;
