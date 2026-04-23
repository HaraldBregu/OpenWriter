# Example Walkthrough — `DemoOpenWriterExtension`

The repo ships one bundled reference extension:
`extensions/DemoOpenWriterExtension/`. It is the canonical example for
the current SDK and runtime.

## What It Demonstrates

- Four commands: refresh dashboard, log snapshot, append note, clear
  state
- One doc panel that returns `OpenWriter.ui.htmlPage('dist/panel/index.html', ...)`
- A static HTML dashboard loaded in a sandboxed iframe
- Branded SVG assets reused by the panel switcher and the dashboard UI
- Workspace, document, and task event subscriptions
- Per-extension storage holding observed counts and the last seen host
  state

## File Layout

```text
extensions/DemoOpenWriterExtension/
├── openwriter.extension.json
├── src/index.ts
├── dist/index.js
├── dist/panel/index.html
├── dist/panel/app.js
├── dist/panel/styles.css
└── assets/
    ├── demo-openwriter-extension-mark.svg
    └── demo-openwriter-extension-badge.svg
```

`src/index.ts` is the SDK-authored source. `dist/` is the runtime output
the app loads today.

## Manifest Highlights

`openwriter.extension.json` declares:

- `id: "demo.openwriter.extension"`
- `name: "DemoOpenWriterExtension"`
- one panel contribution, `demo-openwriter-extension-home`
- a custom SVG icon asset
- four command contributions
- startup, document-opened, and on-command activation events

## Runtime Flow

The extension's `activate(context)` does four things:

1. Subscribes to workspace, document, and task events and persists
   counters in `context.storage`.
2. Registers four commands that either refresh state, log a snapshot,
   append a branded note, or clear stored state.
3. Builds a panel view model from host data plus stored counters.
4. Returns `OpenWriter.ui.htmlPage('dist/panel/index.html', { data })`
   from the doc panel renderer.

That last step is the important change: the demo no longer stops at the
block renderer. It proves that OpenWriter can mount a built HTML entry
and keep it synchronized with live extension data.

## HTML Dashboard Contract

`dist/panel/index.html` is ordinary browser output. It listens for
messages from OpenWriter:

- `openwriter.docPanel.init` carries the latest panel data
- `openwriter.docPanel.commandResult` resolves a command request

The page sends messages back:

- `openwriter.docPanel.ready` asks OpenWriter to send the current init
  payload
- `openwriter.docPanel.command` requests that the host run an extension
  command

That contract is framework-agnostic. A React, Vue, Svelte, or Solid app
can implement the same message handling and emit the same `index.html`
entry.

## Why This Example Matters

`DemoOpenWriterExtension` is the reference for three extension authoring
paths:

- lightweight panels using SDK block helpers
- richer panels using `htmlPage(...)`
- branded extension packages that ship their own assets

If you need a starting point for an extension with custom UI, copy this
folder, replace the ids and branding, then swap the dashboard bundle for
your own framework build.
