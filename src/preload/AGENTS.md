# Preload Architecture Guide

## Purpose

`src/preload/` is the renderer's only trusted bridge into Electron IPC.

This folder should stay thin and transport-oriented.
It does not own business rules, filesystem workflows, task orchestration, or UI state.
Its job is to expose a safe, typed API surface to the renderer and forward calls and events between `src/main` and `src/renderer`.

If you are debugging or extending anything that appears on `window.app`, `window.workspace`, `window.task`, or `window.win`, start here.

## Conceptual Structure

The screenshot describes the preload layer correctly as one IPC bridge with four public surfaces:

```text
IPC Preload
  Workspace API
  Task API
  Window API
  App API
```

That matches the current code in `src/preload/index.ts`, with one naming detail:

- the "Window API" box in the screenshot is exposed in code as `window.win`
- the other boxes map directly to `window.workspace`, `window.task`, and `window.app`

Think of this folder as the narrow middle layer between:

1. `src/main/ipc` and main-process services on the trusted side
2. renderer React/Redux/page code on the browser side

## Current Folder Structure

```text
src/preload/
  AGENTS.md
  index.ts
  index.d.ts
  typed-ipc.ts
  types.ts
```

## File Responsibilities

### `index.ts`

This is the preload entrypoint and the main structural file in this folder.

It owns:

- constructing the `app`, `win`, `workspace`, and `task` namespace objects
- mapping those methods to typed IPC helpers
- subscribing renderer callbacks to push events with `typedOn(...)`
- exposing the namespaces through `contextBridge.exposeInMainWorld(...)`
- providing the non-isolated fallback for environments where `contextIsolation` is disabled

This file should remain declarative.
It should translate contracts into ergonomic methods, not accumulate validation or business logic.

### `index.d.ts`

This file defines the public preload contract from the renderer's perspective.

It owns:

- `AppApi`
- `WindowApi`
- `WorkspaceApi`
- `TaskApi`
- global `Window` augmentation
- re-exporting shared payload types used by renderer code

This is the type-level source of truth for what the renderer is allowed to call.
If a preload method exists in `index.ts`, it should be represented here with the correct signature.

### `typed-ipc.ts`

This file contains the low-level typed wrappers around `ipcRenderer`.

It owns:

- `typedInvoke`
- `typedInvokeUnwrap`
- `typedInvokeRaw`
- `typedSend`
- `typedOn`

These helpers centralize the translation between channel maps and runtime IPC calls.
If the preload bridge needs a new transport pattern, add it here instead of repeating ad hoc `ipcRenderer` usage in `index.ts`.

### `types.ts`

This file is a small preload-local aggregation layer.

It currently re-exports preload API types so internal preload code can import from one place without reaching back into `index.d.ts`.

Keep this file for preload-only helper types and local type composition.
Do not move cross-process contracts here if they belong in `src/shared`.

## Public Namespace Model

The screenshot's four-box layout is the right mental model for the API surface.

### `window.workspace`

This is the largest namespace and currently covers:

- workspace selection and recent-workspace state
- imported resource/document operations
- indexed directory management
- indexing info reads
- output document persistence
- file watcher subscriptions
- project workspace metadata
- constrained filesystem helpers

This namespace is broad because most renderer features ultimately depend on workspace-scoped data.

### `window.task`

This is the task execution surface.

It covers:

- task submission
- cancellation
- task listing
- queue status
- priority updates
- event subscriptions

This namespace should stay task-oriented and avoid leaking main-process implementation details.

### `window.win`

This is the window control surface represented as "Window API" in the screenshot.

It covers:

- minimize
- maximize
- close
- fullscreen/maximized state reads
- maximize/fullscreen change subscriptions

Keep this namespace focused on top-level Electron window chrome behavior.

### `window.app`

This is the application-level utility surface.

It currently covers:

- theme and language actions
- context menus
- platform reads
- writing context-menu actions
- provider management

Use this namespace for app-scoped capabilities that are not specifically workspace-bound, task-bound, or window-chrome-bound.

## Boundary Rules

### Keep preload thin

Preload should:

- forward calls
- unwrap IPC results when appropriate
- normalize event subscription ergonomics
- expose only approved capabilities

Preload should not:

- implement business logic
- validate domain rules that belong in main-process services
- hold long-lived application state
- duplicate shared contract definitions

### Shared contracts belong in `src/shared`

Channel names and payload types should be defined in `src/shared`, then consumed here.

Typical sources are:

- `src/shared/channels.ts`
- `src/shared/types.ts`
- `src/shared/ipc-result.ts`

If you find yourself inventing preload-only copies of shared IPC payloads, the design is drifting.

### Renderer should consume preload, not Electron

Renderer code should call:

- `window.app`
- `window.workspace`
- `window.task`
- `window.win`

Renderer code should not import `electron`, `ipcRenderer`, or main-process helpers directly.

## How To Add A New Capability

Follow this order:

1. Add or update the shared channel/type contract in `src/shared`.
2. Implement the handler in the relevant `src/main/ipc` module.
3. Add the typed bridge method in `src/preload/index.ts`.
4. Add or update the matching type in `src/preload/index.d.ts`.
5. Consume it from renderer code.
6. Add tests at the layer where the logic changed.

If the change is mostly business behavior, the real implementation belongs in `src/main`, not here.

## Debugging Guidance

Start in `src/preload/` when:

- a `window.*` API is missing at runtime
- a renderer call type-checks incorrectly
- an IPC result is not being unwrapped correctly
- event subscriptions are not firing or not cleaning up
- the renderer and main process disagree on channel signatures

Start outside this folder when:

- the request reaches main but returns the wrong business result
- filesystem behavior is wrong
- task execution semantics are wrong
- UI state handling is wrong after the preload call succeeds

## Practical Constraint

The screenshot is intentionally cleaner than the current `workspace` namespace.
Use it as a structural guide, not a claim that all APIs are equally small.

If preload keeps growing, prefer improving organization inside `index.ts` and refining shared contracts before adding logic-heavy abstractions here.
