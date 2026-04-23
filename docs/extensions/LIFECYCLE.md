# Lifecycle

From install to unload — every phase an extension goes through.

## Phases

```text
install
  │
  ▼
discover & parse manifest
  │
  ▼
enabled?  ───► no ─► idle (never started)
  │
  ▼ yes
spawn utility process
  │
  ▼
bootstrap (load module, get ready)
  │
  ▼
activate (ctx.activate called, registrations built)
  │
  ▼
running — handles commands, renders panels, reacts to events
  │
  ▼ (app quit / disable)
deactivate
  │
  ▼
stopped
```

## 1. Install

Extensions arrive two ways:

- **Bundled** — ship under `extensions/` in the repo; auto-discovered.
- **User** — the user drops a folder under `<userData>/extensions/`.

On next launch `ExtensionManager` rescans both roots.

## 2. Discovery And Parsing

For every folder with an `openwriter.extension.json`:

1. The manifest is parsed by `parseExtensionManifest`.
2. If errors are present, the extension is recorded as `invalid` and
   shown in Settings with a reason. It cannot activate.
3. If valid, an `ExtensionInfo` record is built and the runtime state
   is set to `idle`.

## 3. Enable / Disable

The user toggles extensions in Settings → Extensions. State persists
via `StoreService` under `extensionEnabled: Record<string, boolean>`.

- Enabling an `idle` extension triggers a spawn + bootstrap.
- Disabling a `running` extension triggers deactivate + process stop.

## 4. Spawn

`ExtensionHostLauncher` starts a Node utility process running
`packages/openwriter-extension-host` (wired via `hostEntryPath`). The
process is given:

- The manifest
- The extension's absolute root path

The process reports `{ kind: 'ready' }` when the entry module has been
loaded and passed the sanity check (module exports a default object
with an `activate` function).

Runtime status: `starting` → `running` once `ready` arrives.

## 5. Bootstrap

Inside the utility process, `ExtensionHostRuntime.bootstrap`:

1. Computes the absolute path to `manifest.main`.
2. ESM-imports it via `pathToFileURL(...)`.
3. Reads the default export; it must be an `ExtensionModule` —
   `{ activate, deactivate? }`.
4. Stores the module reference and sends `ready` back to the main
   process.

Authoring tip: always export with `defineExtension({...})` to get types
and forward compatibility:

```ts
import { defineExtension } from '@openwriter/extension-sdk';

export default defineExtension({
	async activate(ctx) {
		/* ... */
	},
	async deactivate() {
		/* ... */
	},
});
```

## 6. Activation

`activate(ctx)` is called when any of the declared `activationEvents`
fires for the first time. The context passed in is:

```ts
interface ExtensionContext {
	manifest: ExtensionManifest;
	commands: ExtensionCommandsApi; // register commands
	panels: ExtensionPanelsApi; // register doc panels
	events: ExtensionEventsApi; // subscribe to events
	host: ExtensionHostApi; // read/write via gateway
	storage: ExtensionStorageApi; // extension-local kv store
	preferences: ExtensionPreferencesApi; // user-configured manifest preferences
	log: ExtensionLoggerApi; // structured log → main process
}
```

Inside `activate`, an extension typically:

1. Subscribes to the events it cares about.
2. Registers the commands it declared in `contributes.commands`.
3. Registers the doc panels it declared in `contributes.docPanels`.
4. Optionally reads preferences and persisted storage to restore state.

Activation runs once. Subsequent activation triggers are no-ops.

## 7. Running

While running, the extension responds to messages from the main process:

- `command.execute` — a command handler is invoked (via the command
  surface, a doc-panel button, or programmatically).
- `doc-panel.render` — the user opened the extension's side panel or
  something changed and the panel needs re-rendering.
- `event.dispatch` — a workspace / document / task event is being
  fanned out to subscribers.

Host calls travel the other way:

- `host.call` — the extension asked for app/workspace/document data
  or a task submission; the gateway answers with `host.result`.

## 8. Render Reasons For Panels

When the side panel is on screen, the runtime triggers `render` with
one of:

| `reason`           | When                                                        |
| ------------------ | ----------------------------------------------------------- |
| `open`             | The panel was just shown                                    |
| `refresh`          | An explicit refresh (user or code)                          |
| `document-changed` | Live context changed — selection, markdown, or editor state |

Renders carry an `ExtensionDocPanelRenderContext`:

- `panelId`, `documentId`, optional `windowId`
- `reason`
- `documentContext` — the latest markdown + selection + editor state

The extension returns an `ExtensionDocPanelContent` (blocks). See
[CONTRIBUTIONS.md](./CONTRIBUTIONS.md).

## 9. Deactivate

Triggered on:

- App quit
- User disables the extension
- Extension is uninstalled (folder removed, app restarted)

The runtime calls `deactivate()` if the module exports one, then
clears:

- Command handlers
- Doc-panel renderers
- Workspace / document / task listeners
- Pending host-call promises

Finally, the utility process exits.

## 10. Crash Handling

If the utility process exits unexpectedly:

- Runtime state becomes `crashed`, `crashCount` is incremented.
- `lastError` records the failure reason.
- The manager does **not** auto-restart; the user must disable/re-enable
  from Settings.

This avoids restart loops for a broken extension and gives the user
control.

## Observing Lifecycle From The UI

The Settings → Extensions page subscribes to
`ExtensionChannels.runtimeChanged` and shows:

- `status` — `idle` / `starting` / `running` / `stopped` / `crashed`
  / `invalid`
- `activated` — whether `activate()` has run
- `startedAt` / `crashCount` / `lastError`
- `registeredCommands`, `registeredDocPanels`

## Timing Guarantees

- `activate` runs exactly once per process lifetime.
- Host calls made before `activate` resolves are allowed — `activate`
  can `await` them.
- Render calls arrive only after the relevant doc panel has been
  registered.
- Event dispatches after `deactivate` are silently dropped.
