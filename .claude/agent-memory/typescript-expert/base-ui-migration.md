---
name: Base UI Migration Patterns
description: Key type and API differences when migrating from @radix-ui/* to @base-ui/react in this project
type: project
---

## @radix-ui → @base-ui/react Type Changes

**asChild → render prop**
Radix `asChild` does not exist in Base UI. Replace with `render` prop:
- Before: `<MenuTrigger asChild><AppButton .../></MenuTrigger>`
- After: `<MenuTrigger render={<AppButton .../>} />`
- Children stay as children when render replaces just the element:
  - `<SidebarMenuButton asChild><Link to="...">children</Link></SidebarMenuButton>`
  - → `<SidebarMenuButton render={<Link to="..." />}>children</SidebarMenuButton>`

**TooltipProvider: delayDuration → delay**
- Before: `<TooltipProvider delayDuration={300}>`
- After: `<TooltipProvider delay={300}>`

**Checkbox: checked="indeterminate" → separate indeterminate prop**
- Before: `checked={someChecked ? 'indeterminate' : allChecked}`
- After: `checked={someChecked ? undefined : allChecked} indeterminate={someChecked}`

**Select onValueChange: (value: T) → (value: T | null, eventDetails)**
- Base UI Select's onValueChange passes `null` when deselecting
- All handlers must accept `string | null` and guard: `if (value === null) return;`
- Or wrap dispatch: `onValueChange={(v) => { if (v !== null) setState(v); }}`

**Select generic type argument**
- `SelectPrimitive.Root.Props` requires a type argument: `SelectPrimitive.Root.Props<Value>`
- Use `function Select<Value = string>({ ...props }: SelectPrimitive.Root.Props<Value>)`

**data-* attributes in mergeProps**
- `mergeProps<'button'>` uses `WithBaseUIEvent<ComponentPropsWithRef<'button'>>` which strips index signatures
- Data attributes like `data-slot` cannot be in the first argument of `mergeProps`
- Solution: spread `data-slot` outside `mergeProps` directly into the object passed to `useRender.props`

**useRender props parameter**
- `useRender({ props: Record<string, unknown> })` - accepts any keys including data-*
- Can spread mergeProps result and add data attributes: `props: { ...mergeProps(...), 'data-slot': 'button' }`

## Why
Completed migration of all UI components from @radix-ui/* to @base-ui/react in this project (April 2026).
Consumer components and page-level code needed type fixes after the UI layer migration.
