# Permissions And Security

Extensions run code. OpenWriter limits what that code can reach. This
doc describes the permission model, the process boundary, and the
threat model.

## Permission Model

### Declaration

Extensions declare required permissions in the manifest:

```json
"permissions": ["app.read", "workspace.read", "document.read", "document.write"]
```

### Enforcement

`ExtensionApiGateway` in the main process checks every host call
against the manifest's permission list. A call without a declared
permission throws before any side effect runs:

```
Error: Extension "<id>" does not have permission "<perm>".
```

### The Full Permission Set

```
app.read            — read app identity (name, version, platform)
app.write           — (reserved) modify app-level settings
workspace.read      — read current workspace snapshot
workspace.write     — (reserved) change workspace settings
document.read       — read document snapshots & context
document.write      — update document title / content
task.submit         — submit tasks to the executor
task.observe        — subscribe to task events
```

`task.observe` is granted implicitly via event subscriptions when the
manifest includes it; the runtime filters events before dispatching.

### Capabilities Are Metadata

`capabilities` is a coarse tag list (`commands`, `host-data`, etc.)
advertised to the user and shown in Settings. It is **not** checked at
call time. `permissions` is the enforcement surface.

### Missing Permissions Fail Closed

The gateway does not prompt or escalate. A missing permission is a
configuration error — the extension is asking for something it never
declared. The fix is to bump the manifest and reload.

## Process Boundary

### One Extension = One Utility Process

Every enabled extension spawns its own Node utility process. That
process:

- has no direct access to the Electron main or renderer processes
- has no preload script, no `contextBridge`
- cannot attach to `BrowserWindow` or any of its APIs
- cannot use Electron's `ipcMain` / `ipcRenderer`
- communicates only via the runtime's typed message protocol
  (`MainToExtensionHostMessage` / `ExtensionHostToMainMessage`)

```
┌─── main ────┐    typed messages    ┌─── util process ───┐
│ ExtApiGateway │  <────────────>  │ ExtensionHostRuntime │
└───────────────┘                   └──────────────────────┘
```

### Why Utility Process, Not Worker Thread

Utility processes are fault-isolated at the OS level. A crash or busy
loop can be observed and killed without affecting the main app. Worker
threads share the V8 isolate and can still hang the event loop.

## Data Isolation

### Per-Extension Storage

`ctx.storage.*` maps to
`<userData>/extensions-data/<extensionId>/<key>`. Namespaces are:

- separated by extension id
- not readable by other extensions
- not exposed to the renderer

### No Privileged Filesystem API

The host runtime does not expose `fs`, `path`, or any Node filesystem
API to extension code in a privileged way. An extension can `import`
Node modules (it is Node) but:

- the utility process has the same filesystem privileges as the user
  running OpenWriter
- document writes should go through `documents.update` to keep the
  file-mutation queue consistent
- arbitrary filesystem writes outside the workspace are possible in
  principle — users should treat extensions as trusted code

### Credentials

- Provider API keys live in the main-process `StoreService` and are
  never sent over the extension channel.
- When an extension submits an agent task, the main process resolves
  the key from the user's settings and uses it server-side.
- Extensions cannot enumerate configured services.

## What Extensions Still Can Do

Honest about the trust model:

- An extension **is** Node code. It can:
  - make arbitrary outbound HTTP requests
  - read/write files the user can read/write
  - run heavy CPU in its own process
  - run child processes (spawn, exec) — this is not blocked today
- Extensions are therefore **trusted-by-install**. Bundled extensions
  ship with the app and are audited upstream; user-installed
  extensions are the user's responsibility.

## Threat Model

Risks and mitigations:

| Risk | Mitigation |
| --- | --- |
| Buggy extension corrupts a document | Writes go through the file-mutation queue; undo history keeps prior state; atomic writes prevent partial-file states |
| Misbehaving extension spikes CPU | Isolated utility process; Settings shows crash/restart counts; user can disable |
| Extension leaks a token in logs | Extension authors must not log secrets; the logger is plain text, no redaction |
| Extension reads another extension's storage | Storage paths are namespaced; no API exposes cross-extension keys |
| Extension escalates to main/renderer | No shared memory, no IPC primitives. All access is typed messages through the gateway |
| Renderer-delivered payloads reach main privileges directly | The renderer can only invoke IPC channels documented in `src/shared/channels.ts`; extension commands are identified by id and routed, never paths |

## Runtime State Observability

Settings → Extensions shows, per extension:

- `status` (idle / starting / running / stopped / crashed / invalid)
- `crashCount` + `lastError`
- `registeredCommands` and `registeredDocPanels`
- `activated` flag
- `startedAt` timestamp

A `crashed` extension does not auto-restart; the user explicitly
re-enables.

## Reviewing A Third-Party Extension

Before installing an extension you didn't write:

1. Read the manifest. Does the capabilities/permissions list match
   what the README claims?
2. Read the compiled entry (`dist/index.js`). It should be readable —
   extensions are not typically obfuscated.
3. Look for outbound HTTP calls, filesystem writes outside the
   workspace, and calls to `child_process`.
4. Note what the extension stores (`ctx.storage.set` calls). Tokens?
   User data?

If any of this looks wrong, don't install.

## Future Hardening

Planned, not implemented:

- Network allow-list declared in the manifest.
- `child_process` disabled by default, opt-in via capability.
- Cryptographic signing of manifests and entries.
- A generic "Extension settings" UI that surfaces declared config
  fields so users don't hand-type JSON payloads.
