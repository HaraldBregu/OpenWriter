---
name: IPC Architecture Patterns
description: How OpenWriter structures IPC channels, type maps, preload bridge, and Redux integration
type: project
---

All IPC channel names and type signatures live in `src/shared/channels.ts` (single source of truth).

**Key maps:**
- `InvokeChannelMap` -- typed args/result for ipcRenderer.invoke / ipcMain.handle
- `SendChannelMap` -- fire-and-forget channels
- `EventChannelMap` -- main-to-renderer push events via webContents.send

**Main process handlers** registered in `src/main/ipc/workspace-ipc.ts` using `wrapIpcHandler` (receives event) or `wrapSimpleHandler` (no event). Both wrap in `IpcResult<T>`.

**Preload bridge** in `src/preload/index.ts` uses:
- `typedInvokeUnwrap` for IpcResult-wrapped channels (unwraps to T or throws)
- `typedOn` for event subscriptions (returns cleanup function)
- API shape declared in `src/preload/index.d.ts` as interfaces (AppApi, WorkspaceApi, TaskApi)

**Renderer integration:**
- `App.tsx` has top-level IPC-to-Redux bridges (module-scope, outside component) that subscribe to watcher events and dispatch Redux actions
- RTK listener middleware handles side-effects (e.g., `insertFilesRequested` triggers IPC call)
- Store at `src/renderer/src/store/index.ts`

**Why:** Keeping channel names in shared/channels.ts ensures type safety across all 3 processes (main, preload, renderer).

**How to apply:** When adding new IPC channels, update channels.ts (channel constant + InvokeChannelMap/EventChannelMap), workspace-ipc.ts (handler), preload/index.d.ts (type), preload/index.ts (implementation).
