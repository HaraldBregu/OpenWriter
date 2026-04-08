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
- `shared/use-image-canvas.ts` — all canvas operations (crop, rotate, AI filters, undo)
- `shared/image-editor-constants.ts` — `MIN_CROP_SIZE`, `MIN_DIMENSION`, `MAX_DIMENSION`

## Settings Page Conventions

- `GeneralSettingsPage` is the canonical layout reference: `SectionHeader` + `SettingRow` components, no border-wrapped boxes.
- `SettingRow` renders label + optional description on the left, arbitrary child on the right (`flex items-center justify-between`).
- Inline segmented controls: `role="group"` + `aria-label` on the wrapper `<div>`, `aria-pressed` on each `<button>`. Active state uses `bg-background text-foreground shadow-sm`; inactive uses `bg-transparent text-muted-foreground hover:text-foreground`. Outer wrapper: `bg-muted border border-border p-0.5 rounded-md`.
- Language/select controls inside `SettingRow`: use `AppSelect` with a fixed width trigger (`w-32 h-8 text-sm`) and `aria-label` on `AppSelectTrigger` (no adjacent visible label in the trigger).

## i18n

Uses `react-i18next`. All user-visible strings go through `t('imageNode.*')`.

**Why:** Consistent with rest of the app. Ensure new labels always use translation keys.

**How to apply:** Any new string in image extension components must have a `t('imageNode.someKey', 'fallback')` call.
