# Navigation System Refactor

## Overview

This document describes the refactoring of Tesseract AI's routing system from **React Router** to a custom **context-based navigation system**. This change simplifies the codebase, reduces dependencies, and provides better control over page lifecycle management.

## Motivation

### Why Remove React Router?

1. **Simplicity**: For an Electron desktop app, React Router's URL-based routing adds unnecessary complexity.
2. **Memory Management**: Better control over component mounting/unmounting lifecycle.
3. **Bundle Size**: Removing React Router reduces the application bundle size.
4. **State-First Navigation**: Navigation state is now managed like any other application state.
5. **Developer Experience**: Simpler mental model for navigation - it's just context, not URL routing.

### Trade-offs

**Benefits:**
- Simpler codebase with fewer abstractions
- Better memory management (only current page is mounted)
- No URL parsing or matching logic needed
- Easier to implement navigation guards and middleware
- Full TypeScript type safety for page names and parameters

**Considerations:**
- No browser history integration (not needed for Electron apps)
- Manual page name management (vs. URL strings)
- Custom solution requires maintenance

## Architecture

### Core Components

#### 1. NavigationContext (`src/renderer/src/contexts/NavigationContext.tsx`)

The central navigation system that provides:

```typescript
interface NavigationContextValue {
  current: NavigationState           // Current page and params
  navigate: (page, params?) => void  // Navigate to a page
  isActive: (page, params?) => bool  // Check if page is active
  getParams: () => RouteParams       // Get all route parameters
  getParam: (key) => string          // Get single parameter
}
```

**Key Features:**
- Type-safe page names via `PageName` union type
- Support for route parameters (e.g., post IDs)
- Active state detection for UI highlighting
- Memoized context value to prevent unnecessary re-renders

#### 2. Updated App.tsx

**Before:**
```tsx
<Router>
  <Routes>
    <Route path="/" element={<WelcomePage />} />
    <Route path="/home" element={<HomePage />} />
    {/* ... */}
  </Routes>
</Router>
```

**After:**
```tsx
<NavigationProvider initialPage="welcome">
  <AppContent />
</NavigationProvider>

// AppContent conditionally renders based on context:
function PageRenderer() {
  const { current } = useNavigation()

  switch (current.page) {
    case 'welcome': return <WelcomePage />
    case 'home': return <HomePage />
    // ...
  }
}
```

**Memory Optimization:**
- Only the current page component is mounted
- Previous pages are fully unmounted, releasing memory
- No hidden DOM elements or suspended components

#### 3. Updated AppLayout.tsx

**Before:**
```tsx
<Link to="/home">Home</Link>
const location = useLocation()
const navigate = useNavigate()
```

**After:**
```tsx
<button onClick={() => navigate('home')}>Home</button>
const { navigate, isActive } = useNavigation()
```

All `Link` components replaced with `button` elements using `onClick` handlers.

## Migration Guide

### For Developers

#### 1. Adding a New Page

**Step 1:** Add page name to `PageName` type in `NavigationContext.tsx`:
```typescript
export type PageName =
  | 'welcome'
  | 'home'
  | 'my-new-page'  // Add here
  // ...
```

**Step 2:** Add case to `PageRenderer` in `App.tsx`:
```tsx
case 'my-new-page':
  return <PageWrapper><MyNewPage /></PageWrapper>
```

**Step 3:** Navigate from anywhere:
```tsx
const { navigate } = useNavigation()
navigate('my-new-page')
```

#### 2. Navigation with Parameters

For dynamic routes like `/new/post/:id`:

```tsx
// Navigate with params
navigate('new-post', { id: '123' })

// Access params in component
const { getParam } = useNavigation()
const postId = getParam('id')

// Or get all params
const { getParams } = useNavigation()
const params = getParams() // { id: '123' }
```

#### 3. Active State Detection

For highlighting active navigation items:

```tsx
const { isActive } = useNavigation()

// Simple check
<button
  className={isActive('home') ? 'active' : ''}
  onClick={() => navigate('home')}
>
  Home
</button>

// Check with specific params
<button
  className={isActive('new-post', { id: post.id }) ? 'active' : ''}
  onClick={() => navigate('new-post', { id: post.id })}
>
  {post.title}
</button>
```

## Files Modified

### Created
- `/src/renderer/src/contexts/NavigationContext.tsx` - New navigation system

### Updated
- `/src/renderer/src/App.tsx` - Removed Router, added NavigationProvider and PageRenderer
- `/src/renderer/src/components/AppLayout.tsx` - Replaced Links with buttons, useLocation/useNavigate with useNavigation
- `/src/renderer/src/pages/WelcomePage.tsx` - Replaced useNavigate with useNavigation
- `/src/renderer/src/pages/HomePage.tsx` - Replaced Link components with buttons
- `/src/renderer/src/pages/NewPostPage.tsx` - Replaced useParams with getParam

### To Be Removed (Future)
- `react-router-dom` from `package.json` (after thorough testing)

## Testing Checklist

Before removing the React Router dependency entirely:

- [ ] Test all navigation flows from sidebar
- [ ] Test Welcome page -> Home navigation
- [ ] Test quick action buttons on Home page
- [ ] Test post creation and navigation to post editor
- [ ] Test navigation to existing posts from sidebar
- [ ] Test Documents sub-navigation
- [ ] Test Settings navigation from popover
- [ ] Test active state highlighting in sidebar
- [ ] Test browser dev tools for memory leaks during navigation
- [ ] Test rapid navigation between pages

## Performance Considerations

### Memory Management

**Improved:**
- Only current page is mounted (previous pages fully unmounted)
- No hidden components in the DOM
- Explicit cleanup when navigating away

**Best Practices:**
- Use `useEffect` cleanup functions for subscriptions
- Avoid storing large objects in component state that persists across navigation
- Let React garbage collect unmounted components

### Re-render Optimization

The `NavigationContext` value is memoized using `useMemo`:
```typescript
const value = useMemo(
  () => ({
    current: navigationState,
    navigate,
    isActive,
    getParams,
    getParam
  }),
  [navigationState, navigate, isActive, getParams, getParam]
)
```

This prevents unnecessary re-renders of consuming components.

## Future Enhancements

### Potential Additions

1. **Navigation History**
   ```typescript
   const { goBack, goForward, history } = useNavigation()
   ```

2. **Navigation Guards**
   ```typescript
   const { navigate, canNavigate } = useNavigation()

   const allowed = await canNavigate('settings', async () => {
     return await checkPermissions()
   })
   ```

3. **Transition Animations**
   ```typescript
   <PageTransition direction={direction}>
     <PageRenderer />
   </PageTransition>
   ```

4. **Navigation Events**
   ```typescript
   useNavigationEvent('beforeNavigate', ({ from, to }) => {
     // Save unsaved changes, analytics, etc.
   })
   ```

5. **Nested Navigation**
   For complex pages with their own sub-navigation:
   ```typescript
   <NavigationProvider scope="settings">
     <SettingsSubNav />
   </NavigationProvider>
   ```

## Troubleshooting

### Common Issues

**Issue:** "useNavigation must be used within NavigationProvider"
- **Solution:** Ensure component is wrapped in `<NavigationProvider>`

**Issue:** Page state not persisting across navigation
- **Solution:** Move state to Redux or parent component that persists

**Issue:** Active state not updating
- **Solution:** Check if `isActive` is called with correct page name and params

**Issue:** TypeScript error on page name
- **Solution:** Add page name to `PageName` union type in NavigationContext

## Comparison Table

| Feature | React Router | Navigation Context |
|---------|--------------|-------------------|
| Bundle Size | ~50KB | ~2KB |
| URL Management | Yes | No (not needed) |
| Browser History | Yes | No (not needed) |
| Type Safety | Partial | Full |
| Memory Usage | Higher (keeps routes mounted) | Lower (unmounts inactive pages) |
| Complexity | High | Low |
| Learning Curve | Steep | Gentle |
| Electron Optimized | No | Yes |

## Conclusion

The migration from React Router to a context-based navigation system provides a simpler, more maintainable, and more performant solution for Tesseract AI. The custom system is tailored specifically for Electron desktop applications and provides better control over component lifecycle and memory management.

### Next Steps

1. Complete thorough testing of all navigation flows
2. Monitor for any edge cases or issues
3. Remove `react-router-dom` from dependencies after stabilization period
4. Consider implementing navigation history if needed
5. Add navigation analytics/telemetry if desired

---

**Last Updated:** 2026-02-20
**Author:** Claude (Assistant)
**Status:** Implementation Complete, Testing Required
