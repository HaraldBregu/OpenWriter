---
name: Researcher Agent Architecture
description: Complete architecture spec for the Researcher agent — standalone service, LangGraph topology, IPC channels, preload bridge, and bootstrap wiring
type: project
---

# Researcher Agent Architecture — OpenWriter

Designed: 2026-03-27

## Why it lives outside the TaskExecutor system

The existing AgentTaskHandler/TaskExecutor flow is a queued, fire-and-forget task pipeline.
The Researcher is a direct, session-less, streaming interaction. Routing it through the
task queue adds queue management overhead and couples the researcher to the task lifecycle
events (queued, started, completed) that are irrelevant for this use case.

A separate service also makes cancellation trivial: cancel(sessionId) maps directly to
an AbortController with no queue position bookkeeping.

## File Structure

```
src/main/ai/researcher/
  researcher-service.ts   — ResearcherService class
  researcher-graph.ts     — LangGraph StateGraph factory (buildResearcherGraph)
  researcher-state.ts     — Annotation.Root definition
  nodes/
    understand-node.ts    — classify intent
    plan-node.ts          — build research plan
    research-node.ts      — synthesize information
    compose-node.ts       — stream final response

src/main/ipc/
  researcher-ipc.ts       — IpcModule implementation

src/shared/
  channels.ts             — ResearcherChannels + additions to InvokeChannelMap + EventChannelMap

src/preload/
  index.ts                — add window.researcher namespace
  index.d.ts              — ResearcherApi interface + Window augmentation
```

## State Design

```typescript
// src/main/ai/researcher/researcher-state.ts

import { Annotation } from '@langchain/langgraph';

export const ResearcherState = Annotation.Root({
  // --- Injected by ResearcherService (write-once inputs) ---
  prompt: Annotation<string>({
    reducer: (_a, b) => b,
    default: () => '',
  }),
  apiKey: Annotation<string>({
    reducer: (_a, b) => b,
    default: () => '',
  }),
  modelName: Annotation<string>({
    reducer: (_a, b) => b,
    default: () => 'gpt-4o',
  }),
  providerId: Annotation<string>({
    reducer: (_a, b) => b,
    default: () => 'openai',
  }),

  // --- Produced by understand node ---
  intent: Annotation<string>({
    reducer: (_a, b) => b,
    default: () => '',
  }),

  // --- Produced by plan node ---
  plan: Annotation<string[]>({
    reducer: (_a, b) => b,
    default: () => [],
  }),

  // --- Produced by research node ---
  research: Annotation<string>({
    reducer: (_a, b) => b,
    default: () => '',
  }),

  // --- Produced by compose node (streamed) ---
  response: Annotation<string>({
    reducer: (_a, b) => b,
    default: () => '',
  }),
});

export type ResearcherStateType = typeof ResearcherState.State;
```

**Reducer rationale**: All fields use overwrite (`(_a, b) => b`) because each node
produces a complete value for its output field, not an incremental append. The `plan`
field receives a full array from the plan node, not pushed items.

## Graph Topology

```
START → understand → plan → research → compose → END
```

All edges are unconditional. Each node receives the accumulated state from all prior nodes,
so `compose` has access to `intent`, `plan`, and `research` when it writes the final answer.

There are no conditional branches because:
- `understand` always succeeds (it classifies, it doesn't reject)
- `plan` always succeeds (it may return a minimal 1-step plan)
- `research` always succeeds (falls back to LLM knowledge if no tools)
- `compose` is the terminal streamed node

**Why no conditional routing?** Conditional routing is appropriate when a classification
determines which of multiple downstream paths to take (e.g., a supervisor delegating to
specialist agents). Here, every query always passes through all four stages. Adding a
conditional "route to specialized researchers" is a future concern and can be added as
a `router` node between `plan` and `research` without restructuring the rest of the graph.

## Node Contracts

### understand-node
- **Input**: `state.prompt`
- **Output**: `{ intent: string }`
- **LLM role**: Classify query into one of: `factual-lookup`, `conceptual-explanation`,
  `comparative-analysis`, `procedural-guide`, `creative-research`. Returns a JSON object
  `{ intent: string, scope: string }` so the plan node has structured context.
- **Temperature**: 0.1 (deterministic classification)
- **Streaming**: No — returns structured JSON; filtered from token stream via `streamableNodes`

### plan-node
- **Input**: `state.prompt`, `state.intent`
- **Output**: `{ plan: string[] }`
- **LLM role**: Produce an ordered array of 2–5 research sub-questions or angles to cover.
  Returns JSON `{ steps: string[] }`.
- **Temperature**: 0.2
- **Streaming**: No — filtered via `streamableNodes`

### research-node
- **Input**: `state.prompt`, `state.intent`, `state.plan`
- **Output**: `{ research: string }`
- **LLM role**: For each step in the plan, gather/synthesize relevant knowledge from
  the model's training data. Returns a consolidated prose summary (not streamed —
  this is an internal accumulation step).
- **Temperature**: 0.3
- **Streaming**: No — filtered via `streamableNodes`

### compose-node
- **Input**: `state.prompt`, `state.intent`, `state.plan`, `state.research`
- **Output**: `{ response: string }`
- **LLM role**: Write the final detailed, well-structured response for the user.
  This is the only node whose tokens flow to the renderer.
- **Temperature**: 0.7 (allows fluent prose)
- **Streaming**: YES — listed in `streamableNodes: ['compose']`

**Why only compose streams?** The understand/plan/research nodes produce structured
intermediate data (JSON intents, step arrays, raw summaries) that are not meant for
the user. Streaming their tokens would produce confusing partial JSON in the UI.
The `streamableNodes` mechanism in the existing executor already handles this filtering.

## ResearcherService

```typescript
// src/main/ai/researcher/researcher-service.ts

export interface ResearcherQueryOptions {
  providerId?: string;
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ResearcherStreamCallback {
  onToken: (token: string, sessionId: string) => void;
  onDone: (result: ResearchResult, sessionId: string) => void;
  onError: (error: string, code: string, sessionId: string) => void;
  onPhase?: (phase: ResearchPhase, sessionId: string) => void;
}

export type ResearchPhase = 'understanding' | 'planning' | 'researching' | 'composing';

export interface ResearchResult {
  response: string;
  tokenCount: number;
  sessionId: string;
  intent: string;
  plan: string[];
}

export class ResearcherService {
  // Map<sessionId, AbortController>
  private readonly sessions = new Map<string, AbortController>();

  constructor(
    private readonly providerResolver: ProviderResolver,
    private readonly logger?: LoggerService
  ) {}

  async query(
    prompt: string,
    sessionId: string,
    callbacks: ResearcherStreamCallback,
    options?: ResearcherQueryOptions
  ): Promise<void> { ... }

  cancel(sessionId: string): boolean { ... }

  destroy(): void { ... }
}
```

**Key decisions**:
- Returns `Promise<void>` rather than `Promise<ResearchResult>` because results are
  delivered via callbacks, not the return value. This mirrors the EventBus push pattern
  used by TaskExecutor for streaming.
- Callbacks instead of EventEmitter: callbacks are simpler, type-safe without
  generics gymnastics, and avoid listener cleanup concerns.
- `destroy()` implements `Disposable` so ServiceContainer handles app-shutdown cleanup.
- `onPhase` is optional — the renderer can show a "Researching..." stage indicator.

## Graph Construction in ResearcherService

```typescript
// Inside ResearcherService.query():

const provider = this.providerResolver.resolve({
  providerId: options?.providerId,
  modelId: options?.modelId,
});

// Build four separately-configured models
const understandModel = createChatModel({
  providerId: provider.providerId,
  apiKey: provider.apiKey,
  modelName: provider.modelName,
  streaming: true,
  temperature: UNDERSTAND_TEMPERATURE,   // 0.1
});
const planModel = createChatModel({ ...provider, temperature: PLAN_TEMPERATURE });
const researchModel = createChatModel({ ...provider, temperature: RESEARCH_TEMPERATURE });
const composeModel = createChatModel({ ...provider, temperature: options?.temperature ?? COMPOSE_TEMPERATURE });

const graph = buildResearcherGraph({
  understand: understandModel,
  plan: planModel,
  research: researchModel,
  compose: composeModel,
});

const initialState: ResearcherStateType = {
  prompt,
  apiKey: provider.apiKey,
  modelName: provider.modelName,
  providerId: provider.providerId,
  intent: '',
  plan: [],
  research: '',
  response: '',
};

const stream = await graph.stream(initialState, {
  streamMode: ['messages', 'values'],
  signal: controller.signal,
});
```

The service drives the graph stream directly — it does NOT delegate to `executeAIAgentsStream`.
That function is the executor path for the task-based agents. The researcher owns its stream
loop for full control over phase callbacks, per-session abort, and error recovery.

**Phase detection**: the `values` stream events carry node names via LangGraph internal metadata.
Phase callbacks fire when a new node begins (detected via state field transitions in the values stream).

## Streaming Token Loop

```typescript
const STREAMABLE = new Set(['compose']);

for await (const event of stream) {
  if (controller.signal.aborted) break;

  const [mode, data] = event as [string, unknown];

  if (mode === 'messages') {
    const [chunk, metadata] = data as [unknown, Record<string, unknown>];
    if (!chunk) continue;
    if (chunk instanceof AIMessage) continue;  // skip final complete message

    const nodeName = typeof metadata?.['langgraph_node'] === 'string'
      ? metadata['langgraph_node']
      : undefined;

    if (nodeName && !STREAMABLE.has(nodeName)) continue;

    const token = extractTokenFromChunk(
      typeof chunk === 'object' && chunk !== null && 'content' in chunk
        ? (chunk as { content: unknown }).content
        : ''
    );
    if (token) {
      fullResponse += token;
      tokenCount++;
      callbacks.onToken(token, sessionId);
    }
  }

  if (mode === 'values') {
    const snapshot = data as ResearcherStateType;
    // Detect phase transitions from state field population
    if (snapshot.intent && !lastPhase) {
      callbacks.onPhase?.('planning', sessionId);
      lastPhase = 'planning';
    }
    if (snapshot.plan.length > 0 && lastPhase === 'planning') {
      callbacks.onPhase?.('researching', sessionId);
      lastPhase = 'researching';
    }
    if (snapshot.research && lastPhase === 'researching') {
      callbacks.onPhase?.('composing', sessionId);
      lastPhase = 'composing';
    }
    finalState = snapshot;
  }
}
```

## IPC Channels

```typescript
// Addition to src/shared/channels.ts

export const ResearcherChannels = {
  query:  'researcher:query',
  cancel: 'researcher:cancel',
  event:  'researcher:event',
} as const;
```

**Channel semantics**:

| Channel | Direction | Mechanism | Purpose |
|---------|-----------|-----------|---------|
| `researcher:query` | renderer → main | `ipcMain.handle` / `ipcRenderer.invoke` | Start a query; returns `{ sessionId }` immediately |
| `researcher:cancel` | renderer → main | `ipcMain.handle` / `ipcRenderer.invoke` | Cancel by sessionId; returns `boolean` |
| `researcher:event` | main → renderer | `webContents.send` / `ipcRenderer.on` | Push stream events: token, phase, done, error |

**Why `researcher:query` returns immediately?**
The renderer invokes `researcher:query` and immediately gets back `{ sessionId }`. The
actual response arrives asynchronously via `researcher:event`. This matches the pattern
used by `task:submit` → `task:event` in the existing system. The IPC handler must not
`await` the full query completion — it spawns the query and returns the sessionId.

## InvokeChannelMap and EventChannelMap Additions

```typescript
// In src/shared/channels.ts — InvokeChannelMap additions:

[ResearcherChannels.query]: {
  args: [payload: ResearcherQueryPayload];
  result: { sessionId: string };
};
[ResearcherChannels.cancel]: {
  args: [sessionId: string];
  result: boolean;
};

// In src/shared/channels.ts — EventChannelMap additions:

[ResearcherChannels.event]: { data: ResearcherEvent };
```

## Shared Types

```typescript
// Additions to src/shared/types.ts

export interface ResearcherQueryPayload {
  prompt: string;
  providerId?: string;
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
}

export type ResearcherPhase = 'understanding' | 'planning' | 'researching' | 'composing';

export type ResearcherEvent =
  | { type: 'token';   token: string;                               sessionId: string }
  | { type: 'phase';   phase: ResearcherPhase;                      sessionId: string }
  | { type: 'done';    response: string; tokenCount: number;
      intent: string;  plan: string[];                               sessionId: string }
  | { type: 'error';   error: string; code: string;                 sessionId: string };
```

`ResearcherEvent` is parallel to `AgentStreamEvent` but includes `phase` and richer
`done` fields (intent, plan) so the renderer can render the reasoning trace.

## ResearcherIpc Module

```typescript
// src/main/ipc/researcher-ipc.ts

import { BrowserWindow } from 'electron';
import type { IpcModule } from './ipc-module';
import type { ServiceContainer } from '../core/service-container';
import type { EventBus } from '../core/event-bus';
import { registerCommand, registerCommandWithEvent } from './ipc-gateway';
import { ResearcherChannels } from '../../shared/channels';
import { randomUUID } from 'node:crypto';

export class ResearcherIpc implements IpcModule {
  readonly name = 'researcher';

  register(container: ServiceContainer, _eventBus: EventBus): void {
    const service = container.get<ResearcherService>('researcherService');
    const logger  = container.get<LoggerService>('logger');

    // --- researcher:query ---
    // Spawns the query async and returns sessionId immediately.
    // All events pushed via researcher:event.
    registerCommandWithEvent(ResearcherChannels.query, (event, payload) => {
      const sessionId = randomUUID();
      const senderWindow = BrowserWindow.fromWebContents(event.sender);
      const windowId = senderWindow?.id;

      service.query(payload.prompt, sessionId, {
        onToken: (token) => {
          senderWindow?.webContents.send(ResearcherChannels.event, {
            type: 'token', token, sessionId,
          });
        },
        onPhase: (phase) => {
          senderWindow?.webContents.send(ResearcherChannels.event, {
            type: 'phase', phase, sessionId,
          });
        },
        onDone: (result) => {
          senderWindow?.webContents.send(ResearcherChannels.event, {
            type: 'done',
            response: result.response,
            tokenCount: result.tokenCount,
            intent: result.intent,
            plan: result.plan,
            sessionId,
          });
        },
        onError: (error, code) => {
          senderWindow?.webContents.send(ResearcherChannels.event, {
            type: 'error', error, code, sessionId,
          });
        },
      }, payload).catch((err: unknown) => {
        logger.error('ResearcherIpc', `Unhandled error for session ${sessionId}`, err);
      });

      void windowId;  // captured but not needed for sendTo — we hold a direct ref
      return { sessionId };
    });

    // --- researcher:cancel ---
    registerCommand(ResearcherChannels.cancel, (sessionId: string) => {
      return service.cancel(sessionId);
    });

    logger.info('ResearcherIpc', 'Registered researcher module');
  }
}
```

**Why capture `senderWindow` directly vs. using `eventBus.sendTo(windowId)`?**
`eventBus.sendTo(windowId)` uses `BrowserWindow.fromId()` which requires the
Electron `BrowserWindow.id` (window integer). We capture `senderWindow` directly
from `event.sender` at IPC call time. This avoids a second lookup per token (which
is called ~100-1000 times during a single response), and guards against the window
being destroyed mid-stream via `senderWindow?.webContents.send` (optional chaining).

## Preload Bridge

### ResearcherApi interface (src/preload/index.d.ts addition)

```typescript
export interface ResearcherApi {
  /**
   * Start a researcher query. Returns the sessionId immediately.
   * Results arrive via onEvent callbacks.
   */
  query: (payload: ResearcherQueryPayload) => Promise<{ sessionId: string }>;
  /**
   * Cancel an in-progress query by sessionId.
   * Returns true if the session was found and cancelled.
   */
  cancel: (sessionId: string) => Promise<boolean>;
  /**
   * Subscribe to researcher stream events (token/phase/done/error).
   * Returns a cleanup function.
   */
  onEvent: (callback: (event: ResearcherEvent) => void) => () => void;
}

// In the Window augmentation block:
declare global {
  interface Window {
    app: AppApi;
    win?: WindowApi;
    workspace: WorkspaceApi;
    task: TaskApi;
    researcher: ResearcherApi;   // NEW
  }
}
```

### Preload implementation (src/preload/index.ts addition)

```typescript
import type { ResearcherApi } from './index.d';
import { ResearcherChannels } from '../shared/channels';

const researcher: ResearcherApi = {
  query: (payload) => typedInvokeUnwrap(ResearcherChannels.query, payload),
  cancel: (sessionId) => typedInvokeUnwrap(ResearcherChannels.cancel, sessionId),
  onEvent: (callback) => typedOn(ResearcherChannels.event, callback),
} satisfies ResearcherApi;

// In the contextBridge.exposeInMainWorld block:
contextBridge.exposeInMainWorld('researcher', researcher);
// In the globalThis fallback block:
globalThis.researcher = researcher;
```

`typedInvokeUnwrap` is used for both `query` and `cancel` because `ResearcherIpc`
registers them via `registerCommand`/`registerCommandWithEvent`, which wraps handlers
in `wrapSimpleHandler`/`wrapIpcHandler` — both of which return `IpcResult<T>`.
`typedInvokeUnwrap` unwraps `IpcResult<T>` and throws on failure, matching the pattern
all other commands use.

## Bootstrap Integration

### In bootstrapServices() (src/main/bootstrap.ts)

```typescript
import { ResearcherService } from './ai/researcher/researcher-service';

// After providerResolver is created:
container.register(
  'researcherService',
  new ResearcherService(providerResolver, logger)
);
```

`ResearcherService` takes `ProviderResolver` (already instantiated for AgentTaskHandler)
and the shared `LoggerService`. No new dependencies needed.

### In bootstrapIpcModules() (src/main/bootstrap.ts)

```typescript
import { ResearcherIpc } from './ipc/researcher-ipc';

const ipcModules: IpcModule[] = [
  new AppIpc(),
  new WorkspaceIpc(),
  new TaskManagerIpc(),
  new WindowIpc(),
  new ResearcherIpc(),   // NEW
];
```

### In src/main/ipc/index.ts

```typescript
export { ResearcherIpc } from './researcher-ipc';
```

## Renderer Usage Pattern

```typescript
// In a React component or hook:

const sessionRef = useRef<string | null>(null);

useEffect(() => {
  const unsubscribe = window.researcher.onEvent((event) => {
    switch (event.type) {
      case 'token':
        if (event.sessionId === sessionRef.current) {
          appendToken(event.token);
        }
        break;
      case 'phase':
        setPhase(event.phase);
        break;
      case 'done':
        setDone({ response: event.response, intent: event.intent, plan: event.plan });
        break;
      case 'error':
        setError(event.error);
        break;
    }
  });
  return unsubscribe;
}, []);

async function submitQuery(prompt: string) {
  const { sessionId } = await window.researcher.query({ prompt });
  sessionRef.current = sessionId;
}

function cancelQuery() {
  if (sessionRef.current) {
    void window.researcher.cancel(sessionRef.current);
  }
}
```

**Session ID filtering**: because `researcher:event` broadcasts to all listeners on the
channel, the renderer must filter by `sessionId` to ignore events from other concurrent
queries (e.g. if the user opens two researcher panels). The `useRef` approach above is
the minimal pattern; a reducer map keyed by sessionId is appropriate for multi-panel UIs.

## Temperature Constants

Define as named constants in `researcher-service.ts` (not magic numbers, per SonarQube rules):

```typescript
const UNDERSTAND_TEMPERATURE = 0.1;  // deterministic intent classification
const PLAN_TEMPERATURE       = 0.2;  // structured plan output
const RESEARCH_TEMPERATURE   = 0.3;  // grounded synthesis
const COMPOSE_TEMPERATURE    = 0.7;  // fluent prose generation (overridable)
```

## Error Handling Strategy

- `classifyError` from `src/main/shared/ai-utils.ts` classifies abort/auth/rate_limit/unknown
- Abort: detected via `controller.signal.aborted` in the stream loop; fires `onError` with `code: 'abort'`
- Auth/rate_limit: caught in try/catch around the graph stream; fires `onError` with user-friendly message via `toUserMessage`
- Session not found for cancel: returns `false` (not an error — idempotent)
- Concurrent cancellation (cancel called while query is setting up): safe because `AbortController.abort()` is idempotent

## Window Cleanup

In `ResearcherIpc.register()`, subscribe to `window:closed` via `eventBus`:

```typescript
eventBus.on('window:closed', (event) => {
  const { windowId } = event.payload as { windowId: number };
  // Cancel all sessions owned by the closing window
  // Requires ResearcherService to track sessionId → windowId
  service.cancelByWindow(windowId);
});
```

This requires adding `sessionId → windowId` tracking in `ResearcherService.sessions`
(change type from `Map<string, AbortController>` to `Map<string, { controller: AbortController; windowId?: number }>`).

**Why:** Without this, a user closing a window while a query is in-flight leaves an
orphaned async generator consuming API quota with no destination for its events.
This mirrors the `executor.cancelByWindow(windowId)` pattern in `TaskManagerIpc`.
