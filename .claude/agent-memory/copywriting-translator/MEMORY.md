# Copywriting & Translation Agent Memory

## Project: OpenWriter (Electron + React + i18next)

### i18n Architecture
- EN source: `resources/i18n/en/main.json` and `resources/i18n/en/menu.json`
- IT translations: `resources/i18n/it/main.json` and `resources/i18n/it/menu.json`
- Main process uses `src/main/i18n.ts` (`loadTranslations(lng, component)`) — returns flat `Record<string, string>`
- Renderer uses `react-i18next` with `useTranslation()` hook
- Class components (e.g. ErrorBoundary) use `i18next.t()` directly (import from 'i18next')

### Key i18n Namespacing Patterns
- Sidebar section labels: `sidebar.*` (posts, writing, knowledge, personality, documents, directories, debugTools, untitledPost, untitledWriting)
- Settings popover items: `menu.*` (account, settings, notifications, privacy, billing, helpAndSupport)
- Relative time: `relativeTime.*` (justNow, minutesAgo, hoursAgo, daysAgo) — takes `count` interpolation
- Directory notifications: `directoryNotifications.*`
- Personality items: `personalityItems.*`
- Creativity presets: `creativityPresets.*`
- Text length presets: `textLengthPresets.*`
- Home page: `home.*`
- Error boundary: `errorBoundary.*`
- Title bar: `titleBar.*`

### Patterns to Follow
- Static data arrays defined at module level use `titleKey`/`labelKey`/`descriptionKey` (not `title`/`label`) so `t()` is called at render time inside the component
- `formatRelativeTime(timestamp, t)` and `formatDate(timestamp, t)` accept `t` as a parameter — do NOT use hardcoded English strings
- Section state keys remain stable English strings ("Posts", "Writing", "Knowledge", "Personality") for `useState` maps; only display labels use `t()`
- British/American spelling: use American English in EN copy (color not colour, etc.)
- All-caps sidebar labels are intentional in older code but should be Title Case in i18n values; CSS `tracking-wider` handles visual style

### Copy Quality Guidelines (English)
- Sidebar section labels: Title Case (not ALL-CAPS)
- Tip text: avoid "toggle" — prefer "show or hide"
- `pressEnterToSubmit`: "Press Enter to send, Shift+Enter for a new line"
- Theme descriptions: "color scheme" (not "colour scheme")

### Menu.ts (Main Process)
- Uses `m = loadTranslations(lng, 'menu')` — all menu labels must be in `menu.json`
- `showConsole` and `refresh` keys live in `menu.json`, not `main.json`
