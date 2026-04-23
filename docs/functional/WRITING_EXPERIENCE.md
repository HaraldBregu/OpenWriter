# Writing Experience

Everything the user does inside a document page.

## The Editor

OpenWriter's editor is built on **Tiptap 3** (ProseMirror under the hood).
Content is authored as rich text and round-trips to Markdown — that
Markdown is what lives on disk in `content.md`.

Supported content types:

| Category | Nodes / Marks |
| --- | --- |
| Text | paragraph, bold, italic, underline, strike, code, highlight |
| Structure | headings (h1–h6), blockquote, horizontal rule, code block |
| Lists | bullet list, ordered list, task list (checkboxes) |
| Media | images, links |
| UX | typography (smart quotes etc.), placeholder, history, dropcursor, gapcursor |

Shortcuts and toolbar actions mirror the underlying Tiptap extensions.

## Title And Metadata

Each document has an editable **title** at the top of the page and a
**DocumentInfoPopover** that shows:

- Document ID
- Created/updated timestamps
- Provider/model last used
- Word and character counts

Changes to the title and content are debounced (`500ms` for metadata,
`1500ms` for content) and written to disk via `updateDocument` IPC.

## Saving

Saving is automatic. The renderer writes:

- `content.md` — the full Markdown after each debounce window
- `config.json` — metadata (title, timestamps, type)

There is no explicit Save button — if the file on disk differs from the
editor, the debounce flushes on blur and on unmount.

## Undo / Redo And History

Two independent history surfaces:

- **Tiptap in-memory history** — standard Undo/Redo buttons in the
  toolbar. Scoped to the current session.
- **Document history menu** — persisted snapshots of the document.
  Restoring a snapshot rewrites both content and title, pushes the
  current state onto the in-memory history, and triggers save.

Source: `src/renderer/src/pages/document/hooks/use-document-history.ts`.

## Invoking The Agent

The user has four ways to trigger the writer agent loop:

### 1. Inline Prompt

Via slash-command or keyboard shortcut, a **PromptView** appears at the
cursor. The user types an instruction ("continue this paragraph",
"rewrite as a tweet thread", "generate a hero image"), optionally
attaches files, and submits.

Submitting composes a prompt that includes:

- The text **before** the cursor
- The user's instruction
- The text **after** the cursor

This gives the agent full context without sending the entire document.

### 2. Selection Assistant Action

When text is selected, the user can trigger a preset action:

| Action | Canned instruction |
| --- | --- |
| Improve | "Improve the writing of the following text while preserving its meaning." |
| Fix grammar | "Fix grammar and spelling mistakes in the following text." |
| Summarize | "Summarize the following text concisely." |
| Translate | "Translate the following text to English." |
| Continue writing | "Continue writing from where the text ends, matching tone and style." |

The selected text is appended to the canned instruction and submitted as
an agent task.

### 3. Sidebar Chat

The **Chat panel** (agentic sidebar) runs the same task machinery but
framed as a conversation. Messages persist inside the document folder
under `chats/`.

### 4. Insert Content Dialog

A dialog that lets the user insert templated blocks: tables, code,
reference links, and so on. Some options route through the agent if
they require generation.

## Streaming Into The Editor

While the agent is running:

1. The editor is **disabled** — the user cannot type until the stream
   ends, cancels, or errors.
2. A **loading indicator** appears; the **TaskStatusBar** above the
   editor shows the current phase label.
3. Each `delta` event from the task bus appends a token at the original
   selection anchor. The anchor moves as tokens arrive — the result
   looks like live typing.
4. When the task completes, the final committed content replaces the
   in-progress streamed buffer (so formatting normalizes cleanly),
   the editor re-enables, and the prompt input is cleared.

If the task is cancelled or errors, the stream is reverted — the
selection returns to its pre-prompt state.

Source: `src/renderer/src/pages/document/Page.tsx`, hook
`use-editor-stream-insert.ts`.

## Task Status Bar

A slim bar between the page header and the editor surfaces:

- Phase label (_Queued_, _Thinking_, _Writing_, _Generating image_,
  _Done_, _Error_, _Cancelled_)
- A cancel affordance while the task is running

The phase is derived from `phase` events emitted by the agent and task
handler. Text deltas themselves don't drive the phase text.

## Mid-Run Recovery

If the document page mounts while a task is already running (e.g. the
user navigated away and back), `window.task.findForDocument(id)` returns
the active task ID. The editor then:

1. Re-hooks into the task event stream.
2. Asks for a **snapshot** (`task:get-snapshot`) — this returns the
   aggregate `fullContent` reconstructed from the task's event log
   plus the current phase.
3. Inserts the snapshot into the editor, then continues streaming any
   new deltas on top.

This lets the user close and reopen documents while the agent keeps
working.

## Extension Panels

The right-hand sidebar can host:

- **builtin:config** — document info panel (default)
- **builtin:agentic** — chat panel
- A third-party **extension panel** registered via the OpenWriter
  extension SDK

Extension panels receive a typed document context snapshot (markdown,
selection, active marks) and can contribute their own UI alongside the
editor. See [EXTENSIONS.md](./EXTENSIONS.md).

## Images In The Document

Images appear inline in the editor like any Markdown image. Two sources:

- User-inserted images (drag-drop, paste, or toolbar) are stored under
  `images/` in the document folder and referenced relatively in
  `content.md`.
- **Generated** images from the `generate_image` tool call are saved to
  the workspace-level `images/` folder and a Markdown reference is
  appended to `content.md` at the agent's insertion point.

See [IMAGE_GENERATION.md](./IMAGE_GENERATION.md).
