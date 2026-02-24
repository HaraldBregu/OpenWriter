# Theme System Pattern Analysis

## Problem
useTheme() is called inside AppLayout, which wraps all routes except WelcomePage.
WelcomePage (route `/`) renders standalone without AppLayout, so the dark class
is never applied to <html> when WelcomePage is active.

## Decision: Absorb DOM side effect into AppProvider

Move the three useEffect blocks from useTheme.ts into AppContext.tsx's AppProvider.
Keep useTheme() as a no-op or delete it once migrated. Do NOT add a separate ThemeProvider.

Rationale:
- AppProvider is already responsible for theme state, persistence, and IPC notification
- The DOM class IS part of the theme domain — it is how theme state manifests visually
- Separating "set class" from "own state" violated Single Responsibility for no benefit
- Adding a separate ThemeProvider wrapper adds a layer with no new capability

## What stays in AppProvider after refactor
1. readPersistedTheme() on init (already there)
2. localStorage.setItem on theme change (already there)
3. window.api.setTheme(state.theme) IPC call on theme change (already there)
4. applyThemeClass(state.theme) on theme change — MOVED HERE from useTheme
5. window.matchMedia listener for system mode — MOVED HERE
6. window.api.onThemeChange IPC listener — MOVED HERE, dispatches SET_THEME

## What happens to useTheme.ts
Option A: Delete the file and remove the import from AppLayout.tsx
Option B: Keep as empty stub with a JSDoc comment pointing to AppProvider
Recommendation: Delete it. Its three concerns all belong in AppProvider.

## Template literal for dark class initialization
The HTML template defaults to class="dark". This is correct behavior —
it prevents FOUC for dark-mode users. The first AppProvider render with
applyThemeClass() will correct it immediately for light/system users.
No change needed in index.html.
