# Host API — `ctx.host.*`

The host API is the extension's gateway to the rest of the app. Every
call is mediated by `ExtensionApiGateway` in the main process; every
call requires a permission declared in the manifest.

Source of truth:

- SDK shape: `packages/openwriter-extension-sdk/src/index.ts`
- Wire contracts: `packages/openwriter-extension-types/src/index.ts`
  (see `ExtensionHostRequestMap`)
- Gateway: `src/main/extensions/extension-api-gateway.ts`

## Surface

```ts
ctx.host = {
  app:       { getInfo() },
  workspace: { getCurrent() },
  documents: { getActive(), getById(id), getContext(id?), update(id, patch) },
  tasks:     { submit(submission) },
};
```

Permission enforcement for each method is listed at the bottom of this
doc in one canonical table.

## `app.getInfo()`

Returns basic app identity.

```ts
getInfo(): Promise<ExtensionAppInfo>

interface ExtensionAppInfo {
  appName: string;
  version: string;
  platform: string; // e.g. "darwin", "win32", "linux"
}
```

## `workspace.getCurrent()`

Returns a snapshot of the current workspace.

```ts
interface ExtensionWorkspaceSnapshot {
	currentPath: string | null;
	projectName: string | null;
	windowId?: number;
	documentId?: string | null; // active doc if any
}
```

## `documents.getActive()`

Returns the currently open document in the calling window. `null` if
no document is active.

```ts
interface ExtensionDocumentSnapshot {
	id: string;
	title: string;
	content: string; // full markdown body
	path: string; // absolute folder path
	windowId?: number;
}
```

## `documents.getById(documentId)`

Fetch a specific document by id. Throws if the document does not exist
in the current workspace.

## `documents.getContext(documentId?)`

Returns a **live** context snapshot — what the extension panel needs to
render:

```ts
interface ExtensionDocumentContextSnapshot {
	documentId: string;
	markdown: string;
	selection: { from: number; to: number; text: string } | null;
	editorState: {
		isFocused: boolean;
		isEditable: boolean;
		isEmpty: boolean;
		activeNode: string | null;
		activeMarks: string[];
	};
}
```

If `documentId` is omitted, the gateway resolves it from the extension
execution context (which window, which active doc).

The renderer re-publishes this snapshot whenever the user moves the
selection, types, or changes active marks, so the call is cheap and up
to date.

## `documents.update(documentId, patch)`

Safely update a document's title or content (or both).

```ts
type ExtensionDocumentUpdate = {
	title?: string;
	content?: string;
};
```

Behavior:

- The write goes through the workspace service — same file-mutation
  queue used by the editor and the agent loop. No interleaving.
- `updatedAt` is bumped automatically.
- Returns the refreshed `ExtensionDocumentSnapshot`.

### Append Pattern

```ts
const doc = await ctx.host.documents.getActive();
if (!doc) return;
await ctx.host.documents.update(doc.id, {
	content: `${doc.content}\n\n## New section\n\nbody`,
});
```

### Replace Selection Pattern

```ts
const doc = await ctx.host.documents.getActive();
const snap = await ctx.host.documents.getContext(doc?.id);
if (!doc || !snap?.selection) return;
const { from, to } = snap.selection;
const next = doc.content.slice(0, from) + 'replacement' + doc.content.slice(to);
await ctx.host.documents.update(doc.id, { content: next });
```

> `selection.from` / `selection.to` are character offsets into the
> rendered markdown. For precise ProseMirror positions, register a
> command that the renderer translates via Tiptap instead.

## `tasks.submit(submission)`

Submit a task to the app's `TaskExecutor` — same machinery the editor
uses for agent runs, transcription, OCR, and indexing.

```ts
interface ExtensionTaskSubmission {
	type: string; // e.g. "agent" or "transcription"
	input: unknown;
	options?: { priority?: 'low' | 'normal' | 'high'; timeoutMs?: number };
	metadata?: Record<string, unknown>;
}

interface ExtensionTaskSubmissionResult {
	taskId: string;
}
```

### Submitting A Writer Agent Run

```ts
const result = await ctx.host.tasks.submit({
	type: 'agent',
	input: {
		agentType: 'writer',
		input: { prompt: 'Summarize the current document in three bullets.' },
	},
	metadata: { source: 'my-extension' },
});

console.log('submitted task', result.taskId);
```

The agent task handler enriches the input with provider, API key, and
model name from the user's Settings for the selected agent. The
extension does not need to know API keys to run a task — the user's
configuration is reused.

### Observing Progress

Submitting returns only the `taskId`. To watch the task, subscribe to
task events:

```ts
ctx.events.onTaskEvent((event) => {
	if (event.taskId !== result.taskId) return;
	if (event.state === 'completed') {
		/* ... */
	}
});
```

See [EVENTS_AND_STORAGE.md](./EVENTS_AND_STORAGE.md).

## Permission Mapping

Host method → required permission:

```
app.getInfo             →  app.read
workspace.getCurrent    →  workspace.read
documents.getActive     →  document.read
documents.getById       →  document.read
documents.getContext    →  document.read
documents.update        →  document.write
tasks.submit            →  task.submit
storage.get             →  (none — per-extension namespace)
storage.set             →  (none — per-extension namespace)
storage.delete          →  (none — per-extension namespace)
preferences.get         →  (none — own manifest preferences only)
```

Missing a required permission throws synchronously, before any side
effect runs:

```
Error: Extension "<id>" does not have permission "<perm>".
```

## Error Semantics

- All methods return Promises. Rejections carry `Error` instances with
  readable messages.
- Permission failures throw before any side effect runs.
- Document updates that fail on disk bubble the underlying filesystem
  error; in-memory document state is not changed.

## Context Binding

Every host call carries an `ExtensionExecutionContext` internally so
the gateway can resolve the right window and active document. For most
authors this is automatic — the context is propagated via
`AsyncLocalStorage` inside the host runtime so you don't pass
`windowId` by hand.
