---
name: OpenWriter Design System Conventions
description: Design tokens, component patterns, and accessibility conventions used in the OpenWriter editor
type: project
---

## Component Library

- App-namespaced wrappers around Radix UI primitives: `AppButton`, `AppTooltip`, `AppAlertDialog`, `AppTextarea`, `AppInput`, `AppBadge`, etc.
- All app components live in `src/renderer/src/components/app/`
- `AppButton` uses `cva` with variants: `ghost`, `outline`, `default`, `destructive`, `secondary`, `link`, `editor-block-actions`, `prompt-submit`, `header-icon`
- `AppButton` sizes include: `icon-xs` (h-6 w-6), `icon`, `icon-lg`, `sm`, `default`, `lg`, and several prompt/header-specific sizes
- `AppAlertDialog` exposes `AppAlertDialogFooter` — use it instead of a raw `<div className="flex justify-end">` in dialogs

## Tailwind Design Tokens

- Semantic colors: `text-foreground`, `text-muted-foreground`, `text-primary`, `text-destructive`, `bg-accent`, `bg-primary`, `bg-muted`, `border-border`
- Use `bg-primary/10 text-primary` for active/selected state indicators (not just `bg-accent`)
- Use `hover:bg-destructive/10 hover:text-destructive` for destructive hover patterns
- `backdrop-blur-md` + `bg-popover/95` for floating overlay panels
- `tabular-nums` for numeric dimension readouts

## Accessibility Patterns Established

- Floating toolbars: `role="toolbar"` + `aria-label`, `aria-pressed` on toggle buttons
- Image wrappers: `role="img"` + `aria-label` + `tabIndex={0}` for keyboard reachability
- Error states in editor: `role="alert"` + `aria-live="assertive"`
- Live dimension readouts: `aria-live="polite"` + `aria-atomic="true"`
- `ImageEditor` wrapper: `role="dialog"` + `aria-modal="true"` + `aria-label`
- Toolbar groups: `role="group"` or `role="toolbar"` to segment semantically
- Image thumbnail strips: `role="list"` on wrapper, `role="listitem"` on each thumb + "add" button
- Remove buttons in thumbnail strips must be visible on focus-within (`group-focus-within/thumb:opacity-100`) not only on hover — keyboard users cannot trigger hover
- Dropdown triggers whose visible label already conveys the current selection must still expose a descriptive `aria-label` (e.g. `Agent: {{agent}}`, `Model: {{model}}`), and the visible text span gets `aria-hidden="true"` to prevent double-reading
- Selected items in menus use `aria-current="true"` (not `aria-selected`) when inside dropdown menus — `aria-selected` is for listbox/grid patterns
- Drop zones that accept file input: add a polite `role="status"` live region (via `useId`) that announces the attachment count after each add/remove; link the drop-zone button to it with `aria-describedby`
- Decorative icon containers inside interactive elements get `aria-hidden="true"` to prevent redundant announcements

## Animation Conventions

- Floating toolbars appear with: `transition-all duration-200 ease-out` + `-translate-y-1 scale-95` → `translate-y-0 scale-100`
- Mode buttons use `transition-colors` for active state flips

## Image Extension Location

`src/renderer/src/components/editor/extensions/image/`
- `NodeView.tsx` — TipTap node view wrapper
- `components/ImageEditor.tsx` — modal-style editor overlay
- `components/CropOverlay.tsx` — canvas crop interaction layer
- `components/ToolbarButton.tsx` — shared icon button with tooltip
- `components/DeleteConfirmDialog.tsx` — Radix alert dialog for delete confirm
- `components/ResizeControls.tsx` — width/height inputs with aspect-ratio lock for resize mode
- `shared/use-image-canvas.ts` — all canvas operations (crop, rotate, resize, AI filters, undo)
- `shared/image-editor-constants.ts` — `MIN_CROP_SIZE`, `MIN_DIMENSION` (1), `MAX_DIMENSION` (8000)

## ImageEditor Edit Modes

`EditMode = 'crop' | 'rotate' | 'resize' | 'ai'`

- Modes render a context controls row beneath the toolbar (except `ai`, which gets a full-width panel below the toolbar)
- When a mode is activated, focus is sent to the primary interactive element: `ai` → textarea ref, `resize` → `#resize-width` input via `querySelector` on `editorRef`
- Switching away from `crop` triggers `resetCrop()` + clears crop state; no teardown needed for `rotate` or `resize`
- `ResizeControls` takes `currentWidth`, `currentHeight`, `onApply(w, h)` — all wired from `ImageEditor`'s `state.dimensions` and `applyResize` from `useImageCanvas`

## Settings Page Conventions

- `GeneralSettingsPage` is the canonical layout reference: `SectionHeader` + `SettingRow` components, no border-wrapped boxes.
- `SettingRow` renders label + optional description on the left, arbitrary child on the right (`flex items-center justify-between`).
- Inline segmented controls: `role="group"` + `aria-label` on the wrapper `<div>`, `aria-pressed` on each `<button>`. Active state uses `bg-background text-foreground shadow-sm`; inactive uses `bg-transparent text-muted-foreground hover:text-foreground`. Outer wrapper: `bg-muted border border-border p-0.5 rounded-md`.
- Language/select controls inside `SettingRow`: use `AppSelect` with a fixed width trigger (`w-32 h-8 text-sm`) and `aria-label` on `AppSelectTrigger` (no adjacent visible label in the trigger).
- Inline alert banners (not native dialogs): use a flex row with `role="alert"` + `aria-live="assertive"` + `aria-atomic="true"` for errors, and `role="status"` + `aria-live="polite"` for success. Destructive style: `border-destructive/40 bg-destructive/10 text-destructive`. Success style: `border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400`. Always include a dismiss `<button>` with `aria-label`. Auto-dismiss success banners after 3000ms via `setTimeout` cleared in cleanup.
- Simple boolean errors (e.g. load/save fail): use `<p role="alert" className="text-sm text-destructive">` (WorkspacePage pattern) — no banner needed for single-flag errors without a message string.

## InfoPanel / Document Sidebar Conventions

- `InfoPanel.tsx` was refactored to use `SectionHeader` + `SettingRow` from `SettingsComponents.tsx` (path: `../../../../settings/SettingsComponents`). No `AppCard` wrappers remain.
- For section headers that need an icon button alongside (e.g. "Open Folder"), inline a flex row manually rather than extending `SectionHeader` — keeps the component API simple.
- `PdfExportSection` no longer accepts a `sectionClassName` prop. It renders its own header row (label + icon buttons) and a PDF preview iframe. The parent owns any `SectionHeader` above it.
- The image grid section is intentionally not wrapped in `SettingRow` — it is a visual grid, not a key-value pair. Use a custom flex header + grid layout directly.

## i18n

Uses `react-i18next`. All user-visible strings go through `t('imageNode.*')`.

**Why:** Consistent with rest of the app. Ensure new labels always use translation keys.

**How to apply:** Any new string in image extension components must have a `t('imageNode.someKey', 'fallback')` call.
