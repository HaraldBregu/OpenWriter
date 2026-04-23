# Settings And Providers

All persistent user configuration lives in **Settings**. Stored locally
via `electron-store`; never leaves the machine.

## Settings Pages

Route: `/settings/*`. Pages live under `src/renderer/src/pages/settings/pages/`.

| Page | Purpose |
| --- | --- |
| General | Language, app-wide switches |
| Workspace | Project name, description, recent workspaces |
| Providers | API keys for OpenAI / Anthropic / … |
| Models | Catalog of available models, per-provider |
| Agents | Per-agent default text/image model |
| Skill | Install / import / delete user skills |
| Themes | Light / dark mode, custom themes |
| Editor | Editor preferences |
| System | Runtime info (versions, paths) |
| Developer | Debug-oriented controls |
| Extensions | Enable / disable installed extensions |

## Providers

A **provider** is the vendor of an LLM service. The shipped catalog
(`src/shared/providers.ts`) currently includes:

- `openai` — OpenAI
- `anthropic` — Anthropic

Additional providers can be added by extending the catalog. The
contract is minimal — an `id` and a `name`.

### Services

A **service** is a provider + API key pair. One provider can have
multiple services (e.g. personal + work API keys). Each service gets a
stable derived ID (`createServiceId`) so multiple configurations of the
same provider don't clash.

Services are stored under the `services` array in the settings store.
At least one service must exist for the app to move past first-run
configuration.

### API Key Handling

Keys are stored with `electron-store` in the standard app data
directory. They are never logged. Errors from providers sanitize the
key out of reported messages.

## Models

Registered in `src/shared/models.ts`. Each model is a `ModelInfo`:

```ts
{
  providerId: 'openai',
  modelId: 'gpt-5.4',
  name: 'GPT-5.4',
  type: 'multimodal',
  contextWindow: 1050000,
  maxOutputTokens: 128000,
}
```

Types: `text`, `multimodal`, `reasoning`, `image`, `embedding`, `audio`,
`code`, `ocr`.

Defaults (tunable):

| Purpose | Default model |
| --- | --- |
| Text | `gpt-4.1` |
| Embedding | `text-embedding-3-small` |
| Image | `gpt-image-1` |
| Transcription | `whisper-1` |
| OCR | _none — user picks_ |

Pre-filtered collections exported for UI:

- `TEXT_MODELS` — text / multimodal / code
- `IMAGE_MODELS` — image-only
- `OCR_MODELS` — OCR-only
- `AUDIO_MODELS` — audio

### Reasoning Models

Models of type `reasoning` (o1, o3, o4-mini, etc.) skip the
`temperature` parameter automatically — OpenWriter detects them with
`isReasoningModel(modelId)` and omits unsupported fields at call time.

## Agents

Each agent has a settings entry:

```ts
{
  id: 'assistant',
  name: 'Assistant Agent',
  models: {
    text: 'gpt-4.1',
    image: 'gpt-image-1',
  },
}
```

- The **Agents page** lets the user change which model each agent uses
  for text and (where relevant) image generation.
- The **AgentTaskHandler** reads this config at submit time and
  resolves `providerId` / `apiKey` / `modelName` unless the caller
  supplied them explicitly.

## Language

`react-i18next` with `i18next` under the hood.

Available languages:

- `en` — English
- `it` — Italian

Resource files: `resources/i18n/`. The active language is persisted in
settings; the app updates live when the user switches.

## Themes

Light / dark with automatic system detection. Custom themes can be
installed via the Themes page (optional; not required for normal use).

Under the hood:

- `ThemeService` (main process) tracks the OS theme preference
- `ThemeProvider` (renderer context) exposes the current theme to
  components
- Tailwind CSS variables switch based on the `class="dark"` attribute

## Startup Info

The **AppStartupInfo** record, returned by `window.app.getStartupInfo()`
on launch, includes:

- `startupCount` — how many times the app has been opened
- `isFirstRun` — true only on the very first launch
- `isInitialized` — false until the user has completed configuration

The renderer gates routing on these flags (see `App.tsx`).

## Keyboard Shortcuts

Shortcut IDs live in `src/shared/shortcuts.ts`. Actions include:

- Toggle sidebar
- Open prompt
- Submit prompt
- Undo/Redo (editor-scoped)

Shortcuts bind in the main process where needed (e.g. global shortcuts
for window actions) and in the renderer for editor actions.

## Where Settings Live On Disk

- macOS: `~/Library/Application Support/OpenWriter/`
- Windows: `%AppData%/OpenWriter/`
- Linux: `~/.config/OpenWriter/`

Files:

- `config.json` — the main settings (services, agents, recent
  workspaces, startup count, etc.)
- `logs/` — app logs captured by `LoggerService`
- `skills/` — user-installed skills (managed by `SkillsStoreService`)

## Reset / Clean Install

`yarn clean` removes build artefacts. Resetting user data is a manual
step — delete the application data folder listed above.

There is no "factory reset" button in the app UI.
