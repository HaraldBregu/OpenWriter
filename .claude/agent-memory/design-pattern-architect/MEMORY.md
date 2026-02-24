# Design Pattern Architect - Memory

## Codebase Architecture
- Electron + React 19 + TypeScript + Redux Toolkit + Redux Saga
- State split: Redux for document/async data; AppContext (useReducer) for UI state (theme, preferences, modals)
- AppContext uses split-context pattern (AppStateContext + AppActionsContext) for render optimization
- Path aliases: `@/` → `src/renderer/src/`, `@components/`, `@store/`, `@resources/`, etc.

## Key File Locations
- `src/renderer/src/App.tsx` — root router, provider tree
- `src/renderer/src/contexts/AppContext.tsx` — theme state, UI preferences, online status (useReducer)
- `src/renderer/src/hooks/useTheme.ts` — DOM class applicator + IPC + OS media query listeners
- `src/renderer/src/components/AppLayout.tsx` — calls useTheme(); wraps all routes EXCEPT WelcomePage
- `src/renderer/src/pages/WelcomePage.tsx` — standalone route at `/`, no AppLayout

## Confirmed Patterns Already in Use
- **Split Context** (AppContext): separate state/actions contexts to avoid unnecessary re-renders
- **Custom Hook as Facade** (useTheme, useLanguage, etc.): hooks encapsulate multi-concern side effects
- **Lazy Loading**: all pages except WelcomePage use React.lazy + Suspense
- **RouteWrapper**: ErrorBoundary + Suspense composition for route-level error handling

## Known Issues / Anti-Patterns
- `useTheme()` is called inside `AppLayout`, not at the provider level — causes theme not applied on WelcomePage
- Fix: move theme DOM side effect into AppProvider directly (see theme-pattern.md for full analysis)

## Team Preferences
- Functional React patterns (hooks, composition) preferred over class components
- No emojis in code or responses
- Absolute file paths required in all responses

## Links to Detail Files
- `theme-pattern.md` — full analysis of theme system pattern decision
