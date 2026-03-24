# Architecture Overview

OpenWriter is an Electron application structured in three distinct layers: **Renderer**, **Preload / API**, and **Main**. Each layer has a clear responsibility and communicates only through the defined boundaries below.

```
┌─────────────────────────────────────────────────────────────┐
│                         Renderer                            │
│   React UI, pages, components, Redux store, TipTap editor  │
└─────────────────────────────────────────────────────────────┘
                              │
                    (contextBridge IPC)
                              │
┌─────────────────────────────────────────────────────────────┐
│                       Preload / API                         │
│                                                             │
│   ┌───────────┐  ┌────────┐  ┌──────────┐  ┌─────────┐    │
│   │ Workspace │  │  Task  │  │  Window  │  │   App   │    │
│   └─────:─────┘  └───:────┘  └──────────┘  └─────────┘    │
└─────────:────────────:────────────────────────────────────  ┘
          :            :  (ipcMain.handle)
          :     ┌──────:──────────────────────────────────────┐
          :     │      ▼                                      │
          :     │  ┌──────────────┐                           │
          :     │  │ Task Manager │                           │
          :     │  └──────┬───────┘                           │
          :     │         │                                   │
          :     │         ▼                                   │
          :     │  ┌─────────────┐                            │
          :     │  │  AI Manager │                     Main   │
          :     │  └──────○──────┘                            │
          :     │         ○                                   │
          :     │  ┌──────┴───────┐                           │
          └......▶ │  Workspace   │                           │
                │  └──────────────┘                           │
                └────────────────────────────────────────────-┘
```

**Legend**

- `│` solid line — direct call / ownership
- `:` dotted line — IPC channel (Preload → Main)
- `○` interface connector — AI Manager uses Workspace via a defined interface

---

## Layers

### Renderer

The browser-side process. Contains all React UI code: pages, components, hooks, and the Redux store. Has no direct access to Node.js APIs or the file system — all system interactions go through the Preload API.

Key directories: `src/renderer/src/`

---

### Preload / API

The bridge layer exposed via Electron's `contextBridge`. Defines the typed surface the Renderer can call. Each namespace maps to a set of IPC channels.

| Namespace   | Responsibility                                              |
| ----------- | ----------------------------------------------------------- |
| `Workspace` | Open, close, and watch workspace folders                    |
| `Task`      | Create, cancel, and stream background tasks                 |
| `Window`    | Control the BrowserWindow (maximize, minimize, close, etc.) |
| `App`       | App-level utilities (version, platform, theme, etc.)        |

Key files: `src/preload/index.ts`, `src/preload/index.d.ts`

---

### Main

The Node.js process. Handles all privileged operations: file system, AI model calls, and long-running background work.

| Module         | Responsibility                                             | Depends on   |
| -------------- | ---------------------------------------------------------- | ------------ |
| `Task Manager` | Priority queue, concurrent task execution, progress stream | —            |
| `AI Manager`   | LLM orchestration via LangChain/LangGraph, prompt routing  | Task Manager |
| `Workspace`    | File system watch, folder read/write, recent files         | AI Manager ○ |

> `○` — AI Manager accesses Workspace through an interface (not a direct import), keeping the dependency inverted.

Key directories: `src/main/`

---

## Communication Flow

```
Renderer  →  window.api.<namespace>.<method>()
          →  IPC channel (ipcRenderer.invoke / ipcRenderer.send)
          →  Main process handler (ipcMain.handle)
          →  Module (Workspace / TaskManager / AIManager)
          ←  Result / stream events back to Renderer
```

The Preload layer is the only place where `ipcRenderer` is used. The Renderer never calls Electron APIs directly.

---

## Related docs

- [TASK_MANAGER.md](./TASK_MANAGER.md) — TaskManager queue, concurrency, and streaming
- [TASK_MANAGER_AI_HANDLERS.md](./TASK_MANAGER_AI_HANDLERS.md) — AI task handler patterns
- [WORKSPACE_STATE_MANAGEMENT_PHASE1.md](./WORKSPACE_STATE_MANAGEMENT_PHASE1.md) — Workspace state design
