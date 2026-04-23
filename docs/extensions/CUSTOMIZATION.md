# Customization — Tokens, Data, Configuration

Extensions often need user-specific inputs:

- API tokens for a third-party service
- Endpoint URLs
- Feature toggles
- User data (names, defaults, preferences)

OpenWriter does not (yet) render a generic "extension settings" page.
Configuration is driven through a few composable pieces the extension
itself wires together.

## The Customization Primitives

| Primitive | Purpose |
| --- | --- |
| **Extension storage** (`ctx.storage`) | Persistent key/value per extension |
| **Commands** | Named actions the user or UI can invoke |
| **Doc-panel blocks** | The extension's own configuration UI |
| **Activation events** | Ensure the extension is running when config is touched |

Combining them gives a configuration workflow the user can discover and
control without any special UI framework.

## Pattern 1 — Token Required At First Use

Goal: the extension needs `GITHUB_TOKEN`, asks for it once, stores it,
and reuses it after that.

```ts
interface Config { githubToken: string | null; }

async function readConfig(ctx: ExtensionContext): Promise<Config> {
  return (await ctx.storage.get<Config>('config')) ?? { githubToken: null };
}

async function writeConfig(ctx: ExtensionContext, patch: Partial<Config>) {
  const prev = await readConfig(ctx);
  const next = { ...prev, ...patch };
  await ctx.storage.set('config', next);
  return next;
}

export default defineExtension({
  async activate(ctx) {
    ctx.commands.register({
      id: 'my-ext.set-token',
      title: 'My Ext: Set GitHub token',
      description: 'Persist a GitHub token for API calls.',
      async run(payload) {
        const token =
          payload && typeof payload === 'object' && typeof (payload as any).token === 'string'
            ? (payload as any).token
            : '';
        if (!token) throw new Error('Token is required.');
        await writeConfig(ctx, { githubToken: token });
        return { ok: true };
      },
    });

    ctx.commands.register({
      id: 'my-ext.clear-token',
      title: 'My Ext: Clear GitHub token',
      description: 'Forget the stored GitHub token.',
      async run() {
        await writeConfig(ctx, { githubToken: null });
      },
    });

    ctx.panels.registerDocPanel({
      id: 'my-ext.config',
      async render() {
        const config = await readConfig(ctx);
        if (config.githubToken) {
          return {
            blocks: [
              {
                type: 'notice',
                tone: 'success',
                title: 'GitHub token configured',
                description: 'API calls are ready.',
              },
              {
                type: 'buttonRow',
                buttons: [
                  { id: 'clear', label: 'Clear token', commandId: 'my-ext.clear-token', variant: 'ghost' },
                ],
              },
            ],
          };
        }
        return {
          blocks: [
            {
              type: 'notice',
              tone: 'warning',
              title: 'GitHub token required',
              description: 'Run the "My Ext: Set GitHub token" command to provide one.',
            },
          ],
        };
      },
    });
  },
});
```

The user runs the `set-token` command (via command surface) with a
payload they've entered, and the extension persists it. No special
settings UI needed.

## Pattern 2 — Structured Config Via A Single Command

Some extensions need multi-field config. Ship **one** command that
takes a JSON payload and validates it:

```ts
ctx.commands.register({
  id: 'my-ext.configure',
  title: 'My Ext: Configure',
  description: 'Update extension configuration. Pass { endpoint, token, model }.',
  async run(payload) {
    const input = payload as { endpoint?: string; token?: string; model?: string } | undefined;
    if (!input) throw new Error('No payload.');
    const next: Config = {
      endpoint: input.endpoint?.trim() || 'https://default.example.com',
      token: input.token?.trim() || null,
      model: input.model?.trim() || 'default',
    };
    await ctx.storage.set('config', next);
    return next;
  },
});
```

Users (or other extensions, or scripts) invoke `my-ext.configure` with
the desired payload. The doc-panel surfaces the current state so the
user can see what's active.

## Pattern 3 — Per-Document Overrides

Store overrides keyed by document id:

```ts
const key = (docId: string) => `override::${docId}`;

await ctx.storage.set(key(documentId), { targetLanguage: 'it' });
const override = await ctx.storage.get<{ targetLanguage?: string }>(key(documentId));
```

Combine with `ctx.events.onDocumentChanged` to react when a document
switches and fetch its overrides.

## Pattern 4 — Using App-Configured Providers

When the extension needs to run an agent, it does **not** need its own
API key for the provider — the task handler injects whichever provider
and model the user has configured for the target agent.

```ts
await ctx.host.tasks.submit({
  type: 'agent',
  input: {
    agentType: 'writer',
    input: { prompt: 'Draft a summary of the current document.' },
  },
});
```

The writer agent's configured model (from Settings → Agents) is used.
The API key is pulled from the corresponding service in the user's
store. The extension never sees the credentials.

### Overriding Model Per Call

If the extension wants to force a specific model/provider for this
call, it can pass them through the agent input:

```ts
await ctx.host.tasks.submit({
  type: 'agent',
  input: {
    agentType: 'writer',
    input: {
      prompt: '...',
      modelName: 'gpt-5.4-mini',
      // providerId / apiKey optional; if omitted they're resolved from the model's provider
    },
  },
});
```

The user must still have a configured service for that provider; the
gateway does not supply keys from nowhere.

## Pattern 5 — Data Imports

To let a user bring arbitrary data (a JSON file, a CSV, etc.) into the
extension:

1. Register a command like `my-ext.import-data`.
2. Ask the user to pass the data as a `payload` string or object.
3. Parse + validate inside the command.
4. Persist in `ctx.storage`.

The extension never reads the filesystem directly — the user (or a
wrapper command) supplies the content as a payload.

## Security Guidance

- **Treat storage as confidential**. Tokens live inside the app's user
  data directory. Don't log token contents, and strip them from any
  `ctx.log.*` calls.
- **Validate every payload**. Commands are reachable from any wrapper
  UI. Always type-guard the payload shape before using it.
- **Fail closed on missing config**. If required config is missing,
  return a `notice` block telling the user what to do — don't call
  external services with empty credentials.

## What Is Not Yet Built

- A generic "Extension Settings" UI that lets users fill in fields
  declared in the manifest.
- A cross-process secure store for tokens (they currently live in the
  same kv namespace as other data).
- Per-workspace automatic storage isolation.

These are planned and the interfaces on this page are designed to be
forward-compatible with them.
