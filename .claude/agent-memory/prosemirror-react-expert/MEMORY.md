# OpenWriter - ProseMirror/TipTap Expert Memory

## Project Overview
- **Stack**: Electron + React + TipTap (ProseMirror wrapper) + Tailwind CSS
- **Editor framework**: TipTap v2 (`@tiptap/react`)
- **Styling**: Tailwind + plain CSS in `src/renderer/src/index.css`

## Key File Locations
- Editor component: `src/renderer/src/components/editor/TextEditor.tsx`
- TipTap extensions: `src/renderer/src/components/editor/extensions.ts`
- Global CSS (editor styles, font, ProseMirror reset): `src/renderer/src/index.css`
- Entry point (font imports): `src/renderer/src/main.tsx`
- HTML entry: `src/renderer/index.html`

## Font Architecture
- Fonts are loaded via `@fontsource/*` npm packages (NOT Google Fonts links), which is correct for an Electron/offline app.
- Font imports go in `src/renderer/src/main.tsx`.
- The editor body font is set on `.ProseMirror` in `src/renderer/src/index.css`.
- Headings/lists inherit via `font-family: inherit` on `.tiptap h1-h6` and `.tiptap ul/ol`.
- **Current editor font**: Merriweather (changed from Alegreya). Both packages are in package.json.
- Import individual weight CSS files (e.g. `400.css`, `700.css`, `700-italic.css`) rather than `index.css` for fine-grained control.

## TipTap Editor Setup
- `BASE_EXTENSIONS` array defined in `extensions.ts` is passed to `useEditor`.
- `editorProps.attributes.class` on the `useEditor` call adds Tailwind classes to `.ProseMirror` element directly.
- Placeholder extension is already configured with per-node-type placeholder text.
- The CSP in `index.html` uses `style-src 'self' 'unsafe-inline'` — no external font CDNs are allowed.

## See Also
- `patterns.md` (not yet created) for React NodeView and plugin patterns
