# @openwriter/extension-sdk

TypeScript SDK for building OpenWriter extensions from any Node.js project.

```bash
npm install @openwriter/extension-sdk
```

OpenWriter extensions are ESM modules that export `activate(context)` and
optionally `deactivate()`, similar to VS Code extensions. The extension is
described by an `openwriter.extension.json` manifest and loaded by OpenWriter
inside an isolated utility process.

```ts
import * as openwriter from '@openwriter/extension-sdk';

export async function activate(context: openwriter.ExtensionContext) {
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

export default openwriter.defineExtension({ activate, deactivate });
```

The SDK exposes:

- `ExtensionContext`, `Disposable`, and all manifest/runtime datatypes.
- `context.commands.registerCommand(...)`.
- `context.workspace.getActiveDocument()`, `getDocument()`, `updateDocument()`.
- `context.window.registerDocPanelProvider(...)` for declarative side panels.
- `context.preferences.get<T>()` for manifest-backed user configuration.
- `context.storage` for per-extension persistent data.
- `openwriter.ui.*` helpers for declarative panel blocks.

Build the package with:

```bash
npm run build
```
