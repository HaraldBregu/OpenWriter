# User Journey

End-to-end flow of a first-time user, from installing the app to shipping
a finished piece of writing.

## 1. Launch

The user opens OpenWriter. A **splash screen** shows briefly while the app
loads workspace state and startup info.

- On **first run** (`isInitialized === false`): the user is routed to the
  **ConfigPage** to set up at least one provider (API key) before the app
  will let them into the main UI.
- On **subsequent runs**: the user lands on the **WelcomePage**, which
  lists recently opened workspaces and offers "Open Folder" / "Create New".

Source: `src/renderer/src/App.tsx`, `src/renderer/src/pages/welcome`,
`src/renderer/src/pages/splash`.

## 2. Configure Providers

On first run the user must configure at least one LLM provider. Supported
out of the box:

- OpenAI
- Anthropic

For each provider the user enters an API key. The key is stored locally via
`electron-store` (see `src/main/services/store.ts`).

Multiple services can be registered (e.g., personal + work OpenAI keys).
Each agent in Settings picks which service and model it prefers.

## 3. Open Or Create A Workspace

A **workspace** is a folder on disk. Choosing one tells OpenWriter where to
put documents, images, and indexed resources.

- Selecting a folder runs `window.workspace.setCurrent(path)`.
- The app validates the path, creates standard sub-folders if missing
  (`documents/`, `images/`, `files/`, `contents/`, `data/`), and watches
  them for changes.
- Recent workspaces are remembered and shown on the WelcomePage.

Details: [WORKSPACE_AND_DOCUMENTS.md](./WORKSPACE_AND_DOCUMENTS.md).

## 4. Home

Once a workspace is open, the user lands on **Home** — a list of documents
in the current workspace. From here they can:

- Create a new document
- Open an existing document
- Navigate to **Resources** (files / contents / data)
- Open **Settings**

Source: `src/renderer/src/pages/home`.

## 5. Write

Opening a document loads the **Document page**: a Tiptap editor on the
left, a resizable sidebar on the right (info panel, agentic chat, or an
extension panel).

The user writes normally — typography, headings, lists, code blocks,
images, task lists, highlights are all supported.

See [WRITING_EXPERIENCE.md](./WRITING_EXPERIENCE.md) for editor details.

## 6. Ask The Agent

Three ways to invoke the agent loop:

| Trigger | What happens |
| --- | --- |
| **Inline prompt** (editor command) | A prompt box appears at the cursor. The user types an instruction, optionally attaches files. Submitting starts an `agent` task with the `writer` agent. |
| **Assistant context actions** (selection menu) | Fixed actions (improve, fix-grammar, summarize, translate, continue-writing) — each composes a canned instruction and runs the agent. |
| **Sidebar chat** | The agentic chat panel submits the same kind of task but with a conversational framing. |

The task is queued on the main-process `TaskExecutor`, which dispatches to
the registered agent. Tokens stream back via the `task:event` channel and
are inserted into the editor at the original selection position.

Full flow: [AI_AGENT_LOOP.md](./AI_AGENT_LOOP.md).

## 7. Watch The Loop

While the agent runs:

- The editor is disabled (no keystrokes racing the stream).
- A **TaskStatusBar** above the editor shows the current phase:
  _Thinking_, _Writing_, _Generating image_, _Done_.
- Each generated token is appended live to the editor and persisted to
  `content.md` on disk.
- If the agent calls `generate_image`, a PNG lands in `images/` next to
  the document and a Markdown `![alt](images/file.png)` reference is
  appended into `content.md`.
- The user can cancel at any time — cancellation aborts the in-flight
  LLM call and preserves whatever was already written.

## 8. History And Recovery

Every significant change is captured as a history entry. The user can:

- Undo / Redo locally within the editor (Tiptap history).
- Open the **History menu** to jump to a previous saved state of the
  document and restore it.

If the app closes mid-stream, the next time the document is opened the
renderer asks the task system for any in-flight or recently completed
task tied to this document ID and re-hydrates the editor with whatever
content was produced.

## 9. Resources

From the sidebar, the user can open the **Resources** section to import:

- Files (any file the user wants to keep near the project)
- Contents (structured reference material)
- Data (indexed sources — PDFs, DOCX, TXT)

Imported resources can be indexed into a local vector store used by the
**RAG agent** to answer questions grounded in the user's own material.

See [MEDIA_INGESTION.md](./MEDIA_INGESTION.md).

## 10. Export / Ship

OpenWriter does not provide publishing integrations. The user "ships"
their document by:

- Opening the workspace folder in the OS file manager (button in the
  sidebar).
- Copying `content.md` elsewhere, or pointing another tool at the
  folder.

The document is **always** plain Markdown on disk. No proprietary format,
no required runtime, no lock-in.

## Summary Flow

```text
splash
  │
  ▼
welcome / config
  │
  ▼
open workspace
  │
  ▼
home (document list)
  │
  ▼
open or create document ──► editor
                               │
                               ▼
                          user prompts agent
                               │
                               ▼
                          writer agent loop
                               │
                               ▼
                          tokens stream into editor
                          images written to disk
                               │
                               ▼
                          user reviews, edits, exports
```
