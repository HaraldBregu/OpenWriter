# Overview

## What An Extension Is

An **extension** is a folder containing:

- a manifest (`openwriter.extension.json`)
- a compiled entry module (JavaScript, defaults to `dist/index.js`)
- optional assets (icons, fonts, images)

At runtime OpenWriter:

1. Discovers installed extensions (bundled + user-installed).
2. Parses and validates each manifest.
3. Starts a **utility process** per enabled extension.
4. Bootstraps the extension's module inside that process.
5. Activates it on the configured activation events.

The user sees the extension as a side-panel entry, a command in the
command surface, or a background observer that reacts to app events.

## Runtime Model

```text
┌────────────────────── Main process (Electron) ───────────────────────┐
│                                                                       │
│   ExtensionManager ─► discovers & enables                            │
│   ExtensionHostLauncher ─► spawns utility process                    │
│   ExtensionApiGateway ─► guards every host call                      │
│           ▲  ▲                                                        │
│           │  │ host.call / host.result (IPC)                          │
│           │  │                                                        │
└───────────┼──┼────────────────────────────────────────────────────────┘
            │  │
┌───────────┼──┼────────────── Utility process ─────────────────────────┐
│           ▼  ▼                                                        │
│   ExtensionHostRuntime                                               │
│      ├─ loads dist/index.js (ESM dynamic import)                     │
│      ├─ calls activate(ctx)                                          │
│      ├─ dispatches events, commands, doc-panel render                │
│      └─ forwards host.* calls back to the gateway                    │
└───────────────────────────────────────────────────────────────────────┘
```

Each extension is one utility process. A crashed extension cannot take
down the main app or the renderer; the manager records the crash and
marks the runtime `crashed`.

## Why A Separate Process?

- **Isolation.** Extension code runs alongside the app but not in it.
  The renderer's React tree is never exposed.
- **Safety.** Every privileged action (reading a document, modifying
  content, submitting a task) has to go through the gateway, which
  enforces permissions from the manifest.
- **Stability.** A busy loop or memory leak in an extension affects
  only that process.

## Capability Surface

A manifest declares `capabilities` — coarse-grained features the
extension wants. The surface is:

| Capability | What it unlocks |
| --- | --- |
| `commands` | Register commands callable from UI or other code |
| `host-data` | Read app / workspace / document data |
| `host-actions` | Modify documents, submit tasks |
| `tasks` | Submit agent tasks |
| `events` | Subscribe to workspace / document / task events |
| `doc-panels` | Render UI in the document side panel |
| `doc-pages` | (Reserved) contribute full-page views |

Capabilities are **advertised**; actual enforcement is done per-call by
**permissions** (see [PERMISSIONS_AND_SECURITY.md](./PERMISSIONS_AND_SECURITY.md)).

## What Extensions Can Read

Through `ctx.host.*`:

- **App info** — name, version, platform
- **Workspace** — current path, project name
- **Documents** —
  - list / fetch by id
  - live **context snapshot**: markdown, selection (from, to, text),
    editor state (focused, editable, empty, active node, active marks)
- **Tasks** — incoming lifecycle events

## What Extensions Can Write

- Update a document's title and/or content
  (`documents.update(documentId, { title?, content? })`)
- Submit tasks to the executor (agent runs, transcription, OCR, etc.)
- Persist key-value storage inside the extension's own namespace

## What Extensions Cannot Do (Today)

- Directly access the renderer's React state, Redux store, or contexts
- Inject arbitrary HTML into the core React tree — HTML views must be
  loaded from extension-owned files inside a sandboxed iframe
- Bypass the gateway to reach `fs`, `electron`, or Node's main
  workspace APIs
- Modify provider API keys stored by the app

This is deliberate. OpenWriter supports two panel modes: a small
declarative block language for lightweight UI, and a sandboxed HTML
entry for richer interfaces. Extensions still do not mount React
components directly into the app shell, and new privileged capabilities
stay behind the gateway.

## How The User Interacts With An Extension

1. **Install** — drop the extension folder into the app's
   extensions directory, or enable a bundled one from Settings →
   Extensions.
2. **Enable** — toggle in Settings → Extensions. Enable/disable is
   persisted.
3. **Activate** — happens automatically on the activation events
   declared in the manifest (app startup, opening a workspace or
   document, or invoking a specific command).
4. **Use** — run commands, open the extension's doc panel, or let it
   run in the background as an observer.
5. **Customize** — supply tokens / data / config by running a
   command the extension provides, or by writing directly to its
   storage. See [CUSTOMIZATION.md](./CUSTOMIZATION.md).

## Example: The Bundled Showcase

`extensions/DemoOpenWriterExtension/` is the canonical reference.
It demonstrates:

- Four commands (refresh dashboard, log snapshot, append note, clear state)
- One doc panel (`demo-openwriter-extension-home`) returning
  `dist/panel/index.html` with live init data
- Workspace/document/task event subscriptions
- Per-extension storage holding observed counts and the last seen
  state
- A safe document update appending an inspection note
- Branded SVG assets used by both the panel switcher and the HTML
  dashboard

Walkthrough: [EXAMPLE.md](./EXAMPLE.md).

## Key Constraints

| Constraint | Reason |
| --- | --- |
| One extension = one utility process | Fault isolation |
| All host calls go through the gateway | Permission enforcement |
| HTML UI runs in a sandboxed iframe, not the app tree | Safe composition, no XSS |
| Document writes go through the workspace service | File-mutation queue, atomic writes |
| Storage is key/value per extension | Simple, namespaced, no contention |
