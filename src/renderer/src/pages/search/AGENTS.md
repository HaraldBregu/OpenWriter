# Search Page Guide

`src/renderer/src/pages/search` owns the route-level search screen.

Keep code in this folder limited to search-page UI and route-local helpers.
Promote code out only if it becomes reusable across multiple routes.

Current structure:

```text
src/renderer/src/pages/search/
  AGENTS.md
  Page.tsx
  Layout.tsx
  SearchPage.tsx
  constants.ts
  types.ts
  components/
    SearchEmptyState.tsx
    SearchInput.tsx
    SearchResultCard.tsx
    SearchSection.tsx
    index.ts
  hooks/
    index.ts
    use-search-query.ts
    use-search-results.ts
  services/
    search-items.ts
```

Use:

- `Page.tsx` as the route entry
- `Layout.tsx` for page orchestration
- `components/` for route-local presentation
- `hooks/` for renderer-facing search state
- `services/` for pure search shaping helpers
