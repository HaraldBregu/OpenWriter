# Product Overview

## What OpenWriter Does

OpenWriter is a **desktop writing environment** — not a chat app. The user
writes text; AI assists on request. The focus is long-form content that lives
on the user's disk as plain Markdown, with generated images sitting next to it
as ordinary PNG files.

Three things happen in the app:

1. **The user writes** — in a rich-text editor that outputs Markdown.
2. **The user asks for help** — via inline prompt, sidebar chat, or a
   context-menu assistant action.
3. **An agent loop produces content** — text streamed into the cursor, and
   optionally images written next to the document and referenced in the
   Markdown.

Everything else in the app exists to support those three actions: workspace
management, resource libraries, indexing, transcription, OCR, and provider
settings.

## Target Use Cases

| Use case | What it looks like |
| --- | --- |
| Write a book chapter | Long document with chapters, images generated per scene, AI continues from cursor |
| Write a blog post / article | Medium document, AI improves grammar, summarizes sections, produces hero image |
| Draft from research notes | User imports PDFs / DOCX as resources, agent retrieves and cites |
| Transcribe interviews | Drop audio/video into the workspace, transcribed text becomes a new document |
| Research → writing workflow | Workspace holds sources + notes + drafts in one folder the user controls |

## Target User

A single writer on a desktop. Not a team product. Not a SaaS. Data and files
are local; the only network traffic is LLM API calls to the user's configured
provider.

The user brings their own API key. The app has no server of its own.

## Guiding Principles

These shape every feature decision:

- **The document is a file, not a database row.** Documents are folders
  (`content.md`, `config.json`, `images/`). They keep working if the app
  disappears tomorrow.
- **AI assists, does not replace.** All agent output lands in the editor
  where the user can edit, accept, or discard it. Nothing auto-commits
  behind the user's back.
- **One window = one workspace.** Each workspace folder is isolated.
  Opening a second workspace opens a second window; services are scoped
  per window so state cannot leak between them.
- **The user owns provider choice.** Providers and models are configured
  per agent in Settings. There is no hidden default provider.
- **Side effects are observable.** Every agent action emits typed events
  (phase, text delta, tool call, image) that surface in the task status bar
  and the document's activity timeline.

## Non-Goals

Things OpenWriter intentionally does not do:

- No multi-user collaboration, real-time editing, or comments.
- No cloud storage, sync, or account system.
- No "project management" features (tasks, milestones, deadlines).
- No built-in publishing (to Medium, WordPress, etc.) — export is the
  user's responsibility.
- No autonomous "write the whole book while I sleep" mode. Agent loops are
  bounded (`maxSteps`, per-call timeouts, cancellation).

## Platforms

| Platform | Packaging |
| --- | --- |
| macOS (arm64 + x64) | `.pkg` / `.dmg` |
| Windows (x64) | NSIS installer |
| Linux (x64) | AppImage |

See [../../package.json](../../package.json) `dist:*` scripts for build
targets.

## Languages

Shipped i18n out of the box: **English**, **Italian**. Resource strings
live under [`resources/i18n/`](../../resources/i18n). Adding a language is
a content-only change.

## What the User Never Sees

The functional surface is deliberately small. Under the hood, the app runs:

- an Electron main process with workspace, file, and task services
- a React + Tiptap renderer
- a registry of agents (writer, assistant, RAG, OCR, transcription)
- a registry of skills (user-authored workflows)
- a tool layer (read, write, edit, bash, grep, find, ls, generate_image)
- a task executor with priority queuing and event streaming

For those details see [../ARCHITECTURE.md](../ARCHITECTURE.md).
