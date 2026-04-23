# OpenWriter SDK

TypeScript SDK for building OpenWriter extensions from any Node.js
project.

## Install

```bash
npm install @openwriter/extension-sdk
```

OpenWriter extensions are ESM modules that export `activate(context)`
and optionally `deactivate()`. Each extension folder contains:

- `openwriter.extension.json` for manifest metadata
- a compiled entry module such as `dist/index.js`
- optional assets such as icons, images, and built HTML panel files

## Quick Start

Create a folder like this:

```text
my-extension/
├── openwriter.extension.json
├── package.json
├── tsconfig.json
└── src/
    └── index.ts
```

### `openwriter.extension.json`

```json
{
  "id": "my-extension",
  "name": "My Extension",
  "version": "0.1.0",
  "apiVersion": "1",
  "main": "dist/index.js",
  "description": "Example extension built with the OpenWriter SDK.",
  "author": "Your Name",
  "defaultEnabled": true,
  "capabilities": ["commands", "host-data", "host-actions", "doc-panels"],
  "permissions": ["workspace.read", "document.read", "document.write"],
  "activationEvents": ["onCommand:my-extension.append-note"],
  "contributes": {
    "commands": [
      {
        "id": "my-extension.append-note",
        "title": "My Extension: Append note",
        "description": "Append a marker to the active document.",
        "when": "document"
      }
    ],
    "docPanels": [
      {
        "id": "dashboard",
        "title": "My Extension",
        "description": "Example panel from the OpenWriter SDK.",
        "when": "document",
        "order": 20
      }
    ]
  }
}
```

### `package.json`

```json
{
  "name": "my-extension",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json"
  },
  "dependencies": {
    "@openwriter/extension-sdk": "^0.1.0"
  },
  "devDependencies": {
    "typescript": "^5.8.3"
  }
}
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

### `src/index.ts`

```ts
import * as OpenWriter from '@openwriter/extension-sdk';

export async function activate(context: OpenWriter.ExtensionContext) {
	context.subscriptions.push(
		context.commands.registerCommand('my-extension.append-note', async () => {
			const document = await context.workspace.getActiveDocument();
			if (!document) {
				throw new Error('No active document.');
			}

			await context.workspace.updateDocument(document.id, {
				content: `${document.content}\n\nCreated by My Extension.`,
			});

			context.log.info('Appended note', { documentId: document.id });
			return { ok: true };
		})
	);

	context.panels.registerDocPanel({
		id: 'dashboard',
		async render() {
			const document = await context.workspace.getActiveDocument();

			return OpenWriter.ui.docPanel([
				OpenWriter.ui.notice('This panel was rendered by the OpenWriter SDK.', {
					title: 'My Extension',
					tone: 'info',
				}),
				OpenWriter.ui.text(
					document
						? `Active document: ${document.title || 'Untitled'}`
						: 'No active document.'
				),
			]);
		},
	});
}

export function deactivate() {
	// optional cleanup
}

export default OpenWriter.defineExtension({ activate, deactivate });
```

## Build

```bash
npm run build
```

That should emit `dist/index.js`, which must match the manifest's
`main` field.

## HTML Panel Example

If you want richer UI, return an HTML entry file instead of block-based
panel content. Any framework can be used as long as it builds a static
`.html` file inside the extension folder.

```ts
context.panels.registerDocPanel({
	id: 'dashboard',
	async render(panelContext) {
		return OpenWriter.ui.htmlPage('dist/panel/index.html', {
			title: 'My Extension Dashboard',
			data: {
				documentId: panelContext.documentId,
				reason: panelContext.reason,
			},
		});
	},
});
```

OpenWriter loads that HTML file in a sandboxed iframe and posts init
data to the page. The page can send command requests back through the
doc-panel message bridge.

## What The SDK Exposes

- `ExtensionContext`, `Disposable`, and shared manifest/runtime types
- `context.commands.registerCommand(...)`
- `context.workspace.getActiveDocument()`, `getDocument()`,
  `updateDocument()`
- `context.panels.registerDocPanel(...)`
- `context.preferences.get<T>()`
- `context.storage`
- `context.events`
- `OpenWriter.ui.docPanel(...)` for block-based panels
- `OpenWriter.ui.htmlPage(...)` for HTML-backed panels

## Next Step

Copy the built extension folder into OpenWriter's extensions directory
or install it through the app's Extensions settings page, then reload
the extension.
