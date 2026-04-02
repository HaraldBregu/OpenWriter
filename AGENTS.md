# Repository Guidelines

## Project Structure & Module Organization

OpenWriter is an Electron app split by process boundary. Use `src/main` for privileged Node/Electron code such as IPC, workspace services, task management, AI agents, and indexing. Use `src/preload` for the typed `contextBridge` API exposed to the renderer. Put UI code in `src/renderer/src`, organized by `components`, `pages`, `hooks`, `store`, `services`, and `contexts`. Share types and utilities from `src/shared`. Tests live under `tests/unit/main`, `tests/unit/renderer`, and `tests/e2e`. Static assets and i18n files live in `resources/`; design and architecture notes live in `docs/`.

## Build, Test, and Development Commands

Use Yarn and Node 22.

- `yarn dev`: start Electron + Vite in development mode.
- `yarn typecheck`: run both Node and renderer TypeScript checks.
- `yarn lint`: run ESLint across the repo.
- `yarn test`: run all Jest unit/integration tests.
- `yarn test:main` / `yarn test:renderer`: scope tests to one process.
- `yarn test:coverage`: enforce coverage output and thresholds.
- `yarn build`: typecheck and build production artifacts into `out/` and `dist/`.
- `yarn test:e2e`: run Playwright Electron tests; build first with `yarn build`.

## Coding Style & Naming Conventions

The codebase is TypeScript-first. Prettier uses tabs, single quotes, semicolons, trailing commas, and a 100-column width. Run `yarn format` or `yarn format:check` before opening a PR. Follow existing naming patterns: React components and classes use `PascalCase`, hooks use `use-*.ts(x)`, helpers and modules use `kebab-case` or descriptive lowercase names, and tests mirror the source name with `.test.ts` or `.test.tsx`.

## Testing Guidelines

Jest is configured as a multi-project suite: `main` runs in Node, `renderer` runs in jsdom. Playwright covers full Electron flows in `tests/e2e/*.spec.ts`. Maintain the global coverage floor of 50% for branches, functions, lines, and statements. Only add or update tests when the user specifically requests test implementation. When tests are requested, add them beside the matching layer and prefer `render-with-providers.tsx` plus the existing Electron/preload mocks instead of custom bootstrapping.

## Commit & Pull Request Guidelines

Recent history uses short, imperative commit subjects such as `Add ConfigPanel and EditorPanel document page components` and `Remove chats from OutputType`. Keep subjects concise, specific, and capitalized. For pull requests, include a clear summary, note affected layers (`main`, `preload`, `renderer`), link issues when relevant, and attach screenshots or recordings for UI changes. Before requesting review, make sure `yarn lint`, `yarn typecheck`, and `yarn test` pass locally.

## Configuration & Security

Keep secrets in `.env` only and never commit credentials. Treat prompt files under `src/main/ai/agents/**/*.md` and IPC surfaces as sensitive interfaces. If test updates are needed for those changes, only implement them when the user specifically requests tests.

## Git

Always:

- git add .
- git commit -m "auto: {describe changes}"
- git push

Do this after every file modification.
