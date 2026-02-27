# TypeScript Patterns — Tesseract AI

## Type File Organization Pattern (Electron 3-process separation)

### The Rule
| Context | Types live in | Constants live in |
|---------|--------------|-------------------|
| All 3 | `src/shared/types/` (regular `.ts` modules) | `src/shared/types/aiSettings.ts` |
| Ambient global | `src/types.d.ts` (empty, documents the pattern) | — |
| Main only | `src/main/types.ts` (barrel) + `src/main/types/*.ts` | `src/main/constants.ts` |
| Preload only | `src/preload/types.ts` (re-exports index.d.ts) | `src/preload/constants.ts` |
| Renderer only | `src/renderer/src/types.ts` (module) | `src/renderer/src/constants.ts` |
| Renderer ambient | `src/renderer/src/types.d.ts` (ambient, no export) | — |

### When to use ambient vs module types
- **Module types** (`export interface Foo`): preferred, requires `import type { Foo }` at each call site
- **Ambient types** (in `.d.ts` without exports): available globally in the relevant context
- In renderer: add new types to `types.ts` (module) and import explicitly; keep `types.d.ts` minimal

### Barrel pattern for main process types
`src/main/types.ts` re-exports from:
- `./types/bluetooth`, `./types/media`, `./types/network`
- `./agentManager/AgentManagerTypes`
- `./tasks/TaskDescriptor`, `./tasks/TaskHandler`
- `./core/ServiceContainer` (Disposable), `./core/EventBus` (AppEvent, AppEvents), etc.
- `./services/workspace` (WorkspaceState), `./services/logger` (LogLevel, LoggerOptions)

### Constants pattern
Extract magic literals to named constants in the appropriate constants file:
- Main: `TSRCT_EXT`, `DEFAULT_AI_SYSTEM_PROMPT`, `DOWNLOAD_PROGRESS_THROTTLE_MS`, `MAX_RECENT_WORKSPACES`, `WORKSPACE_VALIDATION_INTERVAL_MS`
- Renderer: `TASK_MAX_EVENT_HISTORY`, `DEFAULT_PROVIDER_ID`, route constants
- Preload: bridge namespace names

## IPC Type Flow
```
src/shared/types/ipc/types.ts     ← data shapes (WorkspaceInfo, TaskEvent, etc.)
src/shared/types/ipc/channels.ts  ← channel name constants + type maps
src/preload/index.d.ts            ← API surface (AppApi, WorkspaceApi, etc.) + Window augmentation
src/renderer/src/**               ← consumes via window.workspace, window.task, etc.
src/main/ipc/**                   ← registers handlers, uses channel names + data shapes
```

## Catch block pattern (TS strict)
Use bare `catch {}` when the caught error is not used (avoids `@typescript-eslint/no-unused-vars`):
```typescript
try { ... } catch { /* silent fail */ }  // ✓
try { ... } catch (e) { /* silent fail */ }  // ✗ lint error
try { ... } catch (err) { console.error(err) }  // ✓ when error is used
```
