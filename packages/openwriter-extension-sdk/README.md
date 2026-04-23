# OpenWriter SDK

TypeScript SDK for building OpenWriter extensions from any Node.js
project.

```bash
npm install @openwriter/extension-sdk
```

OpenWriter extensions are ESM modules that export `activate(context)` and
optionally `deactivate()`, similar to VS Code extensions. The extension is
described by an `openwriter.extension.json` manifest and loaded by OpenWriter
inside an isolated utility process.

```ts
import * as OpenWriter from '@openwriter/extension-sdk';

export async function activate(context: OpenWriter.ExtensionContext) {
	context.subscriptions.push(
		context.commands.registerCommand('example.append-note', async () => {
			const document = await context.workspace.getActiveDocument();
			if (!document) return;

			await context.workspace.updateDocument(document.id, {
				content: `${document.content}\n\nHello from OpenWriter.`,
			});
		})
	);
}

export function deactivate() {
	// optional cleanup
}

export default OpenWriter.defineExtension({ activate, deactivate });
```

The SDK exposes:

- `ExtensionContext`, `Disposable`, and all manifest/runtime datatypes.
- `context.commands.registerCommand(...)`.
- `context.workspace.getActiveDocument()`, `getDocument()`, `updateDocument()`.
- `context.panels.registerDocPanel(...)` for block or HTML side panels.
- `context.preferences.get<T>()` for manifest-backed user configuration.
- `context.storage` for per-extension persistent data.
- `OpenWriter.ui.docPanel(...)` for block-based panels.
- `OpenWriter.ui.htmlPage(...)` for HTML entry files built with any
  framework.

HTML panels point at a built `.html` file inside the extension folder.
OpenWriter loads that file in a sandboxed iframe, posts init data into
the page, and lets the page invoke extension commands over a small
message bridge. That means React, Vue, Svelte, Solid, or plain browser
code can all target the same runtime contract as long as they emit a
static HTML entry.

```ts
ctx.panels.registerDocPanel({
	id: 'dashboard',
	async render(context) {
		return OpenWriter.ui.htmlPage('dist/panel/index.html', {
			title: 'My Extension Dashboard',
			data: {
				documentId: context.documentId,
				reason: context.reason,
			},
		});
	},
});
```

Build the package with:

```bash
npm run build
```
