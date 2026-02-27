# TypeScript Expert Memory — Tesseract AI / OpenWriter

## Project Structure
- Electron + React + TypeScript app with strict process separation
- Main: `src/main/` — Node.js + Electron APIs
- Preload: `src/preload/` — contextBridge bridge (privileged, no full Node)
- Renderer: `src/renderer/src/` — React UI (browser context)
- Shared: `src/shared/types/` — cross-context IPC types (regular `.ts` modules)
- tsconfig.node.json covers main + preload + shared
- tsconfig.web.json covers renderer + preload `.d.ts` + shared

## Type Organization (established 2026-02-27)
See `patterns.md` for full details.

Key files created:
- `src/types.d.ts` — cross-context ambient declarations (currently empty, well-documented)
- `src/main/types.ts` — barrel re-export of all main-process type files
- `src/main/constants.ts` — main-process constants (TSRCT_EXT, AI defaults, etc.)
- `src/preload/types.ts` — preload-specific types (re-exports index.d.ts surface)
- `src/preload/constants.ts` — preload constants (bridge namespace names)
- `src/renderer/src/types.ts` — renderer-only types (AIMessage, SelectOption, etc.)
- `src/renderer/src/constants.ts` — renderer constants (routes, defaults, etc.)

## Critical Pattern: Ambient vs Module types in renderer
- `src/renderer/src/types.d.ts` = AMBIENT global declarations (no import/export)
- `src/renderer/src/types.ts` = Regular TypeScript module (use explicit imports)
- When a hook uses a type without importing it, it relies on ambient global in `.d.ts`
- Prefer explicit imports via `@/types` over ambient globals for new code
- The `AIMessage` ambient type was pre-existing but broken; fixed by adding explicit
  import in `useConversationTask.ts` from `@/types`

## Pre-existing Bugs Fixed
- `useConversationTask.ts`: `AIMessage` used without import (ambient broke) → added `import type { AIMessage } from '@/types'`
- `WindowFactory.ts`: unused `e` in catch block → changed to bare `catch {}`
- `TaskExecutorService.ts`: `let completed` never reassigned → changed to `const`
- `WorkspaceService.test.ts`: unused `path` import → removed

## Shared Type Architecture
- IPC types: `src/shared/types/ipc/` — used by all 3 contexts via regular imports
- AI settings: `src/shared/types/aiSettings.ts` — used by all 3 contexts
- These are REGULAR modules (not ambient), imported explicitly by each context
- Channel constants: `src/shared/types/ipc/channels.ts` — `WorkspaceChannels`, `AppChannels`, etc.

## Path Aliases
- `@/*` → `src/renderer/src/*` (renderer only)
- No `@/` aliases in main or preload — use relative imports

## Type Safety Notes
- `tsconfig.node.json` uses `"types": ["./src/types", ...]` (no .d.ts suffix)
- `tsconfig.web.json` uses `"types": ["./src/types.d.ts", ...]` (with suffix)
- Renderer's `types.d.ts` loaded via `include: ["src/renderer/src/**/*"]` glob
