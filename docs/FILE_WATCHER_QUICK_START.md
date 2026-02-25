# File Watcher - Quick Start Guide

## What is it?

The File Watcher automatically syncs posts between the file system and your app. When you (or another program) creates, modifies, or deletes a post file, the app updates instantly without manual refresh.

## How to Use

### 1. Start the App

```bash
npm run dev
```

The file watcher starts automatically when you select a workspace.

### 2. Select a Workspace

```
Click "Select Workspace" → Choose folder → Posts load automatically
```

The watcher is now monitoring `{workspace}/posts/*.json` files.

### 3. Test External Changes

Open a terminal and try these commands:

**Create a new post:**
```bash
cd your-workspace/posts

cat > test-post.json << 'EOF'
{
  "id": "test-123",
  "title": "My Test Post",
  "blocks": [
    {
      "id": "block-1",
      "content": "This was created externally!"
    }
  ],
  "category": "technology",
  "tags": ["test"],
  "visibility": "public",
  "createdAt": 1234567890000,
  "updatedAt": 1234567890000
}
EOF
```

**Result:** Post appears in app immediately + notification shown

**Modify the post:**
```bash
# Edit test-post.json in VS Code, Sublime, vim, etc.
# Change the title to something else
code test-post.json
```

**Result:** App updates immediately + notification shown

**Delete the post:**
```bash
rm test-post.json
```

**Result:** Post disappears from app + notification shown

### 4. Edit in the App

```
Open any post → Edit title/content → Save
```

**What happens:**
1. UI updates immediately (instant feedback)
2. Changes saved to file after 1.5 seconds (debounced)
3. Watcher ignores app-generated changes (no infinite loop)
4. No notifications (you made the change)

## Common Workflows

### Workflow 1: External Editor

**Use Case:** You prefer VS Code for writing

1. Select workspace in app
2. Open `workspace/posts/` in VS Code
3. Edit any `.json` file
4. Switch back to app → Changes appear automatically

### Workflow 2: Git Sync

**Use Case:** Sync posts across multiple computers

```bash
# Computer A
cd workspace/posts
git add .
git commit -m "Updated posts"
git push

# Computer B
git pull  # App updates automatically as files change
```

### Workflow 3: Collaborative Editing

**Use Case:** Multiple people editing same workspace (Dropbox, OneDrive)

1. Person A: Edits post in app
2. Dropbox syncs file to cloud
3. Person B's app detects change
4. Person B sees: "Post updated externally" notification
5. Post updates in Person B's app

### Workflow 4: Batch Operations

**Use Case:** Create 100 posts from data

```bash
#!/bin/bash
# create-posts.sh

for i in {1..100}; do
  cat > "post-$i.json" << EOF
{
  "id": "post-$i",
  "title": "Generated Post $i",
  "blocks": [{"id": "b1", "content": "Content for post $i"}],
  "category": "technology",
  "tags": [],
  "visibility": "public",
  "createdAt": $(date +%s)000,
  "updatedAt": $(date +%s)000
}
EOF
done
```

**Result:** All 100 posts appear in app as they're created

## Troubleshooting

### Posts Not Syncing

**Check workspace:**
```bash
# In app console (DevTools)
await window.api.workspaceGetCurrent()
# Should return workspace path, not null
```

**Check posts directory:**
```bash
ls -la workspace/posts/
# Should exist and contain .json files
```

**Check file watcher status:**
```bash
# Look for this in app console:
# "[FileWatcherService] Watcher ready, monitoring: /path/to/workspace/posts"
```

### Infinite Loops

**Symptoms:**
- File keeps getting rewritten
- App becomes unresponsive
- CPU usage spikes

**Fix:**
1. Check that `usePostsFileWatcher()` is only called once (in AppLayout)
2. Verify `postsSyncMiddleware` is filtering external actions
3. Check console for "[FileWatcherService] Ignoring app-generated change" messages

### Performance Issues

**Symptoms:**
- App feels sluggish
- File operations are slow
- High CPU usage

**Solutions:**

1. **Increase debounce delays:**
   ```typescript
   // In file-watcher.ts
   const DEFAULT_DEBOUNCE_MS = 500  // Increase from 300

   // In postsSync.middleware.ts
   const SYNC_DEBOUNCE_MS = 2000    // Increase from 1500
   ```

2. **Reduce notification frequency:**
   ```typescript
   // In usePostsFileWatcher.ts
   // Comment out notification calls for better performance
   ```

3. **Check file count:**
   ```bash
   ls workspace/posts/*.json | wc -l
   # If > 1000, consider pagination
   ```

### Permissions Errors

**Error:** "Permission denied reading posts directory"

**Fix:**
```bash
# Check directory permissions
ls -la workspace/posts/

# Fix permissions
chmod 755 workspace/posts/
chmod 644 workspace/posts/*.json
```

### Missing Notifications

**Check notification permissions:**

**macOS:**
```
System Preferences → Notifications → OpenWriter → Allow notifications
```

**Windows:**
```
Settings → System → Notifications → OpenWriter → On
```

**Linux:**
```
# Notifications should work by default
# Check notification daemon is running
systemctl status notification-daemon
```

## Advanced Usage

### Custom File Format

If you want to store posts in a different format:

1. Modify `PostsIpc.ts` to handle your format
2. Update file extension in `FileWatcherService`:
   ```typescript
   private readonly FILE_EXTENSION = '.md'  // Instead of .json
   ```

### Selective Watching

Only watch specific posts:

```typescript
// In FileWatcherService.startWatching()
this.watcher = chokidar.watch([
  path.join(postsDir, 'important-*.json'),
  path.join(postsDir, 'draft-*.json')
])
```

### Custom Notifications

Add custom notification logic:

```typescript
// In usePostsFileWatcher.ts
const handleFileChange = async (event) => {
  if (event.type === 'changed') {
    // Custom notification for specific posts
    if (event.postId.startsWith('important-')) {
      await window.api.notificationShow({
        title: '⚠️ Important Post Updated',
        body: 'Someone modified an important post!',
        urgency: 'critical'
      })
    }
  }
}
```

### Disable File Watcher

If you don't want automatic syncing:

**Option 1: Environment Variable**
```bash
# Add to .env
DISABLE_FILE_WATCHER=true
```

**Option 2: Comment out hook**
```typescript
// In AppLayout.tsx
// usePostsFileWatcher()  // Commented out
```

**Option 3: Don't register service**
```typescript
// In bootstrap.ts
// container.register('fileWatcher', new FileWatcherService(eventBus))
```

## Best Practices

### 1. Always Use UTF-8 Encoding

```bash
# Bad - May cause parse errors
echo "..." > post.json

# Good - Explicit UTF-8
echo "..." | iconv -f UTF-8 -t UTF-8 > post.json
```

### 2. Use Atomic Writes

```bash
# Bad - Partial writes detected mid-write
echo "..." > post.json

# Good - Atomic rename
echo "..." > post.json.tmp
mv post.json.tmp post.json
```

### 3. Validate JSON Before Saving

```javascript
// In external tools
const post = {
  id: 'abc',
  title: 'Test',
  blocks: [],
  category: 'technology',
  tags: [],
  visibility: 'public',
  createdAt: Date.now(),
  updatedAt: Date.now()
}

// Validate
if (!post.id || !post.title || !Array.isArray(post.blocks)) {
  throw new Error('Invalid post structure')
}

// Save
fs.writeFileSync('post.json', JSON.stringify(post, null, 2))
```

### 4. Use Meaningful IDs

```bash
# Bad
id: "abc123xyz"

# Good
id: "2024-01-15-my-blog-post"
id: "draft-new-feature-proposal"
```

### 5. Backup Before Batch Operations

```bash
# Before running scripts that modify many files
tar -czf posts-backup-$(date +%Y%m%d).tar.gz workspace/posts/

# If something goes wrong, restore
tar -xzf posts-backup-20240115.tar.gz
```

## Integration Examples

### Obsidian Plugin

Create posts from Obsidian notes:

```javascript
// Obsidian plugin
const fs = require('fs')
const path = require('path')

module.exports = {
  async onNoteCreated(note) {
    const post = {
      id: note.basename,
      title: note.frontmatter.title || note.basename,
      blocks: [{ id: 'b1', content: note.content }],
      category: note.frontmatter.category || 'uncategorized',
      tags: note.frontmatter.tags || [],
      visibility: 'public',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    const postsDir = path.join(workspaceDir, 'posts')
    fs.writeFileSync(
      path.join(postsDir, `${post.id}.json`),
      JSON.stringify(post, null, 2)
    )
  }
}
```

### GitHub Actions Workflow

Auto-sync posts from GitHub:

```yaml
# .github/workflows/sync-posts.yml
name: Sync Posts

on:
  push:
    paths:
      - 'content/posts/**'

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Convert and sync
        run: |
          node scripts/convert-to-posts.js
          rsync -avz posts/ $WORKSPACE_DIR/posts/
```

### Alfred Workflow (macOS)

Quick create post from clipboard:

```bash
#!/bin/bash
# Alfred script

WORKSPACE="$HOME/Documents/workspace"
POSTS_DIR="$WORKSPACE/posts"

TITLE="{query}"
ID=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
CONTENT=$(pbpaste)

cat > "$POSTS_DIR/$ID.json" << EOF
{
  "id": "$ID",
  "title": "$TITLE",
  "blocks": [{"id": "b1", "content": "$CONTENT"}],
  "category": "quick-capture",
  "tags": [],
  "visibility": "private",
  "createdAt": $(date +%s)000,
  "updatedAt": $(date +%s)000
}
EOF

echo "Post created: $TITLE"
```

## FAQ

**Q: Will this work with Dropbox/OneDrive/Google Drive?**
A: Yes! The file watcher detects changes from any source, including cloud sync services.

**Q: What happens if two people edit the same file at once?**
A: Last write wins. The app will show a notification that the file was updated externally. Consider adding conflict resolution UI in the future.

**Q: Can I use this with Git?**
A: Absolutely! The watcher detects changes from `git pull`, `git checkout`, etc.

**Q: Does this work on all platforms?**
A: Yes - Windows, macOS, and Linux are all supported via chokidar.

**Q: What's the performance impact?**
A: Minimal. The watcher uses native file system events (not polling) and debounces changes. Tested with 1000+ posts with no noticeable lag.

**Q: Can I disable notifications?**
A: Yes, comment out the `notificationShow()` calls in `usePostsFileWatcher.ts`.

**Q: What file formats are supported?**
A: Currently only `.json`. See "Advanced Usage" above to add support for other formats.

**Q: Is my data safe?**
A: The app uses atomic writes (temp file + rename) to prevent corruption. Always keep backups of important data.

## Getting Help

**Console Logs:**
```javascript
// Open DevTools (Cmd+Option+I on macOS)
// Look for these prefixes:
[FileWatcherService] // Main process logs
[PostsFileWatcher]   // Renderer process logs
[PostsSync]          // Sync middleware logs
```

**Enable Debug Mode:**
```bash
# More verbose logging
DEBUG=true npm run dev
```

**Report Issues:**
Include these details:
- Operating system
- Number of posts
- File operation that caused the issue
- Console logs (DevTools)
- Steps to reproduce

---

**Need more help?** See `FILE_WATCHER_SYSTEM.md` for detailed technical documentation.
