# OpenWriter Extensions — Documentation

Everything you need to build, run, and distribute **extensions** for
OpenWriter.

Extensions are pluggable units of code that load at runtime and augment
the app with extra commands, side-panel UI, automations, and custom
integrations. They run in an isolated utility process and talk to the app
through a typed host API.

## Who This Is For

- **Extension authors** — people writing new extensions.
- **Power users** — people installing or customizing third-party
  extensions.
- **OpenWriter developers** — working on the extension runtime itself.

## What Extensions Can Do

- Read **app**, **workspace**, and **document** data — including live
  markdown, selection, editor state
- **Modify** the active document (title and content)
- **Contribute UI** into the document side panel using a declarative
  block language (text, markdown, key/value, notices, button rows)
- **Register commands** that appear in the command surface and can be
  invoked from UI buttons, keyboard shortcuts, or other code
- Subscribe to **workspace**, **document**, and **task** events in
  real time
- **Submit AI tasks** (agent runs, transcription, OCR …) through the
  same task system the built-in UI uses
- Persist their own state via **per-extension storage**
- Be **customized after install** — users pass tokens, data, and
  configuration via storage + commands

See [OVERVIEW.md](./OVERVIEW.md) for a guided tour.

## Document Index

| Doc                                                          | Topic                                                           |
| ------------------------------------------------------------ | --------------------------------------------------------------- |
| [OVERVIEW.md](./OVERVIEW.md)                                 | What extensions are, runtime model, capability summary          |
| [MANIFEST.md](./MANIFEST.md)                                 | `openwriter.extension.json` — fields, capabilities, permissions |
| [LIFECYCLE.md](./LIFECYCLE.md)                               | Activation events, bootstrap → activate → deactivate            |
| [HOST_API.md](./HOST_API.md)                                 | `ctx.host.*` — app, workspace, documents, tasks                 |
| [CONTRIBUTIONS.md](./CONTRIBUTIONS.md)                       | Commands and document side-panel UI                             |
| [EVENTS_AND_STORAGE.md](./EVENTS_AND_STORAGE.md)             | Workspace/document/task events + per-extension storage          |
| [CUSTOMIZATION.md](./CUSTOMIZATION.md)                       | Tokens, data, configuration — how users tailor an extension     |
| [PERMISSIONS_AND_SECURITY.md](./PERMISSIONS_AND_SECURITY.md) | Permissions, sandbox, gateway, threat model                     |
| [BUILDING.md](./BUILDING.md)                                 | Authoring walkthrough: scaffold, code, build, install           |
| [EXAMPLE.md](./EXAMPLE.md)                                   | Tour of the bundled `example-host-data-showcase`                |

## Source Map

Extension runtime and SDK live in two places in the monorepo:

| Folder                                   | Purpose                                                    |
| ---------------------------------------- | ---------------------------------------------------------- |
| `packages/openwriter-extension-types`    | Shared types (manifest, host API, events)                  |
| `packages/openwriter-extension-manifest` | Manifest parser/validator                                  |
| `packages/openwriter-extension-sdk`      | SDK authors import (`defineExtension`, `ExtensionContext`) |
| `packages/openwriter-extension-host`     | The in-process runtime inside the utility process          |
| `packages/create-openwriter-extension`   | Scaffolder CLI (`yarn create:extension`)                   |
| `src/main/extensions/`                   | Main-process side: manager, gateway, host launcher, IPC    |
| `extensions/example-host-data-showcase/` | Bundled reference extension                                |

## Quick Start

```bash
npm create @openwriter/extension my-extension
cd my-extension
npm install
npm run build
# drop the folder into the app's extensions directory (see BUILDING.md)
```

Minimal extension (`src/index.ts`):

```ts
import * as openwriter from '@openwriter/extension-sdk';

export async function activate(context: openwriter.ExtensionContext) {
	context.subscriptions.push(
		context.commands.registerCommand('my-extension.say-hi', async () => {
			const doc = await context.workspace.getActiveDocument();
			if (!doc) return;
			await context.workspace.updateDocument(doc.id, {
				content: `${doc.content}\n\nHello from my-extension!`,
			});
		})
	);
}

export default openwriter.defineExtension({ activate });
```

## Stability

The extension API is at `apiVersion: "1"`. Breaking changes bump the
version; manifests declaring the wrong `apiVersion` are marked invalid
and will not load.
