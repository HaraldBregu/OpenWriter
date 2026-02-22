# Troubleshooting IPC Handler Registration Issues

## Error: "No handler registered for 'documents:load-all'"

### Symptom

```
Error occurred in handler for 'documents:load-all': Error: No handler registered for 'documents:load-all'
    at Session.<anonymous> (node:electron/js2c/browser_init:2:116556)
```

User reports: "is not showing the files under documents folder"

### Root Cause

This error typically means Electron cannot find the IPC handler. After our recent changes to support window-scoped services, all IPC handlers were updated. However, if you're seeing this error, it likely means:

**The app is running with OLD CODE (before the fixes were applied)**

### Solution

**RESTART THE APP WITH THE NEW BUILD:**

1. **Stop the running app** (if it's running)

2. **Clean build artifacts** (optional but recommended):
   ```bash
   npm run clean
   ```

3. **Rebuild the app**:
   ```bash
   npm run build:dev
   ```

4. **Start the app**:
   ```bash
   npm run dev
   ```

### Verification

After restarting, check the console logs for:

```
[Bootstrap] Registering IPC modules...
[IPC] Registered documents module
[IPC] Registered posts module
[IPC] Registered workspace module
[IPC] Registered directories module
... (other modules)
[Bootstrap] Registered X IPC modules
```

If you see these logs, the handlers are registered correctly.

### Why This Happens

When making code changes to IPC handlers:
1. Changes are made to TypeScript source files
2. TypeScript is compiled to JavaScript in `/out` directory
3. **Electron must be restarted** to load the new JavaScript files
4. Hot reload does NOT work for main process code changes

**Important:** Main process code is NOT hot-reloaded like renderer code. You MUST restart Electron after changes to:
- IPC handlers
- Services
- Main process utilities
- Bootstrap code

### Alternative: Use Dev Mode with Auto-Restart

For development, use a tool that auto-restarts Electron when main process files change:

```bash
# This watches for changes and restarts automatically
npm run dev
```

However, even with `npm run dev`, you may need to manually restart after major changes to ensure clean state.

### Debugging Steps

If restarting doesn't fix the issue:

#### 1. Verify Handler Registration

Check if the handler is actually being registered:

```bash
# Search for the handler in the built code
grep -r "documents:load-all" out/main/
```

Should output:
```
out/main/index.js:      'documents:load-all',
out/main/index.js:      }, 'documents:load-all')
```

#### 2. Check for Registration Errors

Look for errors during IPC module registration:

```bash
npm run dev 2>&1 | grep -i "failed to register"
```

If you see errors like:
```
[Bootstrap] Failed to register IPC module: documents Error: Service "workspace" not found
```

This means the window-scoped service migration wasn't complete. Check:
- Is `getWindowService()` being used in the handler?
- Is `wrapIpcHandler` being used instead of `wrapSimpleHandler`?

#### 3. Verify Bootstrap

Check that DocumentsIpc is in the bootstrap modules list:

```typescript
// src/main/bootstrap.ts
const ipcModules: IpcModule[] = [
  // ...
  new DocumentsIpc(),  // ✅ Should be here
  // ...
]
```

#### 4. Check Build Output

Verify the build completed successfully:

```bash
npm run build:dev
```

Should end with:
```
✓ built in XXs
```

No errors should appear.

#### 5. Check for TypeScript Errors

```bash
npm run typecheck
```

Should complete with no errors.

### Common Mistakes

#### Mistake 1: Not Restarting After Changes

```
❌ Make changes → Save → Expect it to work
✅ Make changes → Save → Rebuild → Restart Electron
```

#### Mistake 2: Using Old Build

```
❌ npm run dev (uses old cached build)
✅ npm run clean && npm run build:dev && npm run dev
```

#### Mistake 3: Checking Wrong Process

```
❌ Looking at renderer console (Command+Option+I)
✅ Looking at main process console (terminal where npm run dev is running)
```

### Quick Fix Checklist

- [ ] Stop the running Electron app
- [ ] Run `npm run clean` (clears out/ directory)
- [ ] Run `npm run build:dev` (rebuilds everything)
- [ ] Run `npm run dev` (starts fresh app)
- [ ] Check console for "[IPC] Registered documents module"
- [ ] Try the operation again

### Still Not Working?

If the handler still isn't found after rebuilding and restarting:

1. **Check the actual source code**:
   ```bash
   # Verify the handler exists in source
   grep -A 5 "documents:load-all" src/main/ipc/DocumentsIpc.ts
   ```

2. **Check imports**:
   ```typescript
   // Should have these imports
   import { wrapIpcHandler } from './IpcErrorHandler'
   import { getWindowService } from './IpcHelpers'
   ```

3. **Check handler structure**:
   ```typescript
   ipcMain.handle(
     'documents:load-all',
     wrapIpcHandler(async (event: IpcMainInvokeEvent): Promise<DocumentMetadata[]> => {
       const workspace = getWindowService<WorkspaceService>(event, container, 'workspace')
       // ... handler code
     }, 'documents:load-all')  // ✅ Channel name matches
   )
   ```

4. **Verify no exceptions during registration**:
   - Add console.log at start of register() method
   - Add console.log after each ipcMain.handle() call
   - Check if all logs appear or if registration stops partway

### Dev Workflow Best Practices

For efficient development with IPC handlers:

1. **Use separate terminals**:
   - Terminal 1: `npm run dev` (running app)
   - Terminal 2: For git, npm commands, etc.

2. **After making changes**:
   - Press Ctrl+C in Terminal 1 to stop app
   - Run `npm run dev` again to rebuild and restart
   - Watch console for registration logs

3. **Use logging liberally**:
   ```typescript
   console.log('[DocumentsIpc] Handler called with event:', event)
   console.log('[DocumentsIpc] Workspace:', workspace.getCurrent())
   ```

4. **Test incrementally**:
   - Make small changes
   - Restart and test
   - Confirm it works before moving on

### Related Issues

- If you see "Service 'workspace' not found" → See [WINDOW_SCOPED_IPC_MIGRATION.md](./WINDOW_SCOPED_IPC_MIGRATION.md)
- If you see "Cannot read properties of undefined" → See [IPC_HANDLER_FIX.md](./IPC_HANDLER_FIX.md)
- For window isolation issues → See [WINDOW_SCOPED_SERVICES.md](./WINDOW_SCOPED_SERVICES.md)
