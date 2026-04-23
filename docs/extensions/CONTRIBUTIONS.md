# Contributions — Commands And Doc Panels

An extension contributes UI surfaces in two ways:

- **Commands** — named, callable actions.
- **Doc panels** — declarative UI rendered into the document's right-hand
  side panel area.

Both are declared statically in the manifest (so the app can show them
even before activation) and registered dynamically in `activate()` with
handlers.

## Commands

### Declaring

Manifest:

```json
{
  "contributes": {
    "commands": [
      {
        "id": "my-extension.summarize",
        "title": "My Extension: Summarize selection",
        "description": "Summarizes the selected text in place.",
        "when": "document"
      }
    ]
  }
}
```

Fields:

- `id` — must be unique globally. Convention: `<extensionId>.<verb>`.
- `title` — shown to the user.
- `description` — shown alongside the title.
- `when` — `"always"` (default) or `"document"` (hidden when no
  document is open).

Add a matching activation event so the extension wakes up on invocation:

```json
"activationEvents": ["onCommand:my-extension.summarize"]
```

### Registering

Inside `activate(ctx)`:

```ts
ctx.commands.register({
  id: 'my-extension.summarize',
  title: 'My Extension: Summarize selection',
  description: 'Summarizes the selected text in place.',
  async run(payload) {
    const doc = await ctx.host.documents.getActive();
    if (!doc) return { ok: false, error: 'No active document' };

    const snap = await ctx.host.documents.getContext(doc.id);
    const selected = snap?.selection?.text ?? doc.content;

    await ctx.host.tasks.submit({
      type: 'agent',
      input: {
        agentType: 'writer',
        input: { prompt: `Summarize:\n\n${selected}` },
      },
    });

    return { ok: true };
  },
});
```

`register` returns an unsubscribe function; the runtime also cleans up
on deactivate.

### Payload

Commands accept an optional `payload: unknown`. Who sends it:

- UI **button rows** in doc panels pass their `payload` prop (useful
  for `{ documentId }` style routing).
- Other command handlers can call the command surface directly.

The handler returns anything JSON-serializable. The wire wraps results
in an `ExtensionCommandExecutionResult`:

```ts
interface ExtensionCommandExecutionResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}
```

Throwing an `Error` sets `ok = false` and sends the message back.

### Invocation Paths

Commands can be invoked by:

- The command surface (future command palette entry)
- A doc-panel **button** (see below)
- Another extension calling `ctx.host` → tasks → commands (advanced)

## Doc Panels

### Declaring

Manifest:

```json
{
  "contributes": {
    "docPanels": [
      {
        "id": "summary-sidebar",
        "title": "Summary",
        "description": "Live summary of the document.",
        "when": "document",
        "icon": { "type": "asset", "path": "assets/summary.svg" },
        "order": 20
      }
    ]
  }
}
```

The panel appears in the document page's side panel switcher next to the
built-in Info and Chat panels.

### Registering A Renderer

```ts
ctx.panels.registerDocPanel({
  id: 'summary-sidebar',
  async render(context) {
    const doc = await ctx.host.documents.getById(context.documentId);
    const words = doc.content.split(/\s+/).filter(Boolean).length;

    return {
      blocks: [
        {
          type: 'notice',
          tone: 'info',
          title: 'Summary',
          description: 'Quick stats about this document.',
        },
        {
          type: 'keyValueList',
          items: [
            { label: 'Title', value: doc.title || '(untitled)' },
            { label: 'Words', value: String(words) },
            { label: 'Chars', value: String(doc.content.length) },
          ],
        },
        {
          type: 'buttonRow',
          buttons: [
            {
              id: 'regen',
              label: 'Regenerate summary',
              commandId: 'my-extension.regenerate-summary',
              payload: { documentId: context.documentId },
              variant: 'outline',
            },
          ],
        },
      ],
    };
  },
});
```

### Render Context

```ts
interface ExtensionDocPanelRenderContext {
  panelId: string;
  documentId: string;
  windowId?: number;
  reason: 'open' | 'refresh' | 'document-changed';
  documentContext: ExtensionDocumentContextSnapshot | null;
}
```

`reason` tells the extension why it is being asked to render — use it to
decide whether the render should be a cheap refresh or a full rebuild.

### Render Cadence

The renderer is called on:

- `open` — the user opened the panel
- `refresh` — an explicit refresh was requested (usually by code)
- `document-changed` — live document context changed (markdown,
  selection, editor state)

The runtime throttles document-changed renders so keystroke-level
changes don't spam the extension.

### The Block Language

Panels return `{ blocks: ExtensionDocPanelBlock[] }`. Available block
types:

| Block | Purpose |
| --- | --- |
| `text` | Plain text line |
| `markdown` | Rendered markdown |
| `keyValueList` | Two-column list (`label`, `value`) |
| `notice` | Callout with `tone: 'info' \| 'warning' \| 'error' \| 'success'`, optional `title`, required `description` |
| `buttonRow` | Row of buttons; each button names a `commandId` and optional `payload` |

Every block can have an optional `id` — stable ids help the renderer
diff between renders and preserve focus.

> The block set is intentionally small. Extensions do not render
> arbitrary HTML or React. New block types are added to the runtime
> (types + renderer) so every extension benefits.

### Buttons As Command Dispatchers

A `buttonRow` button is a typed dispatcher:

```ts
{
  id: 'apply-change',
  label: 'Apply change',
  commandId: 'my-extension.apply-change',
  payload: { documentId, offset: 100 },
  variant: 'default', // or 'outline' | 'secondary' | 'ghost'
}
```

When the user clicks, the renderer sends the command invocation through
the gateway, which routes it to the extension's registered handler.

### Panel Lifecycle

- Registered panels appear in Settings → Extensions under
  `registeredDocPanels`.
- Selecting the panel in the document page triggers `render({ reason: 'open' })`.
- Switching away unmounts the React view; the next open triggers a new
  render. The extension's process state is not reset.

## Avoiding Common Mistakes

- **Do not** assume a panel render can read arbitrary state from a
  previous render. State belongs in `ctx.storage` (persistent) or an
  in-memory variable inside the activation closure.
- **Do not** trigger long computations synchronously inside
  `render` — return a "loading" state (notice block) and kick off work
  that writes to storage + requests a refresh.
- **Keep command ids stable** — changing an id after release orphans
  doc-panel buttons already in users' saved layouts.
