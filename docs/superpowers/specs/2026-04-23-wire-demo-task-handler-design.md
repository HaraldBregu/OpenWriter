# Wire Demo Task Handler into Document Page

**Date:** 2026-04-23
**Scope:** `src/renderer/src/pages/document/Page.tsx`
**Handler:** `src/main/task/handlers/demo-task-handler.ts` (unchanged)

## Goal

Replace the `text-generator-v2` agent task wiring in the document page with the simpler `demo` task handler. The demo handler streams five fixed chunks and returns the concatenated content. This serves as a mock runtime for exercising the task pipeline end-to-end without invoking real LLM agents.

## Context

`DemoTaskHandler` exists at `src/main/task/handlers/demo-task-handler.ts` and is already registered in `src/main/bootstrap.ts`. Its shape:

- **Input:** `{ prompt: string }`
- **Output:** `{ content: string }`
- **Events:** `recordEvent({ kind: 'text', at, payload: { text } })` per chunk
- **Progress:** percent + message via `reporter.progress`

`Page.tsx` currently targets `text-generator-v2`, which uses richer input (`{ raw }` with embedded `<selected_text>`/`<prompt>` markers), multi-kind events (`phase`, `delta`, `intent`, `decision`, `skill:selected`, `skills:selected`), and a completion payload shape `{ content, stoppedReason }`.

The executor wraps handler events as `task:event` messages with `data.event = { kind, at, payload }` and completion as `data.result = <handler return>`. Recovery (`findAgentTaskForDocument`, `getAgentSnapshot`) is hard-filtered to `task.type === 'agent'`; the demo task type is `'demo'` and therefore excluded. Recovery is deliberately dropped (see Decisions).

## Decisions

1. **Target type:** `demo`. Single source of truth via `TASK_TYPE` constant.
2. **Input:** pass user prompt directly as `{ prompt }`. No selection/before/after embedding.
3. **Metadata:** none. Drop `AssistantTaskMetadata`, session id, doc id, pos range from metadata. Editor position tracked locally via `editorInsert.begin(from, to)`.
4. **Events:** accept only `kind === 'text'` with `payload.text: string`; map to `handleDelta(text)`. All other kinds ignored.
5. **Completion:** accept `{ content: string }`. No `stoppedReason` required.
6. **Recovery:** dropped. On remount, any in-flight demo task continues server-side until natural finish or TTL cleanup; renderer does not reattach. Acceptable for a mock.
7. **Phase label:** dropped. `TaskStatusBar` uses its built-in `STATUS_LABELS` fallback.

## Changes

### `src/renderer/src/pages/document/Page.tsx`

**Replace:**
```ts
const TASK_TYPE = 'text-generator-v2';
```
with:
```ts
const TASK_TYPE = 'demo';
```

**Input construction in `handlePromptSubmit`:**
- Remove extraction of `textBefore` / `textAfter` / `selectedText`.
- Remove call to `buildEditorAgentRaw`.
- Build input as `{ prompt: payload.prompt }`.
- Keep `begin(from, to)` so `appendDelta` inserts at the correct range.

**`submitAssistantTask`:**
- Drop `AssistantTaskMetadata` construction and `sessionIdRef`.
- Pass `metadata: undefined` (or omit) on `window.task.submit`.

**`onEvent` running branch:**
- Keep the early-return guards on `activeTaskIdRef` and `event.taskId` match.
- Replace the kind-dispatch block with a single branch:
  ```ts
  if (inner.kind === 'text') {
    const payload = inner.payload as { text?: string } | null;
    if (typeof payload?.text === 'string') h.handleDelta(payload.text);
  }
  ```
- Remove all other kind branches and `setPhaseLabel` calls.

**Completion:**
- Replace `readCompletedResult` with:
  ```ts
  function readDemoResult(data: unknown): { content: string } | null {
    if (!data || typeof data !== 'object') return null;
    const result = (data as { result?: unknown }).result;
    if (!result || typeof result !== 'object') return null;
    const { content } = result as Record<string, unknown>;
    return typeof content === 'string' ? { content } : null;
  }
  ```
- Update the `completed` branch to call `readDemoResult` and `h.handleCompleted(result.content)`.
- Remove `markTaskApplied` call (no recovery → no replay guard needed).

**Recovery removal:**
- Delete the `useEffect` that calls `window.task.findForDocument` / `getSnapshot` (approximately lines 406–441).
- Delete `APPLIED_TASKS_STORAGE_KEY`, `readAppliedTaskIds`, `isTaskApplied`, `markTaskApplied`.
- Delete `isActiveTaskState`, `labelForPhase`.
- Delete `handleRecovery` callback and remove it from `taskHandlersRef`.

**Phase label removal:**
- Delete `phaseLabel` state and all `setPhaseLabel` calls.
- `<TaskStatusBar taskId={activeTaskId} />` — omit `phaseLabel` prop.

**Helper cleanup:**
- Delete `buildEditorAgentRaw` and `neutraliseAgentTags`.

**Import cleanup:**
- Drop: `v7 as uuidv7` from `uuid`, `AgentCompletedOutput`, `AgentDeltaPayload`, `AgentPhase`, `AgentPhasePayload`, `AssistantTaskMetadata`.
- Keep: `TaskEvent`, editor/document types still in use.

### Not changed
- `demo-task-handler.ts`
- `TaskStatusBar` component (its `phaseLabel` prop stays optional)
- Bootstrap registration, executor, IPC, other task types
- Editor, history, save/debounce, extension-panel, image loading

## Flow After Change

1. User submits prompt → `handlePromptSubmit` captures selection `{ from, to }` → `editorInsert.begin(from, to)` → `submit({ type: 'demo', input: { prompt } })`.
2. Each `text` event → `handleDelta(chunk)` → editor appends at tracked position.
3. Completed → `readDemoResult` extracts `content` → `commitFinal(content)` → document saved → editor UI reset → prompt view re-inserted.
4. Cancel or error → `handleCancelOrError` reverts the inserted range and re-enables editor.
5. Reload mid-run → renderer does not reattach; task continues server-side and eventually ages out.

## Risks

- **Orphan server task on reload:** no user-visible effect; cleaned up by executor TTL. Acceptable.
- **Loss of selection context in prompt:** expected — this is a mock, the handler ignores prompt semantics beyond length.

## Success Criteria

- Submitting a prompt in the document page streams the five demo chunks into the editor at the cursor.
- Completion replaces the streamed range with the final concatenated content, saves the document, and resets UI.
- Cancellation reverts the inserted range.
- No references to `text-generator-v2`, `AssistantTaskMetadata`, `buildEditorAgentRaw`, or agent recovery remain in `Page.tsx`.
- TypeScript compiles with no new errors.
