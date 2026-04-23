# Building An Extension

End-to-end author guide: scaffold → code → build → install → debug.

## Prerequisites

- Node 22+
- Yarn 4 (classic works too)
- OpenWriter source checked out, or a built app to drop the extension
  into

## 1. Scaffold

From the repo root:

```bash
yarn create:extension my-extension
```

This creates a folder `my-extension/` with:

```text
my-extension/
├── openwriter.extension.json   # manifest with sensible defaults
├── package.json                 # uses @openwriter/extension-sdk (workspace)
├── tsconfig.json
└── src/
    └── index.ts                 # default command handler
```

The generated manifest declares:

- `id` / `name` / `version` derived from the folder name
- `apiVersion: "1"` and `main: "dist/index.js"`
- `defaultEnabled: true`
- `capabilities: ["commands", "host-data", "host-actions", "doc-panels"]`
- read + write permissions for app, workspace, and document (see
  [MANIFEST.md](./MANIFEST.md) for the canonical list)
- one sample command `my-extension.append-note` tied to an
  `onCommand` activation event
- one sample preference read through `ctx.preferences.get()`

Open `openwriter.extension.json` and adjust to taste.

## 2. Code

`src/index.ts`:

```ts
import { defineExtension } from '@openwriter/extension-sdk';

export default defineExtension({
	async activate(ctx) {
		ctx.commands.register({
			id: 'my-extension.append-note',
			title: 'My Extension: Append note',
			description: 'Append a short marker to the active document.',
			async run() {
				const doc = await ctx.host.documents.getActive();
				if (!doc) throw new Error('No active document.');

				const preferences = await ctx.preferences.get<{ signature?: string }>();
				const signature = preferences.signature?.trim() || 'Created by My Extension.';

				await ctx.host.documents.update(doc.id, {
					content: `${doc.content}\n\n${signature}`,
				});

				ctx.log.info('Appended marker', { documentId: doc.id });
				return { ok: true };
			},
		});
	},

	async deactivate() {
		// optional cleanup
	},
});
```

Types come from the SDK; your editor will surface the `ExtensionContext`
shape.

## 3. Build

```bash
cd my-extension
yarn install
yarn build
```

`yarn build` runs `tsc -p tsconfig.json` and emits `dist/index.js`. The
manifest's `main` must match that path. The SDK CLI also provides:

```bash
create-openwriter-extension validate .
create-openwriter-extension dev .
create-openwriter-extension pack .
create-openwriter-extension install-local .
```

`dev` builds and validates. `install-local` copies the folder into the
OpenWriter user extensions directory; set `OPENWRITER_EXTENSIONS_DIR` or
pass `--to <dir>` to override the destination.

### Build Tips

- Target: ESM. The runtime uses `import(pathToFileURL(...))`, so CJS
  entries don't work.
- Bundling is optional. A single `dist/index.js` is fine; external
  modules inside `node_modules/` are resolved relative to the
  extension folder.
- Keep the output readable. Users should be able to audit
  `dist/index.js` before installing.

## 4. Install

Two ways:

### Local Development

Run `create-openwriter-extension install-local .` or use Settings →
Extensions → Install Local Extension to copy a development folder into
the user extension directory. Then reload the extension from Settings.

### Install For Users

Drop the folder into the user extensions directory:

- macOS: `~/Library/Application Support/OpenWriter/extensions/`
- Windows: `%AppData%/OpenWriter/extensions/`
- Linux: `~/.config/OpenWriter/extensions/`

Restart the app.

## 5. Enable / Disable

Open Settings → Extensions.

- Toggle the switch to enable. The extension starts, `activate()` runs.
- Toggle off to disable. The utility process stops.
- If the extension is flagged `invalid`, click through to see parser
  errors — fix the manifest and reload.

## 6. Iterate

While developing:

- Edit the source.
- `yarn build`.
- In OpenWriter, disable then re-enable the extension. There is no
  hot-reload today — a fresh utility process is the only way to pick
  up a new `dist/index.js`.

## 7. Debug

### Logging

Inside the extension:

```ts
ctx.log.info('hello', { documentId });
ctx.log.warn('unexpected state');
ctx.log.error('failed', { err });
```

Messages flow to the main-process `LoggerService`, tagged with the
extension id. They surface in the unified log stream (visible in
developer tools or via the logs IPC surface).

`console.log` inside the utility process goes to stdout of that
process, which the user cannot see.

### Inspecting Runtime State

Settings → Extensions shows per-extension runtime state:
`status`, `crashCount`, `lastError`, registered commands, registered
doc panels. A crash here is the first place to look when something
silently stops working.

### Common Failure Modes

| Symptom                                           | Cause                                                                                   |
| ------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Extension shows as `invalid`                      | Manifest parser errors — check `id` regex, `version` SemVer, `apiVersion` must be `"1"` |
| "Extension <id> does not export a default module" | `dist/index.js` is CJS, or doesn't `export default` an `ExtensionModule`                |
| Host call rejects with permission error           | Missing entry in manifest permissions                                                   |
| Command doesn't appear                            | Manifest doesn't list it in `contributes.commands`                                      |
| Doc panel doesn't render                          | `render()` threw — check the logs for the extension id                                  |

### Manual Testing Checklist

Before publishing:

- [ ] Fresh install on a clean user-data folder; extension loads.
- [ ] Every command in the manifest runs without throwing.
- [ ] The doc panel renders with an empty document, a long document,
      and a document with selection.
- [ ] Disable → re-enable cleanly (no leftover listeners, no crash).
- [ ] Revoke a permission from the manifest → corresponding host call
      fails closed with the expected error.

## 8. Publish

There is no marketplace yet. Distribution options:

- `create-openwriter-extension pack .` to produce a `.tgz` archive.
- Zip the extension folder, share it, users extract into their
  user extensions directory.
- Host on a git repo; users clone and `yarn build`.
- For org-internal use, bundle into an installer with the workspace's
  bootstrap scripts.

All manifests keep working across minor OpenWriter releases while
`apiVersion: "1"` is supported. A breaking version change bumps
`apiVersion` and updates the runtime to still accept `"1"` for a
deprecation window.
