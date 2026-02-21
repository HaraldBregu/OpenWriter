# React Memoization Optimizer - Memory

## Project Structure (Renderer)
- UI primitives: `src/renderer/src/components/ui/` (Radix-based, shadcn pattern)
- Memoized wrappers: `src/renderer/src/components/app/` (React.memo wrapping each UI primitive with App prefix)
- Barrel export: `src/renderer/src/components/app/index.ts`
- Pages: `src/renderer/src/pages/` (lazy-loaded via React.lazy in App.tsx)
- Shared components: `src/renderer/src/components/` (TitleBar, ContentBlock, MarkdownContent, etc.)
- Settings sub-pages: `src/renderer/src/pages/settings/` (also lazy-loaded)

## Already Memoized (as of Feb 2026)
- All App wrapper components (AppButton, AppInput, etc.) -- React.memo with displayName
- `MarkdownContent` -- React.memo (expensive markdown+syntax highlighting)
- `CopyButton` -- React.memo
- `MessageBubble` in DashboardPage -- React.memo
- `ProviderSelect` in DashboardPage -- React.memo
- `EmptyState` in DashboardPage -- React.memo
- `CategoryCard` and `RecentItem` in HomePage -- React.memo
- `ContentBlock` and `ActionButton` -- React.memo
- `TitleBar` -- React.memo
- `LoadingSkeleton` -- React.memo
- `IndexPanel` and `ChatArea` in RagPage -- React.memo
- `SettingsPopover` in AppLayout -- React.memo

## Key useCallback Applications
- DashboardPage: handleNewThread, handleProviderChange, handleSend, handleKeyDown
- NewPostPage: handleChange, handleDelete, handleAddBlockAfter, handleReorder, handleAddTag, handleRemoveTag
- HomePage: CategoryCard/RecentItem handleClick, PipelineTestSection handleRun/handleKeyDown
- AppLayout: toggleSection, handleNewPost
- WelcomePage: handleOpenProject, handleOpenRecentProject
- PipelineTestPage: runAgent, runBothConcurrent, runAgentMultipleTimes, clearRuns
- RagPage ChatArea: handleSend, handleKeyDown
- ModelsSettings: handleSelectModel, handleTokenChange, handleTokenBlur

## Components Intentionally NOT Memoized
- `ErrorBoundary` -- class component, cannot use React.memo
- `WindowControls` -- has internal state, rarely re-rendered
- `MediaPermissionDemo`, `MicrophoneRecorder`, `CameraRecorder`, `ScreenRecorder`, `MediaRecorder` -- isolated feature pages, not performance-critical
- `CollapsibleSection` -- simple component with internal state toggle
- `AppLayout`/`AppLayoutInner` -- receives `children` prop (new object each render), memoization ineffective
- `SettingsPage` -- simple tab switcher with lazy components, minimal render cost
- NewMessagePage, NewNotePage, NewWritingPage -- trivial static placeholder pages

## Architecture Notes
- HashRouter used for Electron compatibility
- Redux Toolkit + Redux Saga for state management
- `selectPostById` creates selector per call in NewPostPage (potential optimization: createSelector)
- Path aliases: @/, @components/, @pages/, @store/, @icons/, @utils/
- Most pages are lazy-loaded, reducing initial bundle impact
