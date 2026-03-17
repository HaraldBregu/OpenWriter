---
name: OpenWriter design system conventions
description: Design tokens, component patterns, and layout conventions used in the OpenWriter settings UI
type: project
---

OpenWriter uses Tailwind CSS with a shadcn/ui-compatible token set. Key tokens: `bg-muted/30`, `text-muted-foreground`, `bg-accent`, `text-accent-foreground`, `text-destructive`, `border-input`, `bg-background`, `text-foreground`.

Settings pages use two competing layout patterns:
1. **Old pattern (GeneralSettingsPage, ModelsSettingsPage)**: `space-y-8 p-6`, bordered card rows with `divide-y`, `h1` at `text-lg font-normal`, section headers as `h2 text-sm font-normal text-muted-foreground`.
2. **New Cursor-style pattern (WorkspacePage)**: `max-w-2xl p-6`, borderless rows with bottom border only (`border-b last:border-b-0`), `h1` at `text-xl font-semibold`, section headers as `h3 text-xs uppercase tracking-wide`.

SettingsLayout uses `NavLink` from react-router-dom with manual `aria-current="page"` computed via `isItemActive()`. Nav items are `rounded-md px-3 py-1.5 text-sm`.

App routing: HashRouter, `/settings/*` renders `SettingsLayout` with nested routes for `general`, `workspace`, `models`, `system`. Index route renders `GeneralSettingsPage`.

Component library: `AppInput`, `AppTextarea`, `AppButton`, `AppSelect`, `AppSlider`, `AppSwitch`, `AppLabel` — all thin wrappers over shadcn/ui primitives using `forwardRef` + `React.memo`.

**Why:** Recording because two layout patterns coexist and future pages need to know which to follow.
**How to apply:** New settings pages should use the WorkspacePage Cursor-style pattern as it is the newer, intentional design direction.
