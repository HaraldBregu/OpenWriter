import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

/**
 * IPC Result types matching the main process wrappers
 */
interface IpcError {
  success: false
  error: {
    code: string
    message: string
    stack?: string
  }
}

interface IpcSuccess<T> {
  success: true
  data: T
}

type IpcResult<T> = IpcSuccess<T> | IpcError

/**
 * Helper to unwrap IpcResult from main process handlers
 * Throws an error if the IPC call failed
 */
async function unwrapIpcResult<T>(promise: Promise<IpcResult<T>>): Promise<T> {
  const result = await promise
  if (result.success) {
    return result.data
  } else {
    const error = new Error(result.error.message)
    error.name = result.error.code
    if (result.error.stack) {
      error.stack = result.error.stack
    }
    throw error
  }
}

const api = {
    playSound: (): void => {
        ipcRenderer.send('play-sound')
    },
    showContextMenu: (): void => {
        ipcRenderer.send('context-menu')
    },
    showContextMenuEditable: (): void => {
        ipcRenderer.send('context-menu-editable')
    },
    onLanguageChange: (callback: (lng: string) => void): (() => void) => {
        const handler = (_event: Electron.IpcRendererEvent, lng: string): void => {
            callback(lng)
        }
        ipcRenderer.on('change-language', handler)
        return () => {
            ipcRenderer.removeListener('change-language', handler)
        }
    },
    onThemeChange: (callback: (theme: string) => void): (() => void) => {
        const handler = (_event: Electron.IpcRendererEvent, theme: string): void => {
            callback(theme)
        }
        ipcRenderer.on('change-theme', handler)
        return () => {
            ipcRenderer.removeListener('change-theme', handler)
        }
    },
    onFileOpened: (callback: (filePath: string) => void): (() => void) => {
        const handler = (_event: Electron.IpcRendererEvent, filePath: string): void => {
            callback(filePath)
        }
        ipcRenderer.on('file-opened', handler)
        return () => {
            ipcRenderer.removeListener('file-opened', handler)
        }
    },
    // Media permissions
    requestMicrophonePermission: (): Promise<string> => {
        return ipcRenderer.invoke('request-microphone-permission')
    },
    requestCameraPermission: (): Promise<string> => {
        return ipcRenderer.invoke('request-camera-permission')
    },
    getMicrophonePermissionStatus: (): Promise<string> => {
        return ipcRenderer.invoke('get-microphone-status')
    },
    getCameraPermissionStatus: (): Promise<string> => {
        return ipcRenderer.invoke('get-camera-status')
    },
    getMediaDevices: (type: 'audioinput' | 'videoinput'): Promise<MediaDeviceInfo[]> => {
        return ipcRenderer.invoke('get-media-devices', type)
    },
    // Bluetooth
    bluetoothIsSupported: (): Promise<boolean> => {
        return ipcRenderer.invoke('bluetooth-is-supported')
    },
    bluetoothGetPermissionStatus: (): Promise<string> => {
        return ipcRenderer.invoke('bluetooth-get-permission-status')
    },
    bluetoothGetInfo: (): Promise<{ platform: string; supported: boolean; apiAvailable: boolean }> => {
        return ipcRenderer.invoke('bluetooth-get-info')
    },
    // Network
    networkIsSupported: (): Promise<boolean> => {
        return ipcRenderer.invoke('network-is-supported')
    },
    networkGetConnectionStatus: (): Promise<string> => {
        return ipcRenderer.invoke('network-get-connection-status')
    },
    networkGetInterfaces: (): Promise<Array<{
        name: string
        family: 'IPv4' | 'IPv6'
        address: string
        netmask: string
        mac: string
        internal: boolean
        cidr: string | null
    }>> => {
        return ipcRenderer.invoke('network-get-interfaces')
    },
    networkGetInfo: (): Promise<{
        platform: string
        supported: boolean
        isOnline: boolean
        interfaceCount: number
    }> => {
        return ipcRenderer.invoke('network-get-info')
    },
    onNetworkStatusChange: (callback: (status: string) => void): (() => void) => {
        const handler = (_event: Electron.IpcRendererEvent, status: string): void => {
            callback(status)
        }
        ipcRenderer.on('network-status-changed', handler)
        return () => {
            ipcRenderer.removeListener('network-status-changed', handler)
        }
    },
    // Cron
    cronGetAllJobs: (): Promise<Array<{
        id: string
        name: string
        schedule: string
        enabled: boolean
        running: boolean
        lastRun?: Date
        nextRun?: Date
        runCount: number
        description?: string
        humanReadable?: string
    }>> => {
        return ipcRenderer.invoke('cron-get-all-jobs')
    },
    cronGetJob: (id: string): Promise<{
        id: string
        name: string
        schedule: string
        enabled: boolean
        running: boolean
        lastRun?: Date
        nextRun?: Date
        runCount: number
        description?: string
        humanReadable?: string
    } | null> => {
        return ipcRenderer.invoke('cron-get-job', id)
    },
    cronStartJob: (id: string): Promise<boolean> => {
        return ipcRenderer.invoke('cron-start-job', id)
    },
    cronStopJob: (id: string): Promise<boolean> => {
        return ipcRenderer.invoke('cron-stop-job', id)
    },
    cronDeleteJob: (id: string): Promise<boolean> => {
        return ipcRenderer.invoke('cron-delete-job', id)
    },
    cronCreateJob: (config: {
        id: string
        name: string
        schedule: string
        enabled: boolean
        runCount: number
        description?: string
    }): Promise<boolean> => {
        return ipcRenderer.invoke('cron-create-job', config)
    },
    cronUpdateSchedule: (id: string, schedule: string): Promise<boolean> => {
        return ipcRenderer.invoke('cron-update-schedule', id, schedule)
    },
    cronValidateExpression: (expression: string): Promise<{ valid: boolean; description?: string; error?: string }> => {
        return ipcRenderer.invoke('cron-validate-expression', expression)
    },
    onCronJobResult: (callback: (result: {
        id: string
        timestamp: Date
        success: boolean
        message?: string
        data?: unknown
    }) => void): (() => void) => {
        const handler = (_event: Electron.IpcRendererEvent, result: {
            id: string
            timestamp: Date
            success: boolean
            message?: string
            data?: unknown
        }): void => {
            callback(result)
        }
        ipcRenderer.on('cron-job-result', handler)
        return () => {
            ipcRenderer.removeListener('cron-job-result', handler)
        }
    },
    // Lifecycle
    lifecycleGetState: (): Promise<{
        isSingleInstance: boolean
        events: Array<{ type: string; timestamp: number; detail?: string }>
        appReadyAt: number | null
        platform: string
    }> => {
        return ipcRenderer.invoke('lifecycle-get-state')
    },
    lifecycleGetEvents: (): Promise<Array<{ type: string; timestamp: number; detail?: string }>> => {
        return ipcRenderer.invoke('lifecycle-get-events')
    },
    lifecycleRestart: (): Promise<void> => {
        return ipcRenderer.invoke('lifecycle-restart')
    },
    onLifecycleEvent: (callback: (event: { type: string; timestamp: number; detail?: string }) => void): (() => void) => {
        const handler = (_event: Electron.IpcRendererEvent, lifecycleEvent: { type: string; timestamp: number; detail?: string }): void => {
            callback(lifecycleEvent)
        }
        ipcRenderer.on('lifecycle-event', handler)
        return () => {
            ipcRenderer.removeListener('lifecycle-event', handler)
        }
    },
    // Window Manager
    wmGetState: (): Promise<{
        windows: Array<{ id: number; type: string; title: string; createdAt: number }>
    }> => {
        return ipcRenderer.invoke('wm-get-state')
    },
    wmCreateChild: (): Promise<{ id: number; type: string; title: string; createdAt: number }> => {
        return ipcRenderer.invoke('wm-create-child')
    },
    wmCreateModal: (): Promise<{ id: number; type: string; title: string; createdAt: number }> => {
        return ipcRenderer.invoke('wm-create-modal')
    },
    wmCreateFrameless: (): Promise<{ id: number; type: string; title: string; createdAt: number }> => {
        return ipcRenderer.invoke('wm-create-frameless')
    },
    wmCreateWidget: (): Promise<{ id: number; type: string; title: string; createdAt: number }> => {
        return ipcRenderer.invoke('wm-create-widget')
    },
    wmCloseWindow: (id: number): Promise<boolean> => {
        return ipcRenderer.invoke('wm-close-window', id)
    },
    wmCloseAll: (): Promise<void> => {
        return ipcRenderer.invoke('wm-close-all')
    },
    onWmStateChange: (callback: (state: {
        windows: Array<{ id: number; type: string; title: string; createdAt: number }>
    }) => void): (() => void) => {
        const handler = (_event: Electron.IpcRendererEvent, state: {
            windows: Array<{ id: number; type: string; title: string; createdAt: number }>
        }): void => {
            callback(state)
        }
        ipcRenderer.on('wm-state-changed', handler)
        return () => {
            ipcRenderer.removeListener('wm-state-changed', handler)
        }
    },
    // Filesystem
    fsOpenFile: (): Promise<{
        filePath: string
        fileName: string
        content: string
        size: number
        lastModified: number
    } | null> => {
        return ipcRenderer.invoke('fs-open-file')
    },
    fsReadFile: (filePath: string): Promise<{
        filePath: string
        fileName: string
        content: string
        size: number
        lastModified: number
    }> => {
        return ipcRenderer.invoke('fs-read-file', filePath)
    },
    fsSaveFile: (defaultName: string, content: string): Promise<{
        success: boolean
        filePath: string | null
    }> => {
        return ipcRenderer.invoke('fs-save-file', defaultName, content)
    },
    fsWriteFile: (filePath: string, content: string): Promise<{
        success: boolean
        filePath: string
    }> => {
        return ipcRenderer.invoke('fs-write-file', filePath, content)
    },
    fsSelectDirectory: (): Promise<string | null> => {
        return ipcRenderer.invoke('fs-select-directory')
    },
    fsWatchDirectory: (dirPath: string): Promise<boolean> => {
        return ipcRenderer.invoke('fs-watch-directory', dirPath)
    },
    fsUnwatchDirectory: (dirPath: string): Promise<boolean> => {
        return ipcRenderer.invoke('fs-unwatch-directory', dirPath)
    },
    fsGetWatched: (): Promise<string[]> => {
        return ipcRenderer.invoke('fs-get-watched')
    },
    onFsWatchEvent: (callback: (event: {
        eventType: string
        filename: string | null
        directory: string
        timestamp: number
    }) => void): (() => void) => {
        const handler = (_event: Electron.IpcRendererEvent, fsEvent: {
            eventType: string
            filename: string | null
            directory: string
            timestamp: number
        }): void => {
            callback(fsEvent)
        }
        ipcRenderer.on('fs-watch-event', handler)
        return () => {
            ipcRenderer.removeListener('fs-watch-event', handler)
        }
    },
    // Dialogs
    dialogOpen: (): Promise<{
        type: string
        timestamp: number
        data: Record<string, unknown>
    }> => {
        return unwrapIpcResult(ipcRenderer.invoke('dialog-open'))
    },
    dialogOpenDirectory: (multiSelections = false): Promise<{
        type: string
        timestamp: number
        data: Record<string, unknown>
    }> => {
        return unwrapIpcResult(ipcRenderer.invoke('dialog-open-directory', multiSelections))
    },
    dialogSave: (): Promise<{
        type: string
        timestamp: number
        data: Record<string, unknown>
    }> => {
        return unwrapIpcResult(ipcRenderer.invoke('dialog-save'))
    },
    dialogMessage: (message: string, detail: string, buttons: string[]): Promise<{
        type: string
        timestamp: number
        data: Record<string, unknown>
    }> => {
        return unwrapIpcResult(ipcRenderer.invoke('dialog-message', message, detail, buttons))
    },
    dialogError: (title: string, content: string): Promise<{
        type: string
        timestamp: number
        data: Record<string, unknown>
    }> => {
        return unwrapIpcResult(ipcRenderer.invoke('dialog-error', title, content))
    },
    // Notifications
    notificationIsSupported: (): Promise<boolean> => {
        return ipcRenderer.invoke('notification-is-supported')
    },
    notificationShow: (options: {
        title: string
        body: string
        silent?: boolean
        urgency?: 'normal' | 'critical' | 'low'
    }): Promise<string> => {
        return ipcRenderer.invoke('notification-show', options)
    },
    onNotificationEvent: (callback: (result: {
        id: string
        title: string
        body: string
        timestamp: number
        action: 'clicked' | 'closed' | 'shown'
    }) => void): (() => void) => {
        const handler = (_event: Electron.IpcRendererEvent, result: {
            id: string
            title: string
            body: string
            timestamp: number
            action: 'clicked' | 'closed' | 'shown'
        }): void => {
            callback(result)
        }
        ipcRenderer.on('notification-event', handler)
        return () => {
            ipcRenderer.removeListener('notification-event', handler)
        }
    },
    // Clipboard
    clipboardWriteText: (text: string): Promise<boolean> => {
        return ipcRenderer.invoke('clipboard-write-text', text)
    },
    clipboardReadText: (): Promise<string> => {
        return ipcRenderer.invoke('clipboard-read-text')
    },
    clipboardWriteHTML: (html: string): Promise<boolean> => {
        return ipcRenderer.invoke('clipboard-write-html', html)
    },
    clipboardReadHTML: (): Promise<string> => {
        return ipcRenderer.invoke('clipboard-read-html')
    },
    clipboardWriteImage: (dataURL: string): Promise<boolean> => {
        return ipcRenderer.invoke('clipboard-write-image', dataURL)
    },
    clipboardReadImage: (): Promise<{ dataURL: string; width: number; height: number } | null> => {
        return ipcRenderer.invoke('clipboard-read-image')
    },
    clipboardClear: (): Promise<boolean> => {
        return ipcRenderer.invoke('clipboard-clear')
    },
    clipboardGetContent: (): Promise<{
        type: 'text' | 'image' | 'html'
        text?: string
        html?: string
        dataURL?: string
        width?: number
        height?: number
        timestamp: number
    } | null> => {
        return ipcRenderer.invoke('clipboard-get-content')
    },
    clipboardGetFormats: (): Promise<string[]> => {
        return ipcRenderer.invoke('clipboard-get-formats')
    },
    clipboardHasText: (): Promise<boolean> => {
        return ipcRenderer.invoke('clipboard-has-text')
    },
    clipboardHasImage: (): Promise<boolean> => {
        return ipcRenderer.invoke('clipboard-has-image')
    },
    clipboardHasHTML: (): Promise<boolean> => {
        return ipcRenderer.invoke('clipboard-has-html')
    },
    // Store
    storeGetAllModelSettings: (): Promise<Record<string, { selectedModel: string; apiToken: string }>> => {
        return unwrapIpcResult(ipcRenderer.invoke('store-get-all-model-settings'))
    },
    storeGetModelSettings: (providerId: string): Promise<{ selectedModel: string; apiToken: string } | null> => {
        return unwrapIpcResult(ipcRenderer.invoke('store-get-model-settings', providerId))
    },
    storeSetSelectedModel: (providerId: string, modelId: string): Promise<void> => {
        return unwrapIpcResult(ipcRenderer.invoke('store-set-selected-model', providerId, modelId))
    },
    storeSetApiToken: (providerId: string, token: string): Promise<void> => {
        return unwrapIpcResult(ipcRenderer.invoke('store-set-api-token', providerId, token))
    },
    storeSetModelSettings: (providerId: string, settings: { selectedModel: string; apiToken: string }): Promise<void> => {
        return unwrapIpcResult(ipcRenderer.invoke('store-set-model-settings', providerId, settings))
    },
    // Workspace
    workspaceSelectFolder: (): Promise<string | null> => {
        return unwrapIpcResult(ipcRenderer.invoke('workspace:select-folder'))
    },
    workspaceGetCurrent: (): Promise<string | null> => {
        return unwrapIpcResult(ipcRenderer.invoke('workspace-get-current'))
    },
    workspaceSetCurrent: (workspacePath: string): Promise<void> => {
        return unwrapIpcResult(ipcRenderer.invoke('workspace-set-current', workspacePath))
    },
    workspaceGetRecent: (): Promise<Array<{ path: string; lastOpened: number }>> => {
        return unwrapIpcResult(ipcRenderer.invoke('workspace-get-recent'))
    },
    workspaceClear: (): Promise<void> => {
        return unwrapIpcResult(ipcRenderer.invoke('workspace-clear'))
    },
    workspaceDirectoryExists: (directoryPath: string): Promise<boolean> => {
        return unwrapIpcResult(ipcRenderer.invoke('workspace-directory-exists', directoryPath))
    },
    // Posts - Sync posts to workspace filesystem
    postsSyncToWorkspace: (posts: Array<{
        id: string
        title: string
        blocks: Array<{ id: string; content: string }>
        category: string
        tags: string[]
        visibility: string
        createdAt: number
        updatedAt: number
    }>): Promise<{
        success: boolean
        syncedCount: number
        failedCount: number
        errors?: Array<{ postId: string; error: string }>
    }> => {
        return unwrapIpcResult(ipcRenderer.invoke('posts:sync-to-workspace', posts))
    },
    postsUpdatePost: (post: {
        id: string
        title: string
        blocks: Array<{ id: string; content: string }>
        category: string
        tags: string[]
        visibility: string
        createdAt: number
        updatedAt: number
    }): Promise<void> => {
        return unwrapIpcResult(ipcRenderer.invoke('posts:update-post', post))
    },
    postsDeletePost: (postId: string): Promise<void> => {
        return unwrapIpcResult(ipcRenderer.invoke('posts:delete-post', postId))
    },
    postsLoadFromWorkspace: (): Promise<Array<{
        id: string
        title: string
        blocks: Array<{ id: string; content: string }>
        category: string
        tags: string[]
        visibility: string
        createdAt: number
        updatedAt: number
    }>> => {
        return unwrapIpcResult(ipcRenderer.invoke('posts:load-from-workspace'))
    },
    onPostsFileChange: (callback: (event: {
        type: 'added' | 'changed' | 'removed'
        postId: string
        filePath: string
        timestamp: number
    }) => void): (() => void) => {
        const handler = (_event: Electron.IpcRendererEvent, changeEvent: {
            type: 'added' | 'changed' | 'removed'
            postId: string
            filePath: string
            timestamp: number
        }): void => {
            callback(changeEvent)
        }
        ipcRenderer.on('posts:file-changed', handler)
        return () => {
            ipcRenderer.removeListener('posts:file-changed', handler)
        }
    },
    onPostsWatcherError: (callback: (error: { error: string; timestamp: number }) => void): (() => void) => {
        const handler = (_event: Electron.IpcRendererEvent, errorData: { error: string; timestamp: number }): void => {
            callback(errorData)
        }
        ipcRenderer.on('posts:watcher-error', handler)
        return () => {
            ipcRenderer.removeListener('posts:watcher-error', handler)
        }
    },
    // Documents
    documentsImportFiles: (): Promise<Array<{
        id: string; name: string; path: string; size: number;
        mimeType: string; importedAt: number; lastModified: number;
    }>> => {
        return unwrapIpcResult(ipcRenderer.invoke('documents:import-files'))
    },
    documentsImportByPaths: (paths: string[]): Promise<Array<{
        id: string; name: string; path: string; size: number;
        mimeType: string; importedAt: number; lastModified: number;
    }>> => {
        return unwrapIpcResult(ipcRenderer.invoke('documents:import-by-paths', paths))
    },
    documentsDownloadFromUrl: (url: string): Promise<{
        id: string; name: string; path: string; size: number;
        mimeType: string; importedAt: number; lastModified: number;
    }> => {
        return unwrapIpcResult(ipcRenderer.invoke('documents:download-from-url', url))
    },
    documentsLoadAll: (): Promise<Array<{
        id: string; name: string; path: string; size: number;
        mimeType: string; importedAt: number; lastModified: number;
    }>> => {
        return unwrapIpcResult(ipcRenderer.invoke('documents:load-all'))
    },
    documentsDeleteFile: (id: string): Promise<void> => {
        return unwrapIpcResult(ipcRenderer.invoke('documents:delete-file', id))
    },
    onDocumentsFileChange: (callback: (event: {
        type: 'added' | 'changed' | 'removed';
        fileId: string;
        filePath: string;
        timestamp: number;
    }) => void): (() => void) => {
        const handler = (_event: Electron.IpcRendererEvent, changeEvent: {
            type: 'added' | 'changed' | 'removed';
            fileId: string;
            filePath: string;
            timestamp: number;
        }): void => {
            callback(changeEvent)
        }
        ipcRenderer.on('documents:file-changed', handler)
        return () => {
            ipcRenderer.removeListener('documents:file-changed', handler)
        }
    },
    onDocumentsWatcherError: (callback: (error: { error: string; timestamp: number }) => void): (() => void) => {
        const handler = (_event: Electron.IpcRendererEvent, errorData: { error: string; timestamp: number }): void => {
            callback(errorData)
        }
        ipcRenderer.on('documents:watcher-error', handler)
        return () => {
            ipcRenderer.removeListener('documents:watcher-error', handler)
        }
    },
    // Agent
    agentRun: (messages: Array<{role: 'user' | 'assistant'; content: string}>, runId: string, providerId: string): Promise<void> => {
        return ipcRenderer.invoke('agent:run', messages, runId, providerId)
    },
    agentCancel: (runId: string): void => {
        ipcRenderer.send('agent:cancel', runId)
    },
    // Agent - Session Management
    agentCreateSession: (config: {
        sessionId: string
        providerId: string
        modelId?: string
        systemPrompt?: string
        temperature?: number
        maxTokens?: number
        metadata?: Record<string, unknown>
    }): Promise<{
        sessionId: string
        providerId: string
        modelId: string
        createdAt: number
        lastActivity: number
        isActive: boolean
        messageCount: number
        metadata?: Record<string, unknown>
    }> => {
        return ipcRenderer.invoke('agent:create-session', config)
    },
    agentDestroySession: (sessionId: string): Promise<boolean> => {
        return ipcRenderer.invoke('agent:destroy-session', sessionId)
    },
    agentGetSession: (sessionId: string): Promise<{
        sessionId: string
        providerId: string
        modelId: string
        createdAt: number
        lastActivity: number
        isActive: boolean
        messageCount: number
        metadata?: Record<string, unknown>
    } | null> => {
        return ipcRenderer.invoke('agent:get-session', sessionId)
    },
    agentListSessions: (): Promise<Array<{
        sessionId: string
        providerId: string
        modelId: string
        createdAt: number
        lastActivity: number
        isActive: boolean
        messageCount: number
        metadata?: Record<string, unknown>
    }>> => {
        return ipcRenderer.invoke('agent:list-sessions')
    },
    agentClearSessions: (): Promise<number> => {
        return ipcRenderer.invoke('agent:clear-sessions')
    },
    // Agent - Enhanced Execution
    agentRunSession: (options: {
        sessionId: string
        runId: string
        messages: Array<{ role: 'user' | 'assistant'; content: string }>
        providerId: string
        temperature?: number
        maxTokens?: number
        stream?: boolean
    }): Promise<void> => {
        return ipcRenderer.invoke('agent:run-session', options)
    },
    agentCancelSession: (sessionId: string): Promise<boolean> => {
        return ipcRenderer.invoke('agent:cancel-session', sessionId)
    },
    // Agent - Status
    agentGetStatus: (): Promise<{
        totalSessions: number
        activeSessions: number
        totalMessages: number
    }> => {
        return ipcRenderer.invoke('agent:get-status')
    },
    agentIsRunning: (runId: string): Promise<boolean> => {
        return ipcRenderer.invoke('agent:is-running', runId)
    },
    // RAG
    ragIndex: (filePath: string, providerId: string): Promise<{ filePath: string; chunkCount: number }> => {
        return ipcRenderer.invoke('rag:index', filePath, providerId)
    },
    ragQuery: (filePath: string, question: string, runId: string, providerId: string): Promise<void> => {
        return ipcRenderer.invoke('rag:query', filePath, question, runId, providerId)
    },
    ragCancel: (runId: string): void => {
        ipcRenderer.send('rag:cancel', runId)
    },
    ragGetStatus: (): Promise<{ files: Array<{ filePath: string; chunkCount: number; indexedAt: number }> }> => {
        return ipcRenderer.invoke('rag:status')
    },
    onRagEvent: (callback: (eventType: string, data: unknown) => void): (() => void) => {
        const channels = ['rag:token', 'rag:done', 'rag:error', 'rag:status']
        const handlers: Array<[string, (e: Electron.IpcRendererEvent, data: unknown) => void]> = channels.map((channel) => {
            const handler = (_e: Electron.IpcRendererEvent, data: unknown): void => {
                callback(channel, data)
            }
            ipcRenderer.on(channel, handler)
            return [channel, handler]
        })
        return (): void => {
            handlers.forEach(([channel, handler]) => ipcRenderer.removeListener(channel, handler))
        }
    },
    onAgentEvent: (callback: (eventType: string, data: unknown) => void): (() => void) => {
        const channels = ['agent:token', 'agent:thinking', 'agent:tool_start', 'agent:tool_end', 'agent:done', 'agent:error']
        const handlers: Array<[string, (e: Electron.IpcRendererEvent, data: unknown) => void]> = channels.map((channel) => {
            const handler = (_e: Electron.IpcRendererEvent, data: unknown): void => {
                callback(channel, data)
            }
            ipcRenderer.on(channel, handler)
            return [channel, handler]
        })
        return (): void => {
            handlers.forEach(([channel, handler]) => ipcRenderer.removeListener(channel, handler))
        }
    },
    // Pipeline
    pipelineRun: (agentName: string, input: { prompt: string; context?: Record<string, unknown> }): Promise<{ success: true; data: { runId: string } } | { success: false; error: { code: string; message: string } }> => {
        return ipcRenderer.invoke('pipeline:run', agentName, input)
    },
    pipelineCancel: (runId: string): void => {
        ipcRenderer.send('pipeline:cancel', runId)
    },
    pipelineListAgents: (): Promise<{ success: true; data: string[] } | { success: false; error: { code: string; message: string } }> => {
        return ipcRenderer.invoke('pipeline:list-agents')
    },
    pipelineListRuns: (): Promise<{ success: true; data: Array<{ runId: string; agentName: string; startedAt: number }> } | { success: false; error: { code: string; message: string } }> => {
        return ipcRenderer.invoke('pipeline:list-runs')
    },
    onPipelineEvent: (callback: (event: { type: 'token' | 'thinking' | 'done' | 'error'; data: unknown }) => void): (() => void) => {
        const handler = (_event: Electron.IpcRendererEvent, pipelineEvent: { type: 'token' | 'thinking' | 'done' | 'error'; data: unknown }): void => {
            callback(pipelineEvent)
        }
        ipcRenderer.on('pipeline:event', handler)
        return () => {
            ipcRenderer.removeListener('pipeline:event', handler)
        }
    },
    // Window controls
    popupMenu: (): Promise<void> => {
        return ipcRenderer.invoke('window:popup-menu')
    },
    windowMinimize: (): void => {
        ipcRenderer.send('window:minimize')
    },
    windowMaximize: (): void => {
        ipcRenderer.send('window:maximize')
    },
    windowClose: (): void => {
        ipcRenderer.send('window:close')
    },
    windowIsMaximized: (): Promise<boolean> => {
        return unwrapIpcResult(ipcRenderer.invoke('window:is-maximized'))
    },
    getPlatform: (): Promise<string> => {
        return ipcRenderer.invoke('window:get-platform')
    },
    onMaximizeChange: (callback: (isMaximized: boolean) => void): (() => void) => {
        const handler = (_event: Electron.IpcRendererEvent, isMaximized: boolean): void => {
            callback(isMaximized)
        }
        ipcRenderer.on('window:maximize-change', handler)
        return () => {
            ipcRenderer.removeListener('window:maximize-change', handler)
        }
    },
    windowIsFullScreen: (): Promise<boolean> => {
        return unwrapIpcResult(ipcRenderer.invoke('window:is-fullscreen'))
    },
    onFullScreenChange: (callback: (isFullScreen: boolean) => void): (() => void) => {
        const handler = (_event: Electron.IpcRendererEvent, isFullScreen: boolean): void => {
            callback(isFullScreen)
        }
        ipcRenderer.on('window:fullscreen-change', handler)
        return () => {
            ipcRenderer.removeListener('window:fullscreen-change', handler)
        }
    },
    // Context Menu
    showPostContextMenu: (postId: string, postTitle: string): Promise<void> => {
        return ipcRenderer.invoke('context-menu:post', postId, postTitle)
    },
    onPostContextMenuAction: (callback: (data: { action: string; postId: string }) => void): (() => void) => {
        const handler = (_event: Electron.IpcRendererEvent, data: { action: string; postId: string }): void => {
            callback(data)
        }
        ipcRenderer.on('context-menu:post-action', handler)
        return () => {
            ipcRenderer.removeListener('context-menu:post-action', handler)
        }
    },
    // Directories - Indexed directory management
    directoriesList: (): Promise<Array<{
        id: string
        path: string
        addedAt: number
        isIndexed: boolean
        lastIndexedAt?: number
    }>> => {
        return unwrapIpcResult(ipcRenderer.invoke('directories:list'))
    },
    directoriesAdd: (dirPath: string): Promise<{
        id: string
        path: string
        addedAt: number
        isIndexed: boolean
        lastIndexedAt?: number
    }> => {
        return unwrapIpcResult(ipcRenderer.invoke('directories:add', dirPath))
    },
    directoriesAddMany: (dirPaths: string[]): Promise<{
        added: Array<{
            id: string
            path: string
            addedAt: number
            isIndexed: boolean
            lastIndexedAt?: number
        }>
        errors: Array<{ path: string; error: string }>
    }> => {
        return unwrapIpcResult(ipcRenderer.invoke('directories:add-many', dirPaths))
    },
    directoriesRemove: (id: string): Promise<boolean> => {
        return unwrapIpcResult(ipcRenderer.invoke('directories:remove', id))
    },
    directoriesValidate: (dirPath: string): Promise<{ valid: boolean; error?: string }> => {
        return unwrapIpcResult(ipcRenderer.invoke('directories:validate', dirPath))
    },
    directoriesMarkIndexed: (id: string, isIndexed: boolean): Promise<boolean> => {
        return unwrapIpcResult(ipcRenderer.invoke('directories:mark-indexed', id, isIndexed))
    },
    onDirectoriesChanged: (callback: (directories: Array<{
        id: string
        path: string
        addedAt: number
        isIndexed: boolean
        lastIndexedAt?: number
    }>) => void): (() => void) => {
        const handler = (_event: Electron.IpcRendererEvent, directories: Array<{
            id: string
            path: string
            addedAt: number
            isIndexed: boolean
            lastIndexedAt?: number
        }>): void => {
            callback(directories)
        }
        ipcRenderer.on('directories:changed', handler)
        return () => {
            ipcRenderer.removeListener('directories:changed', handler)
        }
    }
}

// Minimal preload for simplified app
if (process.contextIsolated) {
    try {
        contextBridge.exposeInMainWorld('electron', electronAPI)
        contextBridge.exposeInMainWorld('api', api)
    } catch (error) {
        console.error(error)
    }
} else {
    // @ts-ignore (define in dts)
    globalThis.electron = electronAPI
    // @ts-ignore (define in dts)
    globalThis.api = api
}