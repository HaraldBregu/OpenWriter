# Workspace Selection System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ELECTRON APP                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              MAIN PROCESS (Node.js)                     │    │
│  │                                                         │    │
│  │  ┌─────────────────────────────────────────────┐      │    │
│  │  │  index.ts - Application Entry Point          │      │    │
│  │  │                                              │      │    │
│  │  │  1. app.whenReady()                          │      │    │
│  │  │  2. Check StoreService for workspace         │      │    │
│  │  │  3. If no workspace → WorkspaceSelector     │      │    │
│  │  │  4. If cancelled → app.quit()                │      │    │
│  │  │  5. If selected → save & create Main Window │      │    │
│  │  └─────────────────────────────────────────────┘      │    │
│  │           ↓                          ↓                  │    │
│  │  ┌─────────────────┐     ┌────────────────────────┐  │    │
│  │  │ WorkspaceSelector│     │    StoreService        │  │    │
│  │  │  (workspace.ts)  │←────│ (store.ts)             │  │    │
│  │  │                  │     │                        │  │    │
│  │  │ - Creates window │     │ - getCurrentWorkspace()│  │    │
│  │  │ - IPC handlers   │     │ - setCurrentWorkspace()│  │    │
│  │  │ - Returns Promise│     │ - getRecentWorkspaces()│  │    │
│  │  └─────────────────┘     │ - clearCurrentWorkspace│  │    │
│  │                           └────────────────────────┘  │    │
│  │                                    ↓                   │    │
│  │                           ┌────────────────────┐      │    │
│  │                           │  settings.json     │      │    │
│  │                           │  (userData dir)    │      │    │
│  │                           │                    │      │    │
│  │                           │ {                  │      │    │
│  │                           │   currentWorkspace,│      │    │
│  │                           │   recentWorkspaces │      │    │
│  │                           │ }                  │      │    │
│  │                           └────────────────────┘      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                                │
│  ═════════════════════ IPC BRIDGE ════════════════════════   │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │         PRELOAD SCRIPT (preload/index.ts)              │  │
│  │                                                         │  │
│  │  window.api.workspaceSelectFolder()                    │  │
│  │  window.api.workspaceConfirm(path)                     │  │
│  │  window.api.workspaceCancel()                          │  │
│  │  window.api.workspaceGetCurrent()                      │  │
│  │  window.api.workspaceSetCurrent(path)                  │  │
│  │  window.api.workspaceGetRecent()                       │  │
│  │  window.api.workspaceClear()                           │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                                │
│  ═════════════════════════════════════════════════════════   │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │       RENDERER PROCESS (Chromium/React)                │  │
│  │                                                         │  │
│  │  ┌──────────────────────────────────────────────┐     │  │
│  │  │  App.tsx - Router                             │     │  │
│  │  │                                               │     │  │
│  │  │  /workspace-selector (no AppLayout)          │     │  │
│  │  │  /* (all other routes with AppLayout)        │     │  │
│  │  └──────────────────────────────────────────────┘     │  │
│  │           ↓                         ↓                   │  │
│  │  ┌─────────────────────┐  ┌──────────────────────┐   │  │
│  │  │ WorkspaceSelector   │  │  SettingsPage        │   │  │
│  │  │ Page.tsx            │  │  (General Tab)       │   │  │
│  │  │                     │  │                      │   │  │
│  │  │ - Browse button     │  │ - Display current    │   │  │
│  │  │ - Recent list       │  │   workspace path     │   │  │
│  │  │ - Open/Cancel btns  │  │                      │   │  │
│  │  └─────────────────────┘  └──────────────────────┘   │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                                │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

### First Launch Flow (No Workspace)

```
┌─────────────┐
│ App Launch  │
└──────┬──────┘
       │
       ↓
┌─────────────────────────────────────┐
│ index.ts: app.whenReady()           │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│ StoreService.getCurrentWorkspace()  │
│ Returns: null                        │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│ WorkspaceSelector.show()            │
│ (Creates BrowserWindow)             │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│ WorkspaceSelectorPage renders       │
│ - Shows browse button               │
│ - Shows recent workspaces           │
└──────┬──────────────────────────────┘
       │
       ↓ [User browses]
┌─────────────────────────────────────┐
│ User clicks "Browse Folder"         │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│ api.workspaceSelectFolder()         │
│ → IPC: workspace:select-folder      │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│ dialog.showOpenDialog()             │
│ (Native OS folder picker)           │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│ Returns: /path/to/workspace         │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│ UI updates with selected path       │
│ "Open Workspace" button enabled     │
└──────┬──────────────────────────────┘
       │
       ↓ [User confirms]
┌─────────────────────────────────────┐
│ api.workspaceConfirm(path)          │
│ → IPC: workspace:confirm            │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│ WorkspaceSelector Promise resolves  │
│ Returns: /path/to/workspace         │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│ StoreService.setCurrentWorkspace()  │
│ - Saves to settings.json            │
│ - Adds to recent list               │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│ Main.create()                       │
│ (Main application window opens)     │
└─────────────────────────────────────┘
```

### Subsequent Launch Flow (Has Workspace)

```
┌─────────────┐
│ App Launch  │
└──────┬──────┘
       │
       ↓
┌─────────────────────────────────────┐
│ index.ts: app.whenReady()           │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│ StoreService.getCurrentWorkspace()  │
│ Returns: /path/to/workspace         │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│ Main.create()                       │
│ (Skip workspace selector)           │
│ (Main window opens directly)        │
└─────────────────────────────────────┘
```

### Cancel Flow

```
┌─────────────┐
│ App Launch  │
└──────┬──────┘
       │
       ↓
┌─────────────────────────────────────┐
│ WorkspaceSelector shows             │
└──────┬──────────────────────────────┘
       │
       ↓ [User clicks Cancel]
┌─────────────────────────────────────┐
│ api.workspaceCancel()               │
│ → IPC: workspace:cancel             │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│ WorkspaceSelector Promise resolves  │
│ Returns: null                        │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│ app.quit()                          │
│ (Application exits)                 │
└─────────────────────────────────────┘
```

## Component Communication

```
┌──────────────────────┐
│  WorkspaceSelectorPage │
│  (React Component)     │
└───────────┬────────────┘
            │
            │ window.api.*
            ↓
┌──────────────────────┐
│  Preload Script      │
│  (IPC Bridge)        │
└───────────┬────────────┘
            │
            │ ipcRenderer.invoke()
            ↓
┌──────────────────────┐
│  Main Process        │
│  (IPC Handlers)      │
└───────────┬────────────┘
            │
            ↓
    ┌───────┴────────┐
    │                │
┌───────────┐  ┌────────────┐
│Workspace  │  │  Store     │
│Selector   │  │  Service   │
└───────────┘  └────────────┘
```

## Storage Schema

```json
{
  "currentWorkspace": "/Users/username/Documents/MyWorkspace",
  "recentWorkspaces": [
    {
      "path": "/Users/username/Documents/MyWorkspace",
      "lastOpened": 1707523200000
    },
    {
      "path": "/Users/username/Documents/OldWorkspace",
      "lastOpened": 1707436800000
    }
  ],
  "modelSettings": {
    "anthropic": {
      "selectedModel": "claude-sonnet-4-5-20250929",
      "apiToken": "sk-ant-..."
    }
  }
}
```

## IPC Communication Channels

### Main → Renderer
- None (workspace selection is renderer-initiated)

### Renderer → Main
| Channel | Direction | Type | Purpose |
|---------|-----------|------|---------|
| `workspace:select-folder` | → | invoke | Open native folder picker |
| `workspace:confirm` | → | invoke | Confirm workspace selection |
| `workspace:cancel` | → | invoke | Cancel workspace selection |
| `workspace-get-current` | → | invoke | Get current workspace path |
| `workspace-set-current` | → | invoke | Set current workspace path |
| `workspace-get-recent` | → | invoke | Get recent workspaces list |
| `workspace-clear` | → | invoke | Clear current workspace |

## File System Structure

```
OpenWriter/
├── app/
│   ├── main/
│   │   ├── index.ts ────────────► Entry point with workspace check
│   │   ├── workspace.ts ────────► WorkspaceSelector class
│   │   ├── main.ts ─────────────► IPC handlers
│   │   └── services/
│   │       └── store.ts ────────► Storage with workspace methods
│   │
│   ├── preload/
│   │   ├── index.ts ────────────► API bridge
│   │   └── index.d.ts ──────────► TypeScript definitions
│   │
│   └── renderer/
│       └── src/
│           ├── App.tsx ─────────► Router with /workspace-selector
│           └── pages/
│               ├── WorkspaceSelectorPage.tsx ► Workspace UI
│               └── SettingsPage.tsx ──────────► Shows current workspace
│
└── userData/
    └── settings.json ──────────► Persisted workspace + settings
```

## Security Model

```
┌────────────────────────────────────────┐
│         Renderer Process                │
│       (Sandboxed/Isolated)             │
│                                         │
│  ✓ No direct filesystem access         │
│  ✓ No direct Node.js access            │
│  ✓ Must use IPC for all operations     │
└──────────────┬─────────────────────────┘
               │
               │ Context Bridge
               ↓
┌────────────────────────────────────────┐
│         Preload Script                  │
│    (Limited privileged context)         │
│                                         │
│  ✓ Exposes only specific APIs          │
│  ✓ No arbitrary code execution         │
│  ✓ Type-safe API surface               │
└──────────────┬─────────────────────────┘
               │
               │ IPC
               ↓
┌────────────────────────────────────────┐
│         Main Process                    │
│       (Full Node.js access)             │
│                                         │
│  ✓ Validates all requests              │
│  ✓ Uses native OS dialogs              │
│  ✓ Controls filesystem access          │
└────────────────────────────────────────┘
```

## Cross-Platform Compatibility

```
┌─────────────────────────────────────────────────┐
│              Workspace Selector                 │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │  macOS   │  │ Windows  │  │  Linux   │     │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘     │
│       │             │              │            │
│       ↓             ↓              ↓            │
│  ┌────────────────────────────────────┐        │
│  │  dialog.showOpenDialog()           │        │
│  │  (Electron's native dialog API)    │        │
│  └────────────────────────────────────┘        │
│       │             │              │            │
│       ↓             ↓              ↓            │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │ Cocoa   │  │ Win32   │  │  GTK+   │        │
│  │ Dialog  │  │ Dialog  │  │  Dialog │        │
│  └─────────┘  └─────────┘  └─────────┘        │
│                                                  │
└─────────────────────────────────────────────────┘
```

## State Management

```
Application State
├── Persistent (settings.json)
│   ├── currentWorkspace: string | null
│   └── recentWorkspaces: WorkspaceInfo[]
│
└── Runtime (in-memory)
    ├── WorkspaceSelector
    │   ├── window: BrowserWindow | null
    │   ├── selectedWorkspace: string | null
    │   └── resolveWorkspace: Function | null
    │
    └── StoreService
        └── data: StoreSchema (loaded from disk)
```
