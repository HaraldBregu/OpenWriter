# Posts IPC Quick Start Guide

## TL;DR

The Posts IPC system is now **fully implemented and ready to use**. All files sync to `workspace/posts/*.json`.

## Quick API Reference

### Sync All Posts
```typescript
const result = await window.api.postsSyncToWorkspace(posts)
console.log(`Synced ${result.syncedCount} posts`)
```

### Update Single Post
```typescript
await window.api.postsUpdatePost(post)
```

### Delete Post
```typescript
await window.api.postsDeletePost(postId)
```

### Load Posts
```typescript
const posts = await window.api.postsLoadFromWorkspace()
```

## Already Working

These features are **already implemented and working**:

✅ **Auto-Save** - Posts automatically sync to workspace after 1.5 seconds of inactivity
✅ **Load on Startup** - Posts load from workspace when app starts
✅ **Error Handling** - Graceful error handling with notifications
✅ **Atomic Writes** - Safe file writes prevent corruption
✅ **Type Safety** - Full TypeScript support with IntelliSense

## File Locations

### Main Implementation
- **IPC Handler**: `src/main/ipc/PostsIpc.ts`
- **Preload Bridge**: `src/preload/index.ts`
- **Type Definitions**: `src/preload/index.d.ts`

### Already Integrated
- **Auto-Sync Middleware**: `src/renderer/src/store/middleware/postsSync.middleware.ts`
- **Load Hook**: `src/renderer/src/hooks/usePostsLoader.ts`
- **Redux Slice**: `src/renderer/src/store/postsSlice.ts`

### Documentation
- **Usage Guide**: `src/main/ipc/POSTS_IPC_USAGE.md` (comprehensive)
- **Examples**: `src/renderer/src/examples/posts-ipc-example.tsx` (10 examples)
- **Implementation Details**: `POSTS_IPC_IMPLEMENTATION.md` (this repo)

## Quick Test

1. **Select a workspace**:
   ```typescript
   await window.api.workspaceSetCurrent('/path/to/workspace')
   ```

2. **Create a post** (via Redux):
   ```typescript
   dispatch(createPost())
   ```

3. **Wait 1.5 seconds** - Post auto-syncs to workspace

4. **Check filesystem**:
   ```bash
   ls /path/to/workspace/posts/
   # Should show: {postId}.json
   ```

5. **Reload app** - Posts load automatically from workspace

## Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| "No workspace selected" | No active workspace | Select a workspace first |
| "Permission denied" | Can't write to directory | Check folder permissions |
| "Disk full" | Out of disk space | Free up disk space |

## Integration Points

### Where to Use
- ✅ Already working in middleware (auto-sync)
- ✅ Already working in hooks (load on start)
- Add manual sync buttons in UI if needed
- Add export/import features if needed

### Don't Need To
- ❌ Manually sync after every change (middleware does this)
- ❌ Manually load posts on start (hook does this)
- ❌ Worry about corruption (atomic writes handle it)

## Next Actions

The system is **ready to use as-is**. Optional enhancements:

1. **File Watching** - Detect external changes to post files
2. **Conflict Resolution** - Handle concurrent edits
3. **Backup System** - Keep previous versions
4. **Import/Export UI** - User-facing bulk operations

## Need Help?

- **Full Guide**: `src/main/ipc/POSTS_IPC_USAGE.md`
- **Examples**: `src/renderer/src/examples/posts-ipc-example.tsx`
- **Implementation**: `POSTS_IPC_IMPLEMENTATION.md`

## Status

✅ **Main Process**: Type-safe, tested, working
✅ **Preload Bridge**: Exposed to renderer
✅ **Type Definitions**: Full IntelliSense support
✅ **Integration**: Middleware and hooks ready
✅ **Documentation**: Comprehensive guides

**The Posts IPC system is production-ready.**
