# Agent Streaming Refactor — Design

**Date:** 2026-04-22
**Scope:** Document page (`src/renderer/src/pages/document/Page.tsx`) agent streaming flow, from renderer submit through task handler through agent, and back into the editor via live insertion.

## Goal

Replace the disk-streaming flow (agent writes `content.md` per-token, renderer reloads via file watcher) with a pure task-event stream. Tokens flow through `TaskEvent.data`; the renderer inserts them at the editor position tracked in task metadata. Disk is written once, by the renderer, on task completion.

## Summary of Decisions

| # | Decision |
|---|----------|
| 1 | No disk writes during agent run. Renderer writes final content on `completed`. |
| 2 | Selection range `[posFrom, posTo)` is replaced; `posFrom === posTo` means insert-at-cursor. |
| 3 | Running data shape: `{ token, fullContent }` (delta plus authoritative snapshot). |
| 4 | Page refresh reconstructs editor state from the last `fullContent` snapshot. |
| 5 | On `completed`, renderer replaces streamed range with `data.content` (self-healing). |
| 6 | Images embed as markdown tokens in the stream (uniform with text). |
| 7 | Status bar shows phase label only (`Thinking` / `Writing` / `Generating image` / `Done`). |
| 8 | Cancel reverts streamed text to pre-task state. Cancel button lives in `TaskStatusBar`. |

## Data Shapes

Added to `src/shared/types.ts`.

```ts
export interface AssistantTaskMetadata {
  sessionId: string;
  documentId: string;
  posFrom: number;
  posTo: number;
}

export interface AgentTaskSubmitInput {
  agentType: 'assistant' | 'rag' | 'ocr';
  input: { prompt: string; files: { name: string; mimeType?: string }[] };
}

export type AgentPhase =
  | 'queued'
  | 'thinking'
  | 'writing'
  | 'generating-image'
  | 'completed'
  | 'error'
  | 'cancelled';

// --- Typed payloads for AgentEvent emitted via recordEvent ---
export interface AgentPhasePayload { phase: AgentPhase; label: string }
export interface AgentDeltaPayload { token: string; fullContent: string }

// --- Handler return value (wire: TaskEvent.data.result on 'completed') ---
export interface AgentCompletedOutput {
  content: string;
  stoppedReason: 'done' | 'max-steps' | 'stagnation';
}

export interface AgentTaskSnapshot {
  taskId: string;
  state: TaskState;
  phase: AgentPhase;
  fullContent: string;
  metadata: AssistantTaskMetadata;
  startedAt?: number;
}
```

### Wire format (actual `TaskEvent.data` shape)

- `state: 'queued' | 'started' | 'cancelled'` → `data: {}` (unchanged).
- `state: 'running'` → `data: { event: AgentEvent }` (unchanged wrapping in `TaskExecutor`).
  - `data.event.kind === 'phase'` → `data.event.payload: AgentPhasePayload`.
  - `data.event.kind === 'delta'` → `data.event.payload: AgentDeltaPayload`.
  - Other `event.kind` values may pass through (logged but not routed by the renderer hooks).
- `state: 'completed'` → `data: { result: AgentCompletedOutput; durationMs: number }`.
  - **Breaking change from current behavior:** `AgentTaskHandler` used to return `{ agentType, output }`; it now returns `AgentCompletedOutput` directly. `agentType` is already in `TaskInfo.type`, so the wrapper is redundant.
- `state: 'error'` → `data: null`, `error: { code, message }` (unchanged).

Notes:
- `TaskEvent.data` remains `unknown` at the generic task-system level. Agent-task consumers narrow by checking `state` and `metadata.documentId`.
- `fullContent` is joined text deltas only. Images are markdown tokens, already part of the text stream.
- Task system continues to emit progress events (`data: { percent, message, detail }`) — renderer ignores them for agent tasks; phase/delta events are the source of truth.

## Components

### Main process

**New — `src/main/task/handlers/agent-stream-projection.ts`**
- `AgentStreamProjection` class.
- Accumulates `fullContent` from `AgentEvent` kind `text` deltas.
- Exposes `apply(event)`, `snapshot() → { phase, fullContent }`.

**New — `src/main/task/handlers/agent-phase-mapper.ts`**
- `AgentPhaseMapper` class.
- Maps `AgentEvent.kind` → `AgentPhase` + display label.
- Deduplicates consecutive same-phase emissions.

**Refactored — `src/main/task/handlers/agent-task-handler.ts`**
- Instantiate projection + mapper per execution.
- `ctx.onEvent` callback:
  1. `projection.apply(event)`
  2. `const mapped = mapper.map(event, projection)` → `{ phase, label } | null`
  3. If `mapped !== null` (phase changed): `recordEvent({ kind: 'phase', at: Date.now(), payload: mapped })` (typed as `AgentPhasePayload`).
  4. If event is text with a non-empty delta: `recordEvent({ kind: 'delta', at: Date.now(), payload: { token, fullContent: projection.fullContent } })` (typed as `AgentDeltaPayload`).
- `execute` signature changes: `Promise<AgentCompletedOutput>` (was `AgentTaskOutput`).
- Returns `{ content: projection.fullContent, stoppedReason }`.
- `DocumentStreamWriter` import + usage removed.
- `AgentTaskInput` shape unchanged (`{ agentType, input }`).

**Deleted — `src/main/task/handlers/document-stream-writer.ts`**
- No longer used. Tests referencing it deleted.

**Extended — `src/main/task/task-executor.ts`**
- New method: `getAgentSnapshot(taskId: string): AgentTaskSnapshot | undefined`.
- Reads `ActiveTask` (including `completedTasks` within TTL). Rebuilds `{ phase, fullContent }` by iterating stored `events`.
- Returns `undefined` if task unknown.

**New IPC channel — `task:get-snapshot`**
- Wired in the task IPC module (alongside existing `task:submit`, `task:list`, `task:cancel`).
- Preload: `window.task.getSnapshot(taskId) → Promise<IpcResult<AgentTaskSnapshot | null>>`.

### Renderer

**New — `src/renderer/src/pages/document/hooks/use-assistant-task.ts`**

API:
```ts
export function useAssistantTask(params: {
  documentId: string | null;
  sessionIdRef: MutableRefObject<string | null>;
  onPhase: (phase: AgentPhase, label: string) => void;
  onDelta: (token: string, fullContent: string) => void;
  onCompleted: (content: string) => void;
  onCancelled: () => void;
  onError: (message: string) => void;
}): {
  isRunning: boolean;
  activeTaskId: string | null;
  submit: (args: {
    prompt: string;
    files: { name: string; mimeType?: string }[];
    posFrom: number;
    posTo: number;
  }) => Promise<void>;
  cancel: () => Promise<void>;
};
```

Responsibilities:
- Mount: list tasks → find `documentId` match → if found, call `getSnapshot`, feed to caller via `onDelta(fullContent, fullContent)`.
- Subscribe to `window.task.onEvent`; filter by active task id; dispatch by `data.kind` / state.
- Own `sessionIdRef` lazy creation on first submit.

**New — `src/renderer/src/pages/document/hooks/use-editor-stream-insert.ts`**

API:
```ts
export function useEditorStreamInsert(editorRef: RefObject<EditorElement>): {
  begin: (posFrom: number, posTo: number) => void;
  appendDelta: (token: string) => void;
  commitFinal: (content: string) => void;
  revert: () => void;
};
```

Internal state (ref, not React state):
```ts
type InsertSession = {
  origin: number;         // posFrom after selection delete
  insertedLength: number; // total chars inserted since begin
} | null;
```

Behavior:
- `begin(from, to)`: if `from < to`, delete range `[from, to)`. Set `origin = from`, `insertedLength = 0`.
- `appendDelta(token)`: insert `token` at `origin + insertedLength`. Increment `insertedLength`.
- `commitFinal(content)`:
  - Compute doc size; clamp `origin` to `[0, docSize]`.
  - Delete range `[origin, origin + insertedLength)`.
  - Insert `content` at `origin`. Clear session.
- `revert()`: delete range `[origin, origin + insertedLength)`. Clear session.

**Refactored — `src/renderer/src/pages/document/Page.tsx`**
- Replace existing `handlePromptSubmit` + `useEffect(... task.onEvent)` + `useEffect(... task.list)` blocks with two hook calls.
- Add `phaseLabel` state passed to `TaskStatusBar`.
- Editor `disabled` prop drives from `useAssistantTask.isRunning`.
- On `completed` (inside `onCompleted` callback): write document to disk via `window.workspace.updateDocumentContent(documentId, editor.getMarkdown())`.
- Remove `onOutputFileChange` content-reload branch (file-watch no longer triggered by agent). Keep `removed` branch for external deletions.

**Extended — `src/renderer/src/pages/document/components/TaskStatusBar.tsx`**
- Accept `phaseLabel: string | null`, `onCancel: () => void` props.
- Show label + cancel button when `taskId` present. No cancel when task in `completed`/`error` transient state.

## Data Flow

### Happy path

1. Renderer reads `editor.state.selection` → `{ posFrom, posTo }`.
2. `useAssistantTask.submit`:
   1. `editorInsert.begin(posFrom, posTo)`
   2. `window.task.submit({ type: 'agent', input: { agentType: 'assistant', input: { prompt, files } }, metadata: { sessionId, documentId, posFrom, posTo } })`
   3. `setActiveTaskId(taskId)`; editor disables via prop.
3. `AgentTaskHandler.execute`:
   1. Enrich input (credentials, paths) — unchanged.
   2. Initial `recordEvent` with `phase: thinking`.
   3. Agent runs; each `AgentEvent` processed through projection + mapper → emits phase/delta events via `recordEvent`.
   4. Returns `{ content, stoppedReason }`.
4. `TaskExecutor` emits `completed` with `data: { result: AgentCompletedOutput; durationMs }`.
5. Renderer dispatch (inside `useAssistantTask.onEvent`):
   - `state: 'running'` + `data.event.kind === 'phase'` → `onPhase(payload.phase, payload.label)` → status bar.
   - `state: 'running'` + `data.event.kind === 'delta'` → `onDelta(payload.token, payload.fullContent)` → `editorInsert.appendDelta(token)`.
   - `state: 'completed'` → `onCompleted(data.result.content)` → `editorInsert.commitFinal(content)` + `updateDocumentContent(id, editor.getMarkdown())` + editor re-enabled.

### Refresh recovery

1. Page mounts, loads content from disk (unchanged).
2. `useAssistantTask` mount effect:
   1. `task.list()` → find task where `metadata.documentId === id` and state in `{ queued, started, running }`.
   2. If found, `task.getSnapshot(taskId)` → `{ phase, fullContent, metadata: { posFrom, posTo } }`.
   3. `editorInsert.begin(posFrom, posTo)`.
   4. `editorInsert.appendDelta(fullContent)` (one-shot replay — `insertedLength` becomes `fullContent.length`).
   5. Subscribe to `task.onEvent` for subsequent events.

### Cancel

1. User clicks cancel in `TaskStatusBar`.
2. `useAssistantTask.cancel` → `window.task.cancel(taskId)`.
3. Main aborts → emits `state: 'cancelled'`.
4. Renderer `onCancelled` → `editorInsert.revert()` → editor re-enabled.

### Error

Same as cancel — `onError` triggers `revert()`. Status bar surfaces the message.

## Error Handling & Edge Cases

- **IPC delivery gaps.** `fullContent` in every delta is authoritative. Renderer may detect drift (accumulator length differs from incoming `fullContent.length`) and re-sync: clear streamed range, reinsert `fullContent` verbatim. `commitFinal` self-heals regardless.
- **Editor remount mid-run.** Hook is keyed on `documentId`; remount re-runs recovery flow. Origin from `getSnapshot.metadata.posFrom`, not editor state.
- **Navigate away mid-run.** Task keeps running. Return to doc → recovery re-attaches.
- **Document deleted mid-run.** Existing `onOutputFileChange` `removed` branch navigates to `/home`. `updateDocumentContent` call inside `onCompleted` wrapped in try/catch — logs and exits cleanly if the document is gone.
- **External disk edit during run.** Editor disabled in-app; no in-app mutation possible. On `commitFinal`, clamp `origin` to `[0, doc.content.size]`.
- **Rapid resubmits.** Current guard (`isRunning` + disabled editor) preserved. Submit is a no-op while task is active.
- **App crash / quit.** `ActiveTask` is in-memory. No recovery on restart. Acceptable — disk holds pre-submit content unchanged.
- **Budget exceeded.** `BudgetExceededError` → `state: 'error'`. Treated as generic error (revert). Surfacing partial content on budget is out of scope.
- **Image generation failure.** `ImageNode` emits error event; text stream continues. Agent-level concern, not renderer's.

## Testing

### Main — unit

- `AgentStreamProjection`:
  - Accumulates text deltas into `fullContent`.
  - Ignores non-text events for content accumulation.
  - Snapshot returns current `fullContent` length and latest phase.
- `AgentPhaseMapper`:
  - Controller event → `thinking`.
  - Text event → `writing`.
  - Image event → `generating-image`.
  - Deduplicates consecutive same-phase emissions.
- `AgentTaskHandler` (with stub `AssistantAgent`):
  - Sequence `controller → text×3 → image → text×2 → done` produces expected phase and delta sequence on `recordEvent`.
  - Return `{ content, stoppedReason }` matches projection.
- `TaskExecutor.getAgentSnapshot`:
  - After N events, snapshot reflects latest `fullContent` and `phase`.
  - Returns `undefined` for unknown or TTL-expired task.

### Renderer — unit

- `useEditorStreamInsert` (mock Tiptap editor):
  - `begin({ from: 5, to: 10 })` removes `[5, 10)`, resets `insertedLength: 0`.
  - `appendDelta('abc')` inserts at `origin + insertedLength`.
  - `commitFinal('xyz')` clears streamed range and inserts `'xyz'` at `origin`.
  - `revert()` clears streamed range; does not restore pre-`begin` selection (it was already deleted).
- `useAssistantTask`:
  - Mount with no active task → `isRunning: false`, no `getSnapshot` call.
  - Mount with active task → `getSnapshot` called; `onDelta(fullContent, fullContent)` fired once.
  - Event dispatch routes `phase` / `delta` / `completed` to the correct callback.
  - `cancel()` invokes `window.task.cancel` and `onCancelled` fires on the cancelled event.

### Renderer — integration

- `Page` mounted with mocked `window.task` + `window.workspace`.
- Simulate submit → assert `task.submit` called with the correct payload shape.
- Feed fake event stream → assert editor content grows token by token.
- Feed `completed` → assert `updateDocumentContent` called; editor re-enabled.

### Out of scope

- No e2e Playwright test for this refactor.
- No test for `AssistantAgent` internals (unchanged).

## Files Touched

**Added:**
- `src/main/task/handlers/agent-stream-projection.ts`
- `src/main/task/handlers/agent-phase-mapper.ts`
- `src/renderer/src/pages/document/hooks/use-assistant-task.ts`
- `src/renderer/src/pages/document/hooks/use-editor-stream-insert.ts`

**Modified:**
- `src/shared/types.ts` (new types)
- `src/main/task/handlers/agent-task-handler.ts`
- `src/main/task/task-executor.ts` (`getAgentSnapshot`)
- `src/main/task/index.ts` (re-exports)
- `src/preload/` task API (add `getSnapshot`)
- `src/renderer/src/pages/document/Page.tsx`
- `src/renderer/src/pages/document/components/TaskStatusBar.tsx`
- `src/renderer/src/pages/document/hooks/index.ts` (re-exports)

**Deleted:**
- `src/main/task/handlers/document-stream-writer.ts`
- Any tests referencing `DocumentStreamWriter`.
