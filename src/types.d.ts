// ---------------------------------------------------------------------------
// Shared Cross-Context Ambient Type Declarations
// ---------------------------------------------------------------------------
// This file contains ambient type declarations that are available globally
// across ALL process contexts (main, preload, renderer).
//
// Rules for this file:
//   - Only place types here that are truly needed in 2+ process contexts
//     AND that make sense as global ambient declarations (no import needed).
//   - For shared types that can be imported as modules, prefer:
//     src/shared/types/ipc/types.ts  — IPC data shapes
//     src/shared/types/aiSettings.ts — AI settings types
//   - Do NOT import Electron, Node.js, React, or browser APIs here.
//
// Referenced by:
//   - tsconfig.node.json: "types": ["./src/types", ...]
//   - tsconfig.web.json:  "types": ["./src/types.d.ts", ...]
// ---------------------------------------------------------------------------

// (Add cross-context global augmentations here when needed.)
