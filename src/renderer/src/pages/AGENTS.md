# Renderer Pages Guide

## Purpose

`src/renderer/src/pages` is the route-level feature area for the OpenWriter renderer.

This folder owns:

- page entrypoints used by React Router
- route-scoped feature folders
- page-local orchestration, layout, and state wiring
- page-only components, hooks, providers, services, and helpers

This folder is not the place for global renderer infrastructure.
Shared UI belongs in `src/renderer/src/components`.
Cross-app providers belong in `src/renderer/src/contexts`.
Redux state belongs in `src/renderer/src/store`.
Renderer-wide services belong in `src/renderer/src/services`.

Use this folder for code that is primarily owned by one route or one small route family.

## Current Structure

```text
src/renderer/src/pages/
  AGENTS.md
  HomePage.tsx
  WelcomePage.tsx
  agents/
    AgentsPage.tsx
  debug/
    DebugPage.tsx
    DebugReduxPage.tsx
    DebugTasksPage.tsx
    LogPanel.tsx
    ProgressBar.tsx
    ReduxStateTab.tsx
    SliceSection.tsx
    StatusBadge.tsx
    TaskRow.tsx
    TasksTab.tsx
    debug-constants.ts
    debug-helpers.ts
  document/
    AGENTS.md
    Page.tsx
    Layout.tsx
    Header.tsx
    components/
      HistoryMenu.tsx
    context/
      actions.ts
      index.ts
      reducer.ts
      state.ts
    hooks/
      index.ts
      use-document-actions.ts
      use-document-dispatch.ts
      use-document-history.ts
      use-document-persistence.ts
      use-document-state.ts
      use-document-ui.ts
    panels/
      chat/
        Provider.tsx
        index.tsx
        components/
          header.tsx
          index.ts
          input.tsx
          message.tsx
        context/
          actions.ts
          contexts.ts
          index.ts
          reducer.ts
          state.ts
        hooks/
          index.ts
          use-chat-dispatch.ts
          use-chat-state.ts
      resources/
        ResourcesPanel.tsx
    providers/
      Document.tsx
      Editor.tsx
      Sidebar.tsx
      index.ts
    services/
      chat-session-storage.ts
      history-service.ts
  resources/
    constants.ts
    ResourcePreviewSheet.tsx
    ResourcesEmptyState.tsx
    ResourcesHeader.tsx
    ResourcesPage.tsx
    ResourcesTable.tsx
  settings/
    AgentsSettingsPage.tsx
    CollapsibleSection.tsx
    GeneralSettingsPage.tsx
    LanguageSelector.tsx
    ProvidersSettingsPage.tsx
    SettingsComponents.tsx
    SettingsLayout.tsx
    SystemSettingsPage.tsx
    ThemeModeSelector.tsx
    WorkspacePage.tsx
```

## Routing Model

`src/renderer/src/App.tsx` is the route entry for this folder.

The current route split is:

- `/` renders `WelcomePage.tsx` directly
- most other routes render inside `AppLayout`
- most page components are lazy-loaded
- route-level error handling is applied through `RouteWrapper`
- settings routes are nested under `settings/SettingsLayout.tsx`
- the document route `/content/:id` is handled by `document/Page.tsx`

Current route map:

- `/` -> `WelcomePage.tsx`
- `/home` -> `HomePage.tsx`
- `/settings/*` -> `settings/SettingsLayout.tsx`
- `/settings/general` -> `settings/GeneralSettingsPage.tsx`
- `/settings/workspace` -> `settings/WorkspacePage.tsx`
- `/settings/providers` -> `settings/ProvidersSettingsPage.tsx`
- `/settings/agents` -> `settings/AgentsSettingsPage.tsx`
- `/settings/system` -> `settings/SystemSettingsPage.tsx`
- `/content/:id` -> `document/Page.tsx`
- `/resources` -> `resources/ResourcesPage.tsx`
- `/agents` -> `agents/AgentsPage.tsx`
- `/debug/tasks` -> `debug/DebugTasksPage.tsx`
- `/debug/redux` -> `debug/DebugReduxPage.tsx`

## Page Categories

This folder currently contains three different kinds of route code.

### 1. Single-file pages

Use a single `*Page.tsx` when the route is small and does not yet need internal substructure.

Current examples:

- `HomePage.tsx`
- `WelcomePage.tsx`
- `agents/AgentsPage.tsx`

### 2. Shallow route feature folders

Use a shallow folder when the route has a few supporting UI pieces but does not need its own provider or service graph.

Current examples:

- `resources/`
- `debug/`
- `settings/`

These folders typically contain:

- one route entry component
- sibling presentational pieces
- local constants or helpers

### 3. Full feature folders

Use a full feature folder when the route owns meaningful local architecture.

Current canonical example:

- `document/`

The document route is the reference shape for a complex page area.
It has its own:

- route entry
- layout orchestrator
- feature header
- route-scoped components
- reducer/context state
- providers
- services
- hooks
- nested panels
- local guide in `document/AGENTS.md`

If a new route starts accumulating state ownership, persistence logic, or multiple coordinated panels, promote it toward this shape instead of continuing to grow one large `*Page.tsx` file.

## Folder Responsibilities

### `WelcomePage.tsx`

This is the standalone landing route.
It is rendered outside `AppLayout`.

Use it for first-run or top-level entry behavior, not for workspace-scoped navigation patterns that belong inside the main app shell.

### `HomePage.tsx`

This is the in-app landing page under `AppLayout`.
It is the primary collection-style route for existing output documents and related navigation into `/content/:id`.

### `document/`

This is the most feature-rich route in the renderer.
It owns the single-document editing experience.

If you need implementation detail here, read `src/renderer/src/pages/document/AGENTS.md`.

### `resources/`

This route owns the resource-browser UI.
It is a route-local feature folder, but it is still relatively shallow compared to `document/`.

Keep resource-table presentation and resource-page-only helpers here unless they become shared across the renderer.

### `agents/`

This route owns the top-level agents page UI.
Right now it is a small route surface and stays as a single page file inside a small folder.

### `settings/`

This folder owns the nested settings route family.

Important structure:

- `SettingsLayout.tsx` is the parent route shell
- child pages render into that shell through nested routing
- section-specific controls stay inside this folder unless they become globally reusable

### `debug/`

This folder owns developer-facing diagnostics pages and their route-local UI pieces.

Keep debugging affordances isolated here.
Do not leak debug-only helpers into shared product components unless they have a real non-debug use case.

## Entry Point Conventions

Use these conventions when adding or refactoring page code.

### For a simple route

Prefer:

- `FeaturePage.tsx`

This is enough when the route mostly composes existing shared components and has limited local state.

### For a medium route

Prefer:

- `feature/FeaturePage.tsx`
- sibling helper components
- local constants/helpers only if they are route-specific

### For a large route

Prefer the document-page pattern:

- `Page.tsx` as the route entry
- `Layout.tsx` as the orchestrator
- `Header.tsx` or similar top-level child components
- `components/`, `hooks/`, `context/`, `providers/`, `services/`, and `panels/` as needed

This pattern keeps route composition readable and keeps page-only abstractions local instead of prematurely promoting them into renderer-global folders.

## State Ownership

Use this folder for page-scoped state ownership, not every kind of renderer state.

What belongs here:

- route-local orchestration
- page-only React context
- page-only hooks
- local persistence helpers tied to one route
- route-local presentational components

What does not belong here:

- global app shell concerns
- renderer-wide providers
- cross-route reusable components
- Redux slice definitions
- main-process or preload logic

Current state split to preserve:

- global collections live in `src/renderer/src/store`
- app-wide providers live in `src/renderer/src/contexts`
- route-scoped document state lives in `document/`
- task event infrastructure lives in `src/renderer/src/services`

## When To Keep Code Local

Keep code inside a page folder when:

- only one route uses it
- the behavior is tightly coupled to one screen
- the naming only makes sense in the context of that page
- moving it to a shared folder would create a vague or misleading abstraction

Promote code out of `pages/` only when at least one of these is true:

- multiple routes now depend on it
- the abstraction is stable and clearly reusable
- the route-level folder is accumulating non-route-specific responsibilities

## Common Modification Paths

### Add a new route

1. Add the page file or page folder under `src/renderer/src/pages`.
2. Register the route in `src/renderer/src/App.tsx`.
3. Decide whether it belongs outside `AppLayout` like `/` or inside the main shell.
4. Only add a feature folder if the route genuinely needs local structure.

### Expand a simple page into a feature folder

When a `*Page.tsx` starts owning too much behavior:

1. move it into a folder
2. keep the route entry shallow
3. split orchestration from presentation
4. add route-local `components/`, `hooks/`, or `services/` before reaching for global renderer folders

### Add nested settings content

Update:

- `settings/SettingsLayout.tsx`
- `src/renderer/src/App.tsx`
- the new child `settings/*Page.tsx`

Keep settings-only controls in the `settings/` folder unless they are truly shared outside settings.

## Common Mistakes To Avoid

- putting route-specific helpers into global renderer folders too early
- turning `pages/` into a second shared-components directory
- adding filesystem or Electron logic directly in route code
- storing page-only transient state in Redux without a cross-route reason
- growing a large route inside one file when a local feature folder would be clearer
- copying the `document/` structure for tiny pages that do not need it
- flattening a complex page so far that ownership boundaries disappear

## Debugging Map

If the issue is mainly about:

- route registration or layout shell behavior: start with `src/renderer/src/App.tsx`
- the standalone landing flow: start with `WelcomePage.tsx`
- in-app home/document navigation: start with `HomePage.tsx`
- single-document editing: start with `document/AGENTS.md`, then `document/Page.tsx` and `document/Layout.tsx`
- resource browsing: start with `resources/ResourcesPage.tsx`
- settings routing/layout: start with `settings/SettingsLayout.tsx`
- agent list/settings page behavior: start with `agents/AgentsPage.tsx` or the relevant `settings/*`
- diagnostics UI: start with `debug/`

## Recommended Structure Rule

Match the complexity of the page.

Use:

- a single file for small routes
- a shallow folder for medium routes
- the `document/` pattern for large route-owned feature areas

The main goal is to keep route ownership obvious.
If a piece of code exists only to make one route work, it should usually live under that route's folder first.
