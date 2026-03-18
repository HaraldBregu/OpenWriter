---
name: OpenWriter design system conventions
description: Design tokens, component patterns, and layout conventions used in the OpenWriter settings UI
type: project
---

OpenWriter uses Tailwind CSS with a shadcn/ui-compatible token set. Key tokens: `bg-muted/30`, `text-muted-foreground`, `bg-accent`, `text-accent-foreground`, `text-destructive`, `border-input`, `bg-background`, `text-foreground`.

Settings pages use two competing layout patterns:
1. **Old pattern (GeneralSettingsPage, ModelsSettingsPage)**: `space-y-8 p-6`, bordered card rows with `divide-y`, `h1` at `text-lg font-normal`, section headers as `h2 text-sm font-normal text-muted-foreground`.
2. **New Cursor-style pattern (WorkspacePage, AgentsSettingsPage)**: `max-w-2xl p-6`, borderless rows, `h1` at `text-lg font-normal`, section headers via local `SectionHeader` component (`h2 text-xs font-medium text-muted-foreground uppercase tracking-wide`).

`SectionHeader` is duplicated verbatim in AgentsSettingsPage, ModelsSettingsPage, and WorkspacePage — it should be extracted to a shared module (SonarQube duplication violation).

SettingsLayout uses `NavLink` from react-router-dom with manual `aria-current="page"` computed via `isItemActive()`. Nav items are `rounded-md px-3 py-1.5 text-sm`.

App routing: HashRouter, `/settings/*` renders `SettingsLayout` with nested routes for `general`, `workspace`, `models`, `agents`, `system`. Index route renders `GeneralSettingsPage`.

Component library: `AppInput`, `AppTextarea`, `AppButton`, `AppSelect`, `AppSlider`, `AppSwitch`, `AppLabel`, `AppSkeleton`, `AppSeparator`, `AppTooltip` — all thin wrappers over shadcn/ui primitives using `forwardRef` + `React.memo`.

Switch UI component: custom (not Radix), renders a `<button role="switch" aria-checked>`. When using `htmlFor`/`id` label association with AppSwitch, do NOT also add `aria-label` — `aria-label` overrides the label element's text for AT. Use `aria-describedby` instead to wire description paragraphs.

Slider UI component: custom `<input type="range">` wrapper. Supports `aria-label`, `aria-describedby`, `aria-valuetext`. Use `aria-valuetext` to provide formatted value strings to screen readers.

RadioGroup pattern (ThemeModeSelector, LanguageSelector): Each `AppRadioGroupItem` must carry `aria-describedby` pointing to the `id` of the accompanying description `<span>`. Without this, screen readers announce only the label, not the helper text. The `id` convention is `{prefix}-{value}-description` (e.g. `theme-light-description`, `language-en-description`).

Heading hierarchy in SystemSettingsPage: `<h1>` for the page title, `SectionHeader` renders `<h2>` for section groupings (e.g. "Layout"), sub-section widget labels (e.g. "Theme", "Language") must use `<h3>` — not `<h2>` — to maintain a valid outline.

**Why:** Recording because two layout patterns coexist and future pages need to know which to follow.
**How to apply:** New settings pages should use the WorkspacePage/AgentsSettingsPage Cursor-style pattern as it is the newer, intentional design direction.
