# Workspace Selection Feature

This document describes the workspace selection system implemented for Tesseract AI.

## Overview

The workspace selection feature allows users to choose a folder where their Tesseract AI projects will be stored. On first launch (or when no workspace is configured), a dedicated workspace selection window appears before the main application window.

## Architecture

### Main Process Components

#### 1. WorkspaceSelector (`src/main/workspace.ts`)
- Creates and manages a dedicated workspace selection window
- Handles IPC communication for folder selection
- Returns the selected workspace path as a Promise
- Supports cancel operation (returns null)

#### 2. StoreService Extensions (`src/main/services/store.ts`)
- Added workspace-related methods:
  - `getCurrentWorkspace()`: Get the current workspace path
  - `setCurrentWorkspace(path)`: Set and persist workspace path
  - `getRecentWorkspaces()`: Get list of recently used workspaces
  - `clearCurrentWorkspace()`: Clear workspace setting
- Stores up to 10 recent workspaces with timestamps
- Persists data in `settings.json` in userData directory

#### 3. Main Entry Point (`src/main/index.ts`)
- On `app.whenReady()`:
  1. Checks for existing workspace in StoreService
  2. If no workspace exists, shows WorkspaceSelector window
  3. If user cancels, quits the application
  4. If workspace is selected, saves it and continues to main window
  5. Creates main window with workspace context

#### 4. IPC Handlers (`src/main/main.ts`)
- `workspace:select-folder`: Opens native folder selection dialog
- `workspace:confirm`: Confirms workspace selection and closes selector
- `workspace:cancel`: Cancels workspace selection
- `workspace-get-current`: Returns current workspace path
- `workspace-set-current`: Sets current workspace path
- `workspace-get-recent`: Returns recent workspaces list
- `workspace-clear`: Clears current workspace

### Renderer Process Components

#### 1. WorkspaceSelectorPage (`src/renderer/src/pages/WorkspaceSelectorPage.tsx`)
A beautiful, standalone React component featuring:
- Browse button to select workspace folder
- Display of selected folder path
- Recent workspaces list with:
  - Folder names and full paths
  - Relative timestamps (e.g., "2 hours ago")
  - Click to select from recent workspaces
- "Open Workspace" button (disabled until selection)
- "Cancel" button to abort selection
- Responsive gradient background design
- Uses shadcn/ui components for consistent styling

#### 2. App Router (`src/renderer/src/App.tsx`)
- Added `/workspace-selector` route
- Route renders outside AppLayout (standalone page)
- All other routes remain wrapped in AppLayout

#### 3. Settings Page (`src/renderer/src/pages/SettingsPage.tsx`)
- Displays current workspace path in General settings tab
- Shows "Not set" if no workspace is configured
- Loads workspace on component mount

### Preload Bridge (`src/preload/index.ts` & `index.d.ts`)

Added workspace APIs to window.api:
```typescript
workspaceSelectFolder(): Promise<string | null>
workspaceConfirm(workspacePath: string): Promise<void>
workspaceCancel(): Promise<void>
workspaceGetCurrent(): Promise<string | null>
workspaceSetCurrent(workspacePath: string): Promise<void>
workspaceGetRecent(): Promise<WorkspaceInfo[]>
workspaceClear(): Promise<void>
```

## User Flow

### First Launch (No Workspace)
1. User launches Tesseract AI
2. Workspace selector window appears
3. User can:
   - Click "Browse Folder" to select a new workspace
   - Click on a recent workspace (if available from previous sessions)
   - Click "Cancel" to quit the application
4. After selecting a workspace, click "Open Workspace"
5. Workspace selector closes and main window opens

### Subsequent Launches (Workspace Configured)
1. User launches Tesseract AI
2. Application loads with previously selected workspace
3. Main window opens directly (no selector)

### Viewing Current Workspace
1. Open Settings (navigate to Settings page)
2. Go to "General" tab
3. View "Workspace" section showing current workspace path

## Data Persistence

### Storage Location
- File: `{userData}/settings.json`
- macOS: `~/Library/Application Support/Tesseract AI/settings.json`
- Windows: `%APPDATA%/Tesseract AI/settings.json`
- Linux: `~/.config/tesseract-ai/settings.json`

### Storage Schema
```json
{
  "currentWorkspace": "/path/to/workspace",
  "recentWorkspaces": [
    {
      "path": "/path/to/workspace",
      "lastOpened": 1707523200000
    }
  ],
  "modelSettings": { ... }
}
```

## Security Considerations

- All folder selection uses Electron's native `dialog.showOpenDialog`
- No arbitrary path input (prevents path injection)
- Context isolation enabled in all windows
- Workspace paths are validated by the OS dialog system

## Development

### Testing Workspace Selection

To test the workspace selector during development:

1. **Force workspace selector to appear:**
   ```javascript
   // In src/main/index.ts, temporarily disable workspace check
   let currentWorkspace = null; // Force this to be null
   ```

2. **Clear existing workspace:**
   - Delete or edit `{userData}/settings.json`
   - Remove `currentWorkspace` and `recentWorkspaces` fields

3. **Run in dev mode:**
   ```bash
   npm run dev
   ```

### File Locations

**Main Process:**
- `/src/main/workspace.ts` - Workspace selector window manager
- `/src/main/services/store.ts` - Workspace persistence
- `/src/main/index.ts` - Application entry with workspace logic
- `/src/main/main.ts` - IPC handlers

**Renderer Process:**
- `/src/renderer/src/pages/WorkspaceSelectorPage.tsx` - UI component
- `/src/renderer/src/App.tsx` - Router configuration
- `/src/renderer/src/pages/SettingsPage.tsx` - Workspace display

**Preload:**
- `/src/preload/index.ts` - API implementation
- `/src/preload/index.d.ts` - TypeScript definitions

## Future Enhancements

Potential improvements for the workspace feature:

1. **Multi-Workspace Support**
   - Switch between workspaces without restart
   - Workspace-specific settings

2. **Workspace Metadata**
   - Store workspace name/description
   - Project count and statistics
   - Custom workspace icons

3. **Workspace Management**
   - Remove from recent workspaces
   - Favorite workspaces
   - Workspace templates

4. **Workspace Validation**
   - Check workspace permissions
   - Validate workspace structure
   - Migrate legacy workspaces

5. **UI Enhancements**
   - Search recent workspaces
   - Sort/filter options
   - Workspace preview/details

## Troubleshooting

### Workspace Selector Not Appearing
- Check `settings.json` - ensure `currentWorkspace` is null or missing
- Verify workspace.ts is properly imported in index.ts
- Check console for errors during workspace selection

### Cannot Select Workspace
- Verify file permissions on target folder
- Check OS-level folder access permissions
- Ensure dialog service is properly initialized

### Recent Workspaces Not Saving
- Check `settings.json` write permissions
- Verify StoreService.save() is being called
- Check for file system errors in console

## Best Practices

1. **Always validate workspace paths** before storing
2. **Handle workspace errors gracefully** (folder deleted, no permissions, etc.)
3. **Provide clear feedback** to users during workspace operations
4. **Persist workspace settings** immediately after selection
5. **Test on all platforms** (macOS, Windows, Linux) for path handling

## Platform-Specific Notes

### macOS
- Uses native folder picker with macOS styling
- Workspace stored in `~/Library/Application Support`
- Handles `.app` bundle paths correctly

### Windows
- Uses native Windows folder dialog
- Workspace stored in `%APPDATA%`
- Handles drive letters and UNC paths

### Linux
- Uses GTK+ folder dialog (or KDE equivalent)
- Workspace stored in `~/.config`
- Handles symbolic links properly
