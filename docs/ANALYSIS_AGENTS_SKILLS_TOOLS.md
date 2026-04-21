# OpenClaw — Agents, Skills, and Tools

Analysis of how OpenClaw implements and uses the three core runtime pillars:
**agents** (configured AI runtimes), **skills** (packaged workflows the agent
can follow), and **tools** (executable capabilities the agent can call).

All file references are repo-root relative per `CLAUDE.md`.

---

## 1. Agents

### 1.1 Definition

An **agent** in OpenClaw is an invocable AI runtime identified by an
`agentId`. An agent binds together:

- a workspace directory and a session key (`agent:<id>:...`)
- one or more **auth profiles** (provider credentials)
- a **model** selection (e.g. `claude-3.5-sonnet`, `gpt-5.4`)
- a **skills filter** controlling which skills are exposed to it
- optional **ACP** (Agent Control Plane) subagent spawning

An agent is not a hard-coded persona — it is a configuration + runtime
contract assembled from `openclaw.json`, provider plugins, and the skill
catalog at invocation time.

### 1.2 Core modules (`src/agents/`)

| Module | File | Responsibility |
|---|---|---|
| Agent command (CLI) | `src/agents/agent-command.ts` | Orchestrates one agent turn: resolves config → auth → model → skills → tools → executes. |
| Agent scope | `src/agents/agent-scope.ts` | Resolves `agentId` from session key or config; returns the effective skill filter and default model. |
| Runtime config | `src/agents/agent-runtime-config.ts` | Loads OpenClaw config, resolves secret refs, layers per-agent overrides. |
| Agent paths | `src/agents/agent-paths.ts` | Workspace + state file layout (`~/.openclaw/agents/<agentId>/...`). |
| ACP spawn | `src/agents/acp-spawn.ts`, `src/agents/acp-spawn-parent-stream.ts` | Spawns isolated child-agent sessions over the Agent Control Plane; wires heartbeats, delivery context, parent↔child streams. |
| Auth profiles | `src/agents/auth-profiles.ts` + `src/agents/auth-profiles/` | Credential store, cooldown, usage tracking, per-provider rotation (`api-key-rotation.ts`). |
| Bash tools | `src/agents/bash-tools.ts`, `src/agents/bash-tools.exec-approval-request.ts` | Sandboxed shell exec + background process registry with approval prompts. |
| Apply patch | `src/agents/apply-patch.ts`, `src/agents/apply-patch-update.ts` | Safe read/write/delete/move within the workspace boundary via unified-diff parsing. |
| Payload logging | `src/agents/anthropic-payload-log.ts`, `…-policy.ts` | Redaction + policy for recorded provider payloads. |
| Transport streams | `src/agents/anthropic-transport-stream.ts`, `…-vertex-stream.ts` | Provider-specific streaming adapters used by the inference loop. |

### 1.3 Invocation flow

```text
openclaw agent --to <recipient> --message "..."
  │
  ▼
src/cli/program/register.agent.ts     ── CLI registration
  │
  ▼
src/agents/agent-command.ts
  ├─ resolveAgentRuntimeConfig()      ── agent-runtime-config.ts
  ├─ resolveSessionAgentId()          ── agent-scope.ts
  ├─ resolveAgentSkillsFilter()       ── agent-scope.ts
  ├─ resolveDefaultModelForAgent()    ── agent-scope.ts
  ├─ auth-profiles.ts  → provider credentials
  ├─ plugins registry  → provider + tools
  └─ run inference loop + tool dispatch
```

Subagents use the same pipeline through `spawnAcpAgent` in
`src/agents/acp-spawn.ts`, which establishes a child session keyed
`agent:<childId>:<parentSessionKey>` and binds its output stream back to
the parent via `acp-spawn-parent-stream.ts`.

### 1.4 Provider integration

Core stays provider-agnostic. Each provider lives as a bundled plugin
under `extensions/` (e.g. `extensions/anthropic`, `extensions/openai`,
`extensions/amazon-bedrock`) and contributes:

- `openclaw.plugin.json` — manifest (provider id, model prefixes, auth env vars)
- `register.runtime.ts` — lazy runtime entry that constructs the provider
- `api.ts` / `runtime-api.ts` — public barrels consumable from core

Agents select a provider implicitly by model prefix (`claude-` →
`extensions/anthropic`, `gpt-` → `extensions/openai`, etc.), enforced by
the plugin registry in `src/plugins/`.

### 1.5 Scoped rules (`src/agents/AGENTS.md`)

- Agent tests must avoid cold-loading bundled plugin/channel runtime for
  static discovery — use lightweight typed artifacts + DI.
- Routing/normalization in spawn/session logic stays deterministic and
  runtime-free.
- Profile any hot-path change with the import-time test harness
  (`pnpm test:perf:imports`).

---

## 2. Skills

### 2.1 Definition

A **skill** is a self-contained, portable package describing a workflow
an agent can follow. Skills live at repo root under `skills/` and are
synced into an agent's workspace at invocation time.

Format:

```text
skills/<name>/
├── SKILL.md          # YAML frontmatter + Markdown workflow (required)
├── scripts/          # Executable helpers (bash/python/node)
├── references/       # On-demand schemas, docs, cheatsheets
└── assets/           # Templates, icons, fonts, fixtures
```

`SKILL.md` frontmatter declares name, description, and optional
`metadata.openclaw` block (emoji, required binaries, install hints):

```yaml
---
name: github
description: "GitHub ops via `gh` CLI — issues, PRs, CI runs, code review."
metadata:
  openclaw:
    emoji: "🐙"
    requires: { bins: ["gh"] }
    install:
      - { kind: "brew", formula: "gh", bins: ["gh"] }
---
```

### 2.2 Bundled skill catalog (`skills/`)

The repo ships with a large catalog covering:

- **Dev tools** — `github`, `gh-issues`, `tmux`, `obsidian`, `notion`,
  `trello`, `things-mac`
- **Messaging / calls** — `slack`, `discord`, `bluebubbles`, `imsg`,
  `voice-call`, `wacli`
- **Media & OS** — `apple-notes`, `apple-reminders`, `bear-notes`,
  `camsnap`, `peekaboo`, `video-frames`, `nano-pdf`, `openai-whisper`,
  `sherpa-onnx-tts`
- **Orchestration / agentic** — `taskflow`, `taskflow-inbox-triage`,
  `coding-agent`, `session-logs`, `summarize`, `model-usage`
- **Infra / secrets** — `1password`, `oracle`, `healthcheck`,
  `node-connect`, `mcporter`
- **Meta** — `skill-creator` (authoring guide for new skills)

### 2.3 Discovery, loading, sync

Skills are resolved in three layers:

1. **Bundled** — under repo `skills/` (shipped with OpenClaw).
2. **User / workspace** — `~/.openclaw/agents/<agentId>/workspace/skills/`.
3. **Plugin-contributed** — skills shipped inside an extension.

At agent start, `agent-command.ts`:

```ts
const entries       = loadWorkspaceSkillEntries(config);
const agentSkills   = resolveEffectiveAgentSkillFilter(config, agentId);
const skillsPrompt  = buildWorkspaceSkillsPrompt(entries, agentId);
await syncSkillsToWorkspace({ entries, workspaceDir });
```

The prompt lists available skills so the model can select one; the sync
step hard-links or copies the skill folder into the agent workspace so
scripts can be exec'd by the `bash` tool.

The CLI front door is `openclaw skills` (see `src/cli/skills-cli.ts`):
`install`, `list`, `refresh`.

### 2.4 `skill-creator` meta-skill

`skills/skill-creator/SKILL.md` defines the authoring contract for
skills themselves:

- keep `SKILL.md` procedural and concise (context-budget aware)
- push detail into `references/` (loaded lazily) and outputs into `assets/`
- declare required binaries + install hints in frontmatter
- prefer matching the reader's degrees-of-freedom over exhaustive enumeration

---

## 3. Tools

### 3.1 Built-in tools (`src/agents/`)

| Tool | File | Purpose |
|---|---|---|
| `exec` | `src/agents/bash-tools.exec-approval-request.ts`, `bash-tools.exec-approval-followup.ts` | One-shot shell exec with sandbox, approval UX, signal handling. |
| `process` | `src/agents/bash-process-registry.ts` | Background processes — spawn, list, signal, reap. |
| `apply_patch` | `src/agents/apply-patch.ts` | Diff-based file read/write/delete/move inside workspace root. |
| `web_fetch` | `src/web-fetch/` | Fetch + parse URLs; provider-extensible fallback chain. |
| `web_search` | `src/web-search/` | Search providers (Brave, Exa, DuckDuckGo, Tavily, Perplexity, SearxNG). |
| `cron` | `src/cron/` | Schedule async tasks, retries, backoff. |
| `canvas` | `src/canvas-host/` | Structured rich output (tables, code, markdown) to the gateway. |
| `mcp` | `src/mcp/` | Bridge to Model Context Protocol servers (inbound + outbound). |

### 3.2 Tool contract (`src/agents/tools/common.ts`)

```ts
export interface AgentToolWithMeta<I, O> {
  name: string;
  description: string;
  inputSchema: TSchema;           // TypeBox
  ownerOnly?: boolean;            // owner-sender restriction
  displaySummary?: string;
  execute(params: Record<string, unknown>): Promise<AgentToolResult<O>>;
}

export class ToolInputError         extends Error { status = 400; }
export class ToolAuthorizationError extends Error { status = 403; }
```

Tools are registered into a per-agent tool set by the plugin loader and
the agent-runtime config. Provider-facing schemas prefer flat string
enums over `Type.Union([Type.Literal(...)])` — some providers reject
generated `anyOf` (see `CLAUDE.md` → Misc Footguns).

### 3.3 Provider-contributed tools

Provider extensions expose provider-specific capabilities (e.g. image
generation, file upload, code-interpreter) through their
`register.runtime.ts`. The manifest declares model prefixes and auth env
vars; the runtime registers tools into the plugin registry on first use:

```json
{
  "id": "anthropic",
  "providers": ["anthropic"],
  "modelSupport": { "modelPrefixes": ["claude-"] },
  "providerAuthEnvVars": {
    "anthropic": ["ANTHROPIC_OAUTH_TOKEN", "ANTHROPIC_API_KEY"]
  }
}
```

### 3.4 MCP bridge (`src/mcp/`)

OpenClaw plays both sides of Model Context Protocol:

- **Serve** — `src/mcp/plugin-tools-serve.ts` exposes plugin-registered
  tools over stdio as an MCP server; external MCP clients can then call
  OpenClaw plugin tools.
- **Consume** — MCP client code in `src/mcp/` lets the agent attach to
  external MCP servers and surface their tools into the per-turn toolset.

```ts
const server = createPluginToolsMcpServer({ config, tools });
server.setRequestHandler(ListToolsRequestSchema, handlers.listTools);
server.setRequestHandler(CallToolRequestSchema,  handlers.callTool);
await server.connect(new StdioServerTransport());
```

---

## 4. Plugin system (the glue)

### 4.1 Plugin SDK (`src/plugin-sdk/`)

Public contract every plugin imports from `openclaw/plugin-sdk/*`:

- `entrypoints.ts` — cheap, lazy entry facades
- `core.ts` — shared types (provider, channel, tool, session)
- `provider-entry.ts` — provider plugin contract
- `AGENTS.md` — rules: cheap entrypoints, acyclic facades, no deep
  `src/**` imports from plugins

### 4.2 Plugin loader (`src/plugins/`)

Manifest-first registry:

1. Discover `openclaw.plugin.json` manifests (bundled + installed).
2. Validate against the SDK schema.
3. Build a lazy registry — runtime code loads only on first use.
4. Resolve tools/providers/channels for an agent turn.

### 4.3 Extensions (`extensions/`)

Each extension is a self-contained plugin: provider (Anthropic, OpenAI,
Google, Bedrock, Groq, Mistral, xAI, Ollama, …), channel (Telegram,
Slack, Discord, Matrix, iMessage, WhatsApp, …), or capability
(`browser`, `memory-core`, `memory-lancedb`, `webhooks`,
`image-generation-core`).

Rule (`extensions/AGENTS.md`): extensions own their auth, onboarding,
catalog, and vendor-specific behavior; core must remain
extension-agnostic.

### 4.4 Gateway protocol (`src/gateway/protocol/`)

The gateway is the wire between operator devices (macOS app, CLI) and
agent runtimes. Tool invocations and streamed responses cross the
gateway; protocol changes are contract changes — additive first,
versioned if breaking.

---

## 5. CLI surface (`src/cli/`)

| Command | Handler | Role |
|---|---|---|
| `openclaw agent` | `src/cli/program/register.agent.ts` | Run one agent turn (local or via gateway). |
| `openclaw agents` | `src/cli/program/register.agent.ts` | List / add / bind / identify agents. |
| `openclaw skills` | `src/cli/skills-cli.ts` | Install, list, refresh skills. |
| `openclaw plugins` | `src/cli/plugins-cli.ts` | Install / list / update / uninstall plugins. |
| `openclaw gateway` | `src/cli/gateway-*.ts` | Start/stop/status the mac gateway. |
| `openclaw doctor` | `src/cli/doctor-*.ts` | Diagnose config/auth/migration issues. |

Example:

```bash
openclaw agent --to +15555550123 \
  --message "status update" \
  --thinking medium --deliver
```

---

## 6. Scoped `AGENTS.md` map

| File | Subject |
|---|---|
| `AGENTS.md` (root) | Telegraph-style root rules; delegates to scoped guides. |
| `src/agents/AGENTS.md` | Agent import/test perf, deterministic routing. |
| `src/plugin-sdk/AGENTS.md` | Public SDK contract, cheap entrypoints. |
| `src/plugins/AGENTS.md` | Plugin loader/registry rules. |
| `src/channels/AGENTS.md` | Channel core rules. |
| `src/gateway/AGENTS.md`, `src/gateway/protocol/AGENTS.md` | Gateway wire + protocol. |
| `extensions/AGENTS.md` | Bundled plugin boundary. |
| `test/helpers/AGENTS.md`, `test/helpers/channels/AGENTS.md` | Shared test helpers. |
| `docs/AGENTS.md`, `ui/AGENTS.md`, `scripts/AGENTS.md` | Docs / UI / scripts. |

Rule from root `AGENTS.md`: any new `AGENTS.md` must have a sibling
`CLAUDE.md` symlink next to it.

---

## 7. Architecture summary

```text
┌──────────────────────── operator (CLI / mac app / IDE) ─────────────────────┐
│                                                                             │
│  openclaw agent  ─►  src/cli/program/register.agent.ts                     │
│                                                                             │
├──────────────────────── gateway (src/gateway) ──────────────────────────────┤
│  wire protocol: tool calls, streams, session binding                        │
├──────────────────────── agent runtime (src/agents) ─────────────────────────┤
│  agent-command  →  agent-scope  →  runtime-config  →  auth-profiles        │
│         │                                                                   │
│         ├─ tools:  bash-tools, apply-patch, web-fetch, web-search, mcp     │
│         ├─ skills: loadWorkspaceSkillEntries → syncSkillsToWorkspace       │
│         └─ acp-spawn: isolated subagents                                   │
├──────────────────────── plugin SDK (src/plugin-sdk) ────────────────────────┤
│  public contract: entrypoints, core types, provider-entry                   │
├──────────────────────── extensions (extensions/) ───────────────────────────┤
│  providers  — anthropic, openai, google, bedrock, groq, ollama, …          │
│  channels   — telegram, slack, discord, matrix, imessage, whatsapp, …      │
│  capabilities — browser, memory-core, webhooks, image-generation-core, …   │
└─────────────────────────────────────────────────────────────────────────────┘
```

The three pillars are cleanly separated:

- **Agents** = runtime + routing + config
- **Skills** = packaged, portable workflows synced into the agent workspace
- **Tools** = schema-validated capabilities (built-in, plugin, or MCP)

The plugin SDK and `extensions/` boundary keep the core
extension-agnostic; the gateway protocol is the stable wire between
operator surfaces and agent runtimes.
