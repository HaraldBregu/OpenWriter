# Example Walkthrough — `example-host-data-showcase`

The repo ships one bundled reference extension:
`extensions/example-host-data-showcase/`. It demonstrates every
capability in one place and is the canonical example to copy.

This doc is a guided tour.

## What It Does

Opens a doc panel called "Host data" that shows, live:

- App name, version, platform
- Workspace path, project name
- Active document title and id
- Character and markdown counts
- Selection range and text
- Editor focus / editable / empty
- Active node + active marks
- Extension-local counters (refreshes, writes, observed events)

It also registers four commands:

| Command | Effect |
| --- | --- |
| Refresh snapshot | Re-read host state and persist the snapshot |
| Log snapshot | Write the current state to the extension log |
| Append inspection note | Append a labeled note to the active document |
| Clear extension state | Wipe the extension's storage |

## Manifest Highlights

`extensions/example-host-data-showcase/openwriter.extension.json`:

- `capabilities`: `commands`, `host-data`, `host-actions`, `events`, `doc-panels`
- Permissions cover app, workspace, and document read/write plus
  `task.observe`
- Activates `onStartup`, `onDocumentOpened`, and on each of its four
  commands
- Contributes one panel with an SVG icon asset and four commands

## Code Tour

The entry `dist/index.js` (which is the compiled output) exports a
default `ExtensionModule` whose `activate(ctx)` does four things in
order.

### 1. Subscribe To Events

```js
ctx.events.onWorkspaceChanged(async (event) => {
  await incrementObserved(ctx, 'workspaceChanges', { lastWorkspacePath: event.currentPath });
  ctx.log.info('Observed workspace change', event);
});

ctx.events.onDocumentChanged(async (document) => {
  await incrementObserved(ctx, 'documentChanges', {
    lastDocumentId: document.id,
    lastDocumentTitle: document.title,
  });
});

ctx.events.onTaskEvent(async (event) => {
  await incrementObserved(ctx, 'taskEvents', {
    lastTaskState: `${event.taskType}:${event.state}`,
  });
});
```

Each listener updates a counter in storage — a small demonstration of
combining events + storage to build simple analytics.

### 2. Register Commands

```js
ctx.commands.register({
  id: 'example.host-data-showcase.refresh-snapshot',
  title: 'Host Data Showcase: Refresh snapshot',
  description: 'Read app, workspace, and document state and persist the latest snapshot.',
  async run(payload) {
    const documentId = readDocumentId(payload);
    const result = await refreshSnapshot(ctx, documentId);
    return result.snapshot;
  },
});
```

Each command pulls an optional `documentId` from the payload (doc-panel
buttons supply this), calls a small helper, and persists the result.

### 3. Register The Doc Panel

```js
ctx.panels.registerDocPanel({
  id: 'host-data-summary',
  async render(context) {
    const { snapshot, state } = await refreshSnapshot(ctx, context.documentId);

    return {
      blocks: [
        { type: 'notice', tone: 'info', title: 'Host data showcase', description: '...' },
        { type: 'keyValueList', items: snapshotItems(snapshot, state) },
        { type: 'markdown', markdown: '### Live markdown preview\n\n...' },
        {
          type: 'buttonRow',
          buttons: [
            { id: 'refresh-snapshot', label: 'Refresh snapshot', commandId: 'example.host-data-showcase.refresh-snapshot', payload: { documentId: context.documentId }, variant: 'outline' },
            { id: 'log-snapshot', label: 'Log snapshot', commandId: 'example.host-data-showcase.log-snapshot', payload: { documentId: context.documentId }, variant: 'ghost' },
            { id: 'append-note', label: 'Append note', commandId: 'example.host-data-showcase.append-note', payload: { documentId: context.documentId }, variant: 'secondary' },
            { id: 'clear-state', label: 'Clear state', commandId: 'example.host-data-showcase.clear-state', variant: 'ghost' },
          ],
        },
      ],
    };
  },
});
```

Note how each render re-runs `refreshSnapshot` — the panel always
reflects the latest state. The runtime's render cadence throttles this
for rapid keystroke changes.

### 4. Helpers

Two helpers do the heavy lifting:

```js
async function buildSnapshot(ctx, documentId) {
  const [appInfo, workspace, activeDocument, documentContext] = await Promise.all([
    ctx.host.app.getInfo(),
    ctx.host.workspace.getCurrent(),
    documentId ? ctx.host.documents.getById(documentId) : ctx.host.documents.getActive(),
    ctx.host.documents.getContext(documentId),
  ]);

  return {
    appInfo,
    workspace,
    activeDocument,
    documentContext,
    recordedAt: new Date().toISOString(),
  };
}

async function refreshSnapshot(ctx, explicitDocumentId) {
  const snapshot = await buildSnapshot(ctx, explicitDocumentId);
  const state = await writeState(ctx, {
    refreshCount: (await readState(ctx)).refreshCount + 1,
    lastSnapshotAt: snapshot.recordedAt,
    lastWorkspacePath: snapshot.workspace.currentPath,
    lastDocumentId: snapshot.activeDocument?.id ?? null,
    lastDocumentTitle: snapshot.activeDocument?.title ?? null,
  });
  return { snapshot, state };
}
```

The `readState` / `writeState` pair wraps `ctx.storage.get` and
`ctx.storage.set` with a defaulted shape, so reading never returns
`null` and writing merges into the existing record.

## Lessons From The Example

1. **Group reads with `Promise.all`.** Host calls are cheap; issuing
   them in parallel keeps panel renders snappy.
2. **Default your storage shape.** Always wrap `ctx.storage.get` in a
   helper that returns a known-shaped object. Otherwise every caller
   needs null-checks.
3. **Pipe commands through doc-panel buttons.** The payload mechanism
   lets one panel drive many actions without duplicating UI.
4. **Observe everything, act on little.** The extension subscribes to
   all three event streams but only uses them for observability
   counters. That's the minimum viable pattern — grow from there.
5. **Make state clearable.** The `clear-state` command is important:
   it lets the user recover when things go wrong and helps developers
   test empty-state paths.

## Running It

The extension is `defaultEnabled: true` in bundled form, so:

1. Launch OpenWriter.
2. Open a workspace and a document.
3. Click the "Host data" entry in the document side panel.
4. Type, select text, switch documents — the key/value list updates
   live.
5. Click "Append note" and watch the editor gain an inspection note.

## Copy As A Template

To start your own extension from this example:

1. Copy `extensions/example-host-data-showcase/` to a new folder.
2. Rewrite the manifest `id`, `name`, `description`, and
   `contributes.*` ids.
3. Reimplement the command handlers and panel render with your own
   logic.
4. Replace `assets/host-data.svg` with your own icon.

Then follow [BUILDING.md](./BUILDING.md) to build and install.
