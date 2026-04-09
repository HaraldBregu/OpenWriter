# Contributing to OpenWriter

Thanks for contributing to OpenWriter.

## Before You Start

- Use Node 22 and Yarn.
- Branch from `main` for your work.
- Keep credentials and local secrets in `.env` only.
- Treat IPC surfaces and AI prompt files under `src/main/agents/**/*.md` as sensitive interfaces and review them carefully.

## Project Layout

- `src/main`: Electron main-process code, IPC, workspace services, task orchestration, AI agents, and indexing.
- `src/preload`: Typed `contextBridge` APIs exposed to the renderer.
- `src/renderer/src`: React UI code, organized into `components`, `pages`, `hooks`, `store`, `services`, and `contexts`.
- `src/shared`: Shared types and utilities.
- `tests/unit/main`, `tests/unit/renderer`, `tests/e2e`: Unit, integration, and Electron end-to-end tests.
- `resources`: Static assets and translations.
- `docs`: Architecture and design notes.

## Local Setup

```bash
yarn install
yarn dev
```

Useful commands:

- `yarn typecheck`: Run TypeScript checks for main and renderer.
- `yarn lint`: Run ESLint across the repo.
- `yarn test`: Run the full Jest suite.
- `yarn test:main`: Run Node-side tests only.
- `yarn test:renderer`: Run renderer tests only.
- `yarn test:e2e`: Run Playwright Electron tests.
- `yarn build`: Produce a production build.

## Coding Standards

- The codebase is TypeScript-first.
- Prettier uses tabs, single quotes, semicolons, trailing commas, and a 100-column width.
- Run `yarn format` or `yarn format:check` before opening a pull request.
- Use `PascalCase` for React components and classes.
- Name hooks with the `use-*.ts` or `use-*.tsx` pattern.
- Use descriptive lowercase or `kebab-case` names for helpers and modules.
- Add comments only when the logic is non-obvious and the comment materially helps future readers.

## Testing Expectations

- Run `yarn lint`, `yarn typecheck`, and `yarn test` before submitting a pull request.
- Keep the current coverage floor of 50% for branches, functions, lines, and statements.
- Place tests in the matching layer and keep names aligned with the source file using `.test.ts` or `.test.tsx`.
- Use the existing renderer test utilities and Electron/preload mocks instead of custom bootstrapping when possible.

## Pull Requests

- Keep commit messages short, imperative, and specific.
- Summarize what changed and why in the pull request description.
- Note the affected layers when relevant, such as `main`, `preload`, or `renderer`.
- Link related issues when applicable.
- Include screenshots or recordings for UI changes.

## Reporting Issues

- Include the OS, app version or commit, and clear reproduction steps.
- Attach logs, screenshots, or short recordings when they help clarify the issue.
- Separate bug reports from feature requests so they can be triaged cleanly.
