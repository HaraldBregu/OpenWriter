# Extensions

OpenWriter is extensible. Third-party code can contribute:

- **Document panels** — custom UI in the right-hand sidebar
- **Commands** — entries in the command palette / menus
- **Agent tools and skills** (advanced)

Extensions run in a separate **utility process** (Node isolate), not the
renderer, so a misbehaving extension cannot hang the UI or touch the
privileged main-process services directly.

## Extension Anatomy

An extension is a folder with:

```text
my-extension/
├── openwriter.extension.json   # manifest
├── dist/                        # compiled JS entrypoint
└── assets/                      # icons, fonts, static assets
```

### Manifest (`openwriter.extension.json`)

Declares:

- `id`
- `name`, `description`, `version`, `author`
- `entry` — the script the extension host executes
- Contributions:
  - `commands` — command palette entries
  - `docPanels` — sidebar panels for the document page

## Packages

Development support for extensions lives under `packages/`:

| Package | What it is |
| --- | --- |
| `openwriter-extension-sdk` | Types + helpers extensions import |
| `openwriter-extension-types` | Shared type definitions |
| `openwriter-extension-manifest` | Manifest schema + validator |
| `openwriter-extension-host` | Runtime that hosts extension code |
| `create-openwriter-extension` | Scaffolder (`yarn create:extension`) |

The example extension at
`extensions/example-host-data-showcase/` demonstrates the full shape.

## How They Load

1. On startup, `ExtensionManager` (`src/main/extensions/`) scans known
   folders for manifests.
2. Each enabled extension is launched in a utility process via
   `ExtensionHostLauncher`.
3. `ExtensionApiGateway` brokers every request the extension makes —
   it is the trusted seam between the sandboxed host and the main
   process.
4. Contributions (commands, doc panels) are registered into registries
   the renderer reads via `window.extensions.*`.

## Document Panels

The right-hand sidebar on the Document page can host:

- `builtin:config` — document info
- `builtin:agentic` — chat
- **Any registered extension panel**

The extension receives a typed context snapshot:

```ts
interface ExtensionDocumentContextSnapshot {
  documentId: string;
  markdown: string;
  selection: { from: number; to: number; text: string } | null;
  editorState: {
    isFocused: boolean;
    isEditable: boolean;
    isEmpty: boolean;
    activeNode: string;
    activeMarks: string[];
  };
}
```

Panels publish rendered HTML/data back through the gateway. They **do
not** share the renderer's React tree — they communicate via typed
messages, which keeps the blast radius small if the extension
misbehaves.

## Commands

Extensions contribute named commands. The user triggers them from the
command palette or from designated menus. The command runs in the
extension host and can ask the gateway to perform actions like:

- Read document content
- Insert text at the selection
- Submit an agent task
- Show a notification

## Installing / Enabling

The **Extensions settings page** lists installed extensions with an
enable/disable toggle. State persists via `StoreService`
(`extensionEnabled: Record<string, boolean>`).

The app comes with the bundled showcase extension pre-registered as a
reference. Disabling it is safe.

## Creating One

```bash
yarn create:extension
```

The scaffolder generates a folder with the manifest, a TypeScript
entry, and a build script. Point OpenWriter at it (via the settings
page) to install.

## Security Boundaries

- The extension host **does not share the renderer process** — it
  cannot reach the DOM or React state directly.
- The gateway validates every request against the extension's declared
  capabilities.
- Filesystem access goes through the same `FileManager` with the
  current workspace whitelisted — an extension cannot target files
  outside the workspace.
- Network access is up to the extension; OpenWriter does not proxy it.

## Limits

- Extensions run with the app's lifecycle — they start when OpenWriter
  launches and stop when it exits.
- No built-in extension marketplace. Users install manually today.
- Hot-reload is not yet wired; reinstalling triggers a restart of the
  extension host.
