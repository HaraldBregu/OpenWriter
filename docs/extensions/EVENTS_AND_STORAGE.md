# Events And Storage

Two cross-cutting features every non-trivial extension uses:

- **Events** — push-based streams from the app (workspace changes,
  document changes, task lifecycle).
- **Storage** — a small per-extension key/value store persisted
  across restarts.

## Events

### Surface

```ts
ctx.events = {
  onWorkspaceChanged(listener): () => void;
  onDocumentChanged(listener):  () => void;
  onTaskEvent(listener):        () => void;
};
```

Each subscribe returns an unsubscribe function. The runtime also clears
all listeners on deactivate.

### Workspace Changed

```ts
interface ExtensionWorkspaceChangedEvent {
  currentPath: string | null;
  previousPath: string | null;
  windowId?: number;
}
```

Fires whenever the user switches or clears the current workspace, or the
app auto-clears a workspace whose folder was deleted.

Example:

```ts
ctx.events.onWorkspaceChanged((event) => {
  ctx.log.info('workspace changed', event);
});
```

### Document Changed

```ts
// Listener signature
(document: ExtensionDocumentSnapshot) => void
```

Fires when the active document's content or config on disk changes —
either because the user typed (debounced) or because an external tool
wrote the file. Each event carries a fresh `ExtensionDocumentSnapshot`:

```ts
interface ExtensionDocumentSnapshot {
  id: string;
  title: string;
  content: string;
  path: string;
  windowId?: number;
}
```

### Task Events

```ts
interface ExtensionTaskEvent {
  taskId: string;
  taskType: string;                      // e.g. "agent", "transcription"
  state: 'submitted' | 'started'
       | 'completed' | 'failed' | 'cancelled';
  windowId?: number;
  result?: unknown;
  error?: string;
  durationMs?: number;
}
```

Extensions with `task.observe` permission see **every** task the app
runs — whether the extension submitted it or not. Scope by matching on
`taskId` (when the extension submitted) or `taskType` / `metadata`.

### Subscription Patterns

**Observer-only** (no submission):

```ts
ctx.events.onTaskEvent(async (event) => {
  if (event.taskType !== 'agent' || event.state !== 'completed') return;
  await maybePostProcess(event.result);
});
```

**Tracking a submission**:

```ts
const { taskId } = await ctx.host.tasks.submit({
  type: 'agent',
  input: { agentType: 'writer', input: { prompt } },
});

const stop = ctx.events.onTaskEvent((event) => {
  if (event.taskId !== taskId) return;
  if (event.state === 'completed') {
    handleResult(event.result);
    stop();
  } else if (event.state === 'failed' || event.state === 'cancelled') {
    stop();
  }
});
```

### Delivery Guarantees

- Events are delivered **in order** per event type for a given window.
- If an extension is slow, events back up in the host mailbox — they
  are not dropped. Keep listeners non-blocking.
- Events dispatched after `deactivate()` are silently skipped.

## Storage

### Surface

```ts
ctx.storage = {
  get<T = unknown>(key: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T): Promise<T>;
  delete(key: string): Promise<void>;
};
```

### Semantics

- Each extension has its own namespace — keys never collide across
  extensions.
- Values are JSON-serialized on write. Anything not serializable throws.
- Storage persists across restarts.
- Storage is **per-user**, not per-workspace. If you need per-workspace
  state, include the workspace path in the key (e.g.
  `summary-cache::/Users/me/my-project`).

### Typical Usage

```ts
interface ExtensionState {
  refreshCount: number;
  lastSeenDocumentId: string | null;
}

async function load(ctx: ExtensionContext): Promise<ExtensionState> {
  return (
    (await ctx.storage.get<ExtensionState>('state')) ?? {
      refreshCount: 0,
      lastSeenDocumentId: null,
    }
  );
}

async function bump(ctx: ExtensionContext, documentId: string) {
  const prev = await load(ctx);
  const next: ExtensionState = {
    refreshCount: prev.refreshCount + 1,
    lastSeenDocumentId: documentId,
  };
  await ctx.storage.set('state', next);
  return next;
}
```

### No Transactions

Storage operations are independent. If two listeners mutate the same
key concurrently, the last write wins. Keep mutations funneled through
a single async helper like the `bump` pattern above.

### Use For Configuration

Storage is where extensions keep **user-supplied configuration** —
tokens, feature flags, per-workspace preferences. See
[CUSTOMIZATION.md](./CUSTOMIZATION.md) for patterns.

## Logging

```ts
ctx.log = {
  info(message, data?): void;
  warn(message, data?): void;
  error(message, data?): void;
};
```

Messages are forwarded to the main-process `LoggerService` and tagged
with the extension id. They show up in the app's unified log stream —
not in the user's browser console.

Use this instead of `console.log`: `console.*` inside the utility
process goes nowhere the user can see.
