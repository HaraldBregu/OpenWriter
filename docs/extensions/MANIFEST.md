# Manifest — `openwriter.extension.json`

Every extension folder has a manifest at its root. The manifest is the
only static description the app reads to discover, validate, and
describe an extension.

Parser: `packages/openwriter-extension-manifest/src/index.ts`.

## Minimal Shape

```json
{
	"id": "example.hello",
	"name": "Hello",
	"version": "0.1.0",
	"apiVersion": "1",
	"main": "dist/index.js"
}
```

That alone loads, but declares no capabilities, permissions, or
contributions. A working extension typically looks like:

```json
{
	"id": "demo.openwriter.extension",
	"name": "DemoOpenWriterExtension",
	"version": "0.2.0",
	"apiVersion": "1",
	"main": "dist/index.js",
	"description": "Demonstrates the OpenWriter SDK, branded assets, and an HTML dashboard panel.",
	"author": "OpenWriter",
	"defaultEnabled": true,
	"capabilities": ["commands", "host-data", "host-actions", "events", "doc-panels"],
	"permissions": ["app.read", "workspace.read", "document.read", "document.write", "task.observe"],
	"activationEvents": [
		"onStartup",
		"onDocumentOpened",
		"onCommand:demo.openwriter.extension.refresh-dashboard"
	],
	"contributes": {
		"docPanels": [
			{
				"id": "demo-openwriter-extension-home",
				"title": "OpenWriter Demo",
				"description": "Renders a branded HTML dashboard backed by extension data.",
				"when": "document",
				"icon": { "type": "asset", "path": "assets/demo-openwriter-extension-mark.svg" },
				"order": 20
			}
		],
		"commands": [
			{
				"id": "demo.openwriter.extension.refresh-dashboard",
				"title": "Refresh dashboard",
				"description": "Read host state and persist the latest dashboard snapshot.",
				"when": "document"
			}
		],
		"preferences": [
			{
				"id": "api-token",
				"title": "API Token",
				"description": "Token used by the extension integration.",
				"type": "password",
				"required": true
			}
		]
	}
}
```

## Fields

### Identity

| Field         | Required | Notes                                                                         |
| ------------- | :------: | ----------------------------------------------------------------------------- |
| `id`          |   yes    | Globally unique. Pattern: `^[a-z0-9]+(?:[._-][a-z0-9]+)*$`                    |
| `name`        |   yes    | Human-readable label shown in Settings                                        |
| `version`     |   yes    | SemVer: `MAJOR.MINOR.PATCH[-prerelease]`                                      |
| `apiVersion`  |   yes    | Must equal the runtime's `OPENWRITER_EXTENSION_API_VERSION` (currently `"1"`) |
| `main`        |   yes    | Relative path to the compiled ESM entry module (e.g. `dist/index.js`)         |
| `description` |    no    | Free-form                                                                     |
| `author`      |    no    | Free-form                                                                     |

### Activation

| Field              | Default | Notes                                                                                                       |
| ------------------ | :-----: | ----------------------------------------------------------------------------------------------------------- |
| `defaultEnabled`   | `false` | When `true`, first-time users get the extension enabled by default. Enable/disable state is then remembered |
| `activationEvents` |  `[]`   | See table below                                                                                             |

### Capabilities

`capabilities` is an array of coarse tags. Valid values:

- `commands`
- `host-data`
- `host-actions`
- `tasks`
- `events`
- `doc-panels`
- `doc-pages`

Capabilities are **not** enforced at call time — they document intent.
Enforcement is by `permissions`.

### Permissions

`permissions` is what actually gates host calls. Valid values:

- `app.read`, `app.write`
- `workspace.read`, `workspace.write`
- `document.read`, `document.write`
- `task.submit`, `task.observe`

See [PERMISSIONS_AND_SECURITY.md](./PERMISSIONS_AND_SECURITY.md) for the
full mapping of host methods to required permissions.

### Contributions — Commands

Each entry of `contributes.commands`:

| Field         | Required | Notes                                                               |
| ------------- | :------: | ------------------------------------------------------------------- |
| `id`          |   yes    | Fully qualified (recommend `<extensionId>.<verb>`)                  |
| `title`       |   yes    | Shown to the user                                                   |
| `description` |    no    | Shown alongside title                                               |
| `when`        |    no    | `"always"` (default) or `"document"` (only when a document is open) |

### Contributions — Doc Panels

Each entry of `contributes.docPanels`:

| Field         | Required | Notes                                                                  |
| ------------- | :------: | ---------------------------------------------------------------------- |
| `id`          |   yes    | Unique within the extension                                            |
| `title`       |   yes    | Shown as the panel title                                               |
| `description` |    no    | Subtitle                                                               |
| `when`        |    no    | Currently forced to `"document"`                                       |
| `icon`        |    no    | Either a string (name) or `{ type: "asset", path: "assets/icon.svg" }` |
| `order`       |    no    | Number — lower renders earlier                                         |

The manifest only declares the slot and icon. At runtime the panel's
`render()` function can return block content or `OpenWriter.ui.htmlPage(...)`
to mount a built HTML entry file.

### Contributions — Doc Pages

`contributes.docPages` is reserved; full-page extension views are not
yet rendered by the renderer.

### Contributions — Preferences

`contributes.preferences` declares user-editable configuration shown in
Settings → Extensions. Extensions read resolved values with
`ctx.preferences.get<T>()`.

| Field         |   Required   | Notes                                                                   |
| ------------- | :----------: | ----------------------------------------------------------------------- |
| `id`          |     yes      | Unique within the extension                                             |
| `title`       |     yes      | Human-readable label                                                    |
| `description` |      no      | Helper text shown below the label                                       |
| `type`        |     yes      | `textfield`, `password`, `checkbox`, `dropdown`, `file`, or `directory` |
| `required`    |      no      | Signals that the extension needs a value to work correctly              |
| `default`     |      no      | String for most fields, boolean for `checkbox`                          |
| `placeholder` |      no      | Input placeholder for text-like fields                                  |
| `options`     | for dropdown | Array of `{ "label": string, "value": string }`                         |

Use `password` for API tokens or secrets. Values are stored in the
app's per-user settings, not in the extension source folder.

### Activation Events

| Event                   | Fires when                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| `onStartup`             | App finishes bootstrap                                                                   |
| `onWorkspaceOpened`     | The user opens a workspace                                                               |
| `onDocumentOpened`      | A document page mounts                                                                   |
| `onCommand:<commandId>` | A specific command is invoked (lazy activation — the extension isn't started until then) |

An extension activates the first time any of its events fires and stays
active until the app quits (or the extension is disabled).

## Validation

`parseExtensionManifest(rawJson, manifestPath)` returns
`{ manifest, errors }`. Errors are collected; the extension still
appears in Settings but is flagged `invalid` and cannot be activated.

Common errors:

- Missing or empty `id` / `name` / `version` / `main`
- `id` doesn't match the regex
- `version` doesn't match SemVer
- `apiVersion` mismatch
- Unknown capability or permission entry
- Command or doc-panel missing required fields
- Dropdown preference without options, invalid preference defaults, or
  duplicate preference ids

## Icon Resolution

For `icon: { type: "asset", path: "assets/foo.svg" }`, the manager
resolves the file under the extension's root and serves it back to the
renderer as an `iconAssetUri`. This is how the side-panel entry gets a
custom icon without the renderer reading the filesystem directly.

## Where Manifests Live

Two discovery roots:

- **Bundled** — `extensions/` in the repo (ships with the app)
- **User** — `<userData>/extensions/` (user-installed)

Both roots are scanned on app start. Bundled and user extensions share
the same manifest schema; the only difference is the `source` field
surfaced to the renderer (`"bundled"` vs `"user"`).
