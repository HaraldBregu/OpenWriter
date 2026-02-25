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

// ---------------------------------------------------------------------------
// window.app — General application utilities
// ---------------------------------------------------------------------------
const app = {
    playSound: (): void => {
        ipcRenderer.send('play-sound')
    },
    setTheme: (theme: string): void => {
        ipcRenderer.send('set-theme', theme)
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
    popupMenu: (): Promise<void> => {
        return ipcRenderer.invoke('window:popup-menu')
    },
    getPlatform: (): Promise<string> => {
        return ipcRenderer.invoke('window:get-platform')
    },
}

// ---------------------------------------------------------------------------
// window.win — Window controls
// ---------------------------------------------------------------------------
const win = {
    minimize: (): void => {
        ipcRenderer.send('window:minimize')
    },
    maximize: (): void => {
        ipcRenderer.send('window:maximize')
    },
    close: (): void => {
        ipcRenderer.send('window:close')
    },
    isMaximized: (): Promise<boolean> => {
        return unwrapIpcResult(ipcRenderer.invoke('window:is-maximized'))
    },
    isFullScreen: (): Promise<boolean> => {
        return unwrapIpcResult(ipcRenderer.invoke('window:is-fullscreen'))
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
    onFullScreenChange: (callback: (isFullScreen: boolean) => void): (() => void) => {
        const handler = (_event: Electron.IpcRendererEvent, isFullScreen: boolean): void => {
            callback(isFullScreen)
        }
        ipcRenderer.on('window:fullscreen-change', handler)
        return () => {
            ipcRenderer.removeListener('window:fullscreen-change', handler)
        }
    },
}

// ---------------------------------------------------------------------------
// window.media — Microphone / camera permissions and device enumeration
// ---------------------------------------------------------------------------
const media = {
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
    getDevices: (type: 'audioinput' | 'videoinput'): Promise<MediaDeviceInfo[]> => {
        return ipcRenderer.invoke('get-media-devices', type)
    },
}

// ---------------------------------------------------------------------------
// window.bluetooth — Bluetooth capability queries
// ---------------------------------------------------------------------------
const bluetooth = {
    isSupported: (): Promise<boolean> => {
        return ipcRenderer.invoke('bluetooth-is-supported')
    },
    getPermissionStatus: (): Promise<string> => {
        return ipcRenderer.invoke('bluetooth-get-permission-status')
    },
    getInfo: (): Promise<{ platform: string; supported: boolean; apiAvailable: boolean }> => {
        return ipcRenderer.invoke('bluetooth-get-info')
    },
}

// ---------------------------------------------------------------------------
// window.network — Network connectivity and interface information
// ---------------------------------------------------------------------------
const network = {
    isSupported: (): Promise<boolean> => {
        return ipcRenderer.invoke('network-is-supported')
    },
    getConnectionStatus: (): Promise<string> => {
        return ipcRenderer.invoke('network-get-connection-status')
    },
    getInterfaces: (): Promise<Array<{
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
    getInfo: (): Promise<{
        platform: string
        supported: boolean
        isOnline: boolean
        interfaceCount: number
    }> => {
        return ipcRenderer.invoke('network-get-info')
    },
    onStatusChange: (callback: (status: string) => void): (() => void) => {
        const handler = (_event: Electron.IpcRendererEvent, status: string): void => {
            callback(status)
        }
        ipcRenderer.on('network-status-changed', handler)
        return () => {
            ipcRenderer.removeListener('network-status-changed', handler)
        }
    },
}

// ---------------------------------------------------------------------------
// window.cron — Scheduled job management
// ---------------------------------------------------------------------------
const cron = {
    getAll: (): Promise<Array<{
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
    getJob: (id: string): Promise<{
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
    start: (id: string): Promise<boolean> => {
        return ipcRenderer.invoke('cron-start-job', id)
    },
    stop: (id: string): Promise<boolean> => {
        return ipcRenderer.invoke('cron-stop-job', id)
    },
    delete: (id: string): Promise<boolean> => {
        return ipcRenderer.invoke('cron-delete-job', id)
    },
    create: (config: {
        id: string
        name: string
        schedule: string
        enabled: boolean
        runCount: number
        description?: string
    }): Promise<boolean> => {
        return ipcRenderer.invoke('cron-create-job', config)
    },
    updateSchedule: (id: string, schedule: string): Promise<boolean> => {
        return ipcRenderer.invoke('cron-update-schedule', id, schedule)
    },
    validateExpression: (expression: string): Promise<{ valid: boolean; description?: string; error?: string }> => {
        return ipcRenderer.invoke('cron-validate-expression', expression)
    },
    onJobResult: (callback: (result: {
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
}

// ---------------------------------------------------------------------------
// window.lifecycle — App lifecycle state and events
// ---------------------------------------------------------------------------
const lifecycle = {
    getState: (): Promise<{
        isSingleInstance: boolean
        events: Array<{ type: string; timestamp: number; detail?: string }>
        appReadyAt: number | null
        platform: string
    }> => {
        return ipcRenderer.invoke('lifecycle-get-state')
    },
    getEvents: (): Promise<Array<{ type: string; timestamp: number; detail?: string }>> => {
        return ipcRenderer.invoke('lifecycle-get-events')
    },
    restart: (): Promise<void> => {
        return ipcRenderer.invoke('lifecycle-restart')
    },
    onEvent: (callback: (event: { type: string; timestamp: number; detail?: string }) => void): (() => void) => {
        const handler = (_event: Electron.IpcRendererEvent, lifecycleEvent: { type: string; timestamp: number; detail?: string }): void => {
            callback(lifecycleEvent)
        }
        ipcRenderer.on('lifecycle-event', handler)
        return () => {
            ipcRenderer.removeListener('lifecycle-event', handler)
        }
    },
}

// ---------------------------------------------------------------------------
// window.wm — Window manager (child / modal / frameless / widget windows)
// ---------------------------------------------------------------------------
const wm = {
    getState: (): Promise<{
        windows: Array<{ id: number; type: string; title: string; createdAt: number }>
    }> => {
        return ipcRenderer.invoke('wm-get-state')
    },
    createChild: (): Promise<{ id: number; type: string; title: string; createdAt: number }> => {
        return ipcRenderer.invoke('wm-create-child')
    },
    createModal: (): Promise<{ id: number; type: string; title: string; createdAt: number }> => {
        return ipcRenderer.invoke('wm-create-modal')
    },
    createFrameless: (): Promise<{ id: number; type: string; title: string; createdAt: number }> => {
        return ipcRenderer.invoke('wm-create-frameless')
    },
    createWidget: (): Promise<{ id: number; type: string; title: string; createdAt: number }> => {
        return ipcRenderer.invoke('wm-create-widget')
    },
    closeWindow: (id: number): Promise<boolean> => {
        return ipcRenderer.invoke('wm-close-window', id)
    },
    closeAll: (): Promise<void> => {
        return ipcRenderer.invoke('wm-close-all')
    },
    onStateChange: (callback: (state: {
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
}

// ---------------------------------------------------------------------------
// window.fs — Filesystem operations and directory watching
// ---------------------------------------------------------------------------
const fs = {
    openFile: (): Promise<{
        filePath: string
        fileName: string
        content: string
        size: number
        lastModified: number
    } | null> => {
        return ipcRenderer.invoke('fs-open-file')
    },
    readFile: (filePath: string): Promise<{
        filePath: string
        fileName: string
        content: string
        size: number
        lastModified: number
    }> => {
        return ipcRenderer.invoke('fs-read-file', filePath)
    },
    saveFile: (defaultName: string, content: string): Promise<{
        success: boolean
        filePath: string | null
    }> => {
        return ipcRenderer.invoke('fs-save-file', defaultName, content)
    },
    writeFile: (filePath: string, content: string): Promise<{
        success: boolean
        filePath: string
    }> => {
        return ipcRenderer.invoke('fs-write-file', filePath, content)
    },
    selectDirectory: (): Promise<string | null> => {
        return ipcRenderer.invoke('fs-select-directory')
    },
    watchDirectory: (dirPath: string): Promise<boolean> => {
        return ipcRenderer.invoke('fs-watch-directory', dirPath)
    },
    unwatchDirectory: (dirPath: string): Promise<boolean> => {
        return ipcRenderer.invoke('fs-unwatch-directory', dirPath)
    },
    getWatched: (): Promise<string[]> => {
        return ipcRenderer.invoke('fs-get-watched')
    },
    onWatchEvent: (callback: (event: {
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
}

// ---------------------------------------------------------------------------
// window.dialog — Native OS dialog boxes
// ---------------------------------------------------------------------------
const dialog = {
    open: (): Promise<{
        type: string
        timestamp: number
        data: Record<string, unknown>
    }> => {
        return unwrapIpcResult(ipcRenderer.invoke('dialog-open'))
    },
    openDirectory: (multiSelections = false): Promise<{
        type: string
        timestamp: number
        data: Record<string, unknown>
    }> => {
        return unwrapIpcResult(ipcRenderer.invoke('dialog-open-directory', multiSelections))
    },
    save: (): Promise<{
        type: string
        timestamp: number
        data: Record<string, unknown>
    }> => {
        return unwrapIpcResult(ipcRenderer.invoke('dialog-save'))
    },
    message: (message: string, detail: string, buttons: string[]): Promise<{
        type: string
        timestamp: number
        data: Record<string, unknown>
    }> => {
        return unwrapIpcResult(ipcRenderer.invoke('dialog-message', message, detail, buttons))
    },
    error: (title: string, content: string): Promise<{
        type: string
        timestamp: number
        data: Record<string, unknown>
    }> => {
        return unwrapIpcResult(ipcRenderer.invoke('dialog-error', title, content))
    },
}

// ---------------------------------------------------------------------------
// window.notification — Desktop notifications
// ---------------------------------------------------------------------------
const notification = {
    isSupported: (): Promise<boolean> => {
        return ipcRenderer.invoke('notification-is-supported')
    },
    show: (options: {
        title: string
        body: string
        silent?: boolean
        urgency?: 'normal' | 'critical' | 'low'
    }): Promise<string> => {
        return ipcRenderer.invoke('notification-show', options)
    },
    onEvent: (callback: (result: {
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
}

// ---------------------------------------------------------------------------
// window.clipboard — Clipboard read / write operations
// ---------------------------------------------------------------------------
const clipboard = {
    writeText: (text: string): Promise<boolean> => {
        return ipcRenderer.invoke('clipboard-write-text', text)
    },
    readText: (): Promise<string> => {
        return ipcRenderer.invoke('clipboard-read-text')
    },
    writeHTML: (html: string): Promise<boolean> => {
        return ipcRenderer.invoke('clipboard-write-html', html)
    },
    readHTML: (): Promise<string> => {
        return ipcRenderer.invoke('clipboard-read-html')
    },
    writeImage: (dataURL: string): Promise<boolean> => {
        return ipcRenderer.invoke('clipboard-write-image', dataURL)
    },
    readImage: (): Promise<{ dataURL: string; width: number; height: number } | null> => {
        return ipcRenderer.invoke('clipboard-read-image')
    },
    clear: (): Promise<boolean> => {
        return ipcRenderer.invoke('clipboard-clear')
    },
    getContent: (): Promise<{
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
    getFormats: (): Promise<string[]> => {
        return ipcRenderer.invoke('clipboard-get-formats')
    },
    hasText: (): Promise<boolean> => {
        return ipcRenderer.invoke('clipboard-has-text')
    },
    hasImage: (): Promise<boolean> => {
        return ipcRenderer.invoke('clipboard-has-image')
    },
    hasHTML: (): Promise<boolean> => {
        return ipcRenderer.invoke('clipboard-has-html')
    },
}

// ---------------------------------------------------------------------------
// window.store — Persisted AI model settings
// ---------------------------------------------------------------------------
const store = {
    // New provider settings methods
    getAllProviderSettings: (): Promise<Record<string, { selectedModel: string; apiToken: string; temperature: number; maxTokens: number | null; reasoning: boolean }>> => {
        return unwrapIpcResult(ipcRenderer.invoke('store-get-all-provider-settings'))
    },
    getProviderSettings: (providerId: string): Promise<{ selectedModel: string; apiToken: string; temperature: number; maxTokens: number | null; reasoning: boolean } | null> => {
        return unwrapIpcResult(ipcRenderer.invoke('store-get-provider-settings', providerId))
    },
    setProviderSettings: (providerId: string, settings: { selectedModel: string; apiToken: string; temperature: number; maxTokens: number | null; reasoning: boolean }): Promise<void> => {
        return unwrapIpcResult(ipcRenderer.invoke('store-set-provider-settings', providerId, settings))
    },
    setInferenceDefaults: (providerId: string, update: { temperature?: number; maxTokens?: number | null; reasoning?: boolean }): Promise<void> => {
        return unwrapIpcResult(ipcRenderer.invoke('store-set-inference-defaults', providerId, update))
    },
    // Legacy methods
    getAllModelSettings: (): Promise<Record<string, { selectedModel: string; apiToken: string }>> => {
        return unwrapIpcResult(ipcRenderer.invoke('store-get-all-model-settings'))
    },
    getModelSettings: (providerId: string): Promise<{ selectedModel: string; apiToken: string } | null> => {
        return unwrapIpcResult(ipcRenderer.invoke('store-get-model-settings', providerId))
    },
    setSelectedModel: (providerId: string, modelId: string): Promise<void> => {
        return unwrapIpcResult(ipcRenderer.invoke('store-set-selected-model', providerId, modelId))
    },
    setApiToken: (providerId: string, token: string): Promise<void> => {
        return unwrapIpcResult(ipcRenderer.invoke('store-set-api-token', providerId, token))
    },
    setModelSettings: (providerId: string, settings: { selectedModel: string; apiToken: string }): Promise<void> => {
        return unwrapIpcResult(ipcRenderer.invoke('store-set-model-settings', providerId, settings))
    },
}

// ---------------------------------------------------------------------------
// window.workspace — Workspace folder selection and recent workspaces
// ---------------------------------------------------------------------------
const workspace = {
    selectFolder: (): Promise<string | null> => {
        return unwrapIpcResult(ipcRenderer.invoke('workspace:select-folder'))
    },
    getCurrent: (): Promise<string | null> => {
        return unwrapIpcResult(ipcRenderer.invoke('workspace-get-current'))
    },
    setCurrent: (workspacePath: string): Promise<void> => {
        return unwrapIpcResult(ipcRenderer.invoke('workspace-set-current', workspacePath))
    },
    getRecent: (): Promise<Array<{ path: string; lastOpened: number }>> => {
        return unwrapIpcResult(ipcRenderer.invoke('workspace-get-recent'))
    },
    clear: (): Promise<void> => {
        return unwrapIpcResult(ipcRenderer.invoke('workspace-clear'))
    },
    directoryExists: (directoryPath: string): Promise<boolean> => {
        return unwrapIpcResult(ipcRenderer.invoke('workspace-directory-exists', directoryPath))
    },
    removeRecent: (workspacePath: string): Promise<void> => {
        return unwrapIpcResult(ipcRenderer.invoke('workspace-remove-recent', workspacePath))
    },
}

// ---------------------------------------------------------------------------
// window.posts — Post sync and file-watch events
// ---------------------------------------------------------------------------
const posts = {
    syncToWorkspace: (postsData: Array<{
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
        return unwrapIpcResult(ipcRenderer.invoke('posts:sync-to-workspace', postsData))
    },
    update: (post: {
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
    delete: (postId: string): Promise<void> => {
        return unwrapIpcResult(ipcRenderer.invoke('posts:delete-post', postId))
    },
    loadFromWorkspace: (): Promise<Array<{
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
    onFileChange: (callback: (event: {
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
    onWatcherError: (callback: (error: { error: string; timestamp: number }) => void): (() => void) => {
        const handler = (_event: Electron.IpcRendererEvent, errorData: { error: string; timestamp: number }): void => {
            callback(errorData)
        }
        ipcRenderer.on('posts:watcher-error', handler)
        return () => {
            ipcRenderer.removeListener('posts:watcher-error', handler)
        }
    },
}

// ---------------------------------------------------------------------------
// window.documents — Document import, download, and file-watch events
// ---------------------------------------------------------------------------
const documents = {
    importFiles: (): Promise<Array<{
        id: string; name: string; path: string; size: number;
        mimeType: string; importedAt: number; lastModified: number;
    }>> => {
        return unwrapIpcResult(ipcRenderer.invoke('documents:import-files'))
    },
    importByPaths: (paths: string[]): Promise<Array<{
        id: string; name: string; path: string; size: number;
        mimeType: string; importedAt: number; lastModified: number;
    }>> => {
        return unwrapIpcResult(ipcRenderer.invoke('documents:import-by-paths', paths))
    },
    downloadFromUrl: (url: string): Promise<{
        id: string; name: string; path: string; size: number;
        mimeType: string; importedAt: number; lastModified: number;
    }> => {
        return unwrapIpcResult(ipcRenderer.invoke('documents:download-from-url', url))
    },
    loadAll: (): Promise<Array<{
        id: string; name: string; path: string; size: number;
        mimeType: string; importedAt: number; lastModified: number;
    }>> => {
        return unwrapIpcResult(ipcRenderer.invoke('documents:load-all'))
    },
    delete: (id: string): Promise<void> => {
        return unwrapIpcResult(ipcRenderer.invoke('documents:delete-file', id))
    },
    onFileChange: (callback: (event: {
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
    onWatcherError: (callback: (error: { error: string; timestamp: number }) => void): (() => void) => {
        const handler = (_event: Electron.IpcRendererEvent, errorData: { error: string; timestamp: number }): void => {
            callback(errorData)
        }
        ipcRenderer.on('documents:watcher-error', handler)
        return () => {
            ipcRenderer.removeListener('documents:watcher-error', handler)
        }
    },
}

// ---------------------------------------------------------------------------
// window.agent — AI agent execution and session management
// ---------------------------------------------------------------------------
const agent = {
    run: (messages: Array<{ role: 'user' | 'assistant'; content: string }>, runId: string, providerId: string): Promise<void> => {
        return ipcRenderer.invoke('agent:run', messages, runId, providerId)
    },
    cancel: (runId: string): void => {
        ipcRenderer.send('agent:cancel', runId)
    },
    onEvent: (callback: (eventType: string, data: unknown) => void): (() => void) => {
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
    createSession: (config: {
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
    destroySession: (sessionId: string): Promise<boolean> => {
        return ipcRenderer.invoke('agent:destroy-session', sessionId)
    },
    getSession: (sessionId: string): Promise<{
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
    listSessions: (): Promise<Array<{
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
    clearSessions: (): Promise<number> => {
        return ipcRenderer.invoke('agent:clear-sessions')
    },
    runSession: (options: {
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
    cancelSession: (sessionId: string): Promise<boolean> => {
        return ipcRenderer.invoke('agent:cancel-session', sessionId)
    },
    getStatus: (): Promise<{
        totalSessions: number
        activeSessions: number
        totalMessages: number
    }> => {
        return ipcRenderer.invoke('agent:get-status')
    },
    isRunning: (runId: string): Promise<boolean> => {
        return ipcRenderer.invoke('agent:is-running', runId)
    },
}

// ---------------------------------------------------------------------------
// window.contextMenu — Application-specific context menus
// ---------------------------------------------------------------------------
const contextMenu = {
    showWriting: (writingId: string, writingTitle: string): Promise<void> => {
        return ipcRenderer.invoke('context-menu:writing', writingId, writingTitle)
    },
    onWritingAction: (callback: (data: { action: string; writingId: string }) => void): (() => void) => {
        const handler = (_event: Electron.IpcRendererEvent, data: { action: string; writingId: string }): void => {
            callback(data)
        }
        ipcRenderer.on('context-menu:writing-action', handler)
        return () => {
            ipcRenderer.removeListener('context-menu:writing-action', handler)
        }
    },
    showPost: (postId: string, postTitle: string): Promise<void> => {
        return ipcRenderer.invoke('context-menu:post', postId, postTitle)
    },
    onPostAction: (callback: (data: { action: string; postId: string }) => void): (() => void) => {
        const handler = (_event: Electron.IpcRendererEvent, data: { action: string; postId: string }): void => {
            callback(data)
        }
        ipcRenderer.on('context-menu:post-action', handler)
        return () => {
            ipcRenderer.removeListener('context-menu:post-action', handler)
        }
    },
}

// ---------------------------------------------------------------------------
// window.directories — Indexed directory management
// ---------------------------------------------------------------------------
const directories = {
    list: (): Promise<Array<{
        id: string
        path: string
        addedAt: number
        isIndexed: boolean
        lastIndexedAt?: number
    }>> => {
        return unwrapIpcResult(ipcRenderer.invoke('directories:list'))
    },
    add: (dirPath: string): Promise<{
        id: string
        path: string
        addedAt: number
        isIndexed: boolean
        lastIndexedAt?: number
    }> => {
        return unwrapIpcResult(ipcRenderer.invoke('directories:add', dirPath))
    },
    addMany: (dirPaths: string[]): Promise<{
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
    remove: (id: string): Promise<boolean> => {
        return unwrapIpcResult(ipcRenderer.invoke('directories:remove', id))
    },
    validate: (dirPath: string): Promise<{ valid: boolean; error?: string }> => {
        return unwrapIpcResult(ipcRenderer.invoke('directories:validate', dirPath))
    },
    markIndexed: (id: string, isIndexed: boolean): Promise<boolean> => {
        return unwrapIpcResult(ipcRenderer.invoke('directories:mark-indexed', id, isIndexed))
    },
    onChanged: (callback: (directories: Array<{
        id: string
        path: string
        addedAt: number
        isIndexed: boolean
        lastIndexedAt?: number
    }>) => void): (() => void) => {
        const handler = (_event: Electron.IpcRendererEvent, dirs: Array<{
            id: string
            path: string
            addedAt: number
            isIndexed: boolean
            lastIndexedAt?: number
        }>): void => {
            callback(dirs)
        }
        ipcRenderer.on('directories:changed', handler)
        return () => {
            ipcRenderer.removeListener('directories:changed', handler)
        }
    },
}

// ---------------------------------------------------------------------------
// window.personality — Personality/conversation file management
// ---------------------------------------------------------------------------
const personality = {
    save: (input: {
        sectionId: string
        content: string
        metadata?: Record<string, unknown>
    }): Promise<{
        id: string
        path: string
        savedAt: number
    }> => {
        return unwrapIpcResult(ipcRenderer.invoke('personality:save', input))
    },
    loadAll: (): Promise<Array<{
        id: string
        sectionId: string
        path: string
        metadata: {
            sectionId: string
            title?: string
            createdAt: number
            updatedAt: number
            tags?: string[]
            [key: string]: unknown
        }
        content: string
        savedAt: number
    }>> => {
        return unwrapIpcResult(ipcRenderer.invoke('personality:load-all'))
    },
    loadOne: (params: {
        sectionId: string
        id: string
    }): Promise<{
        id: string
        sectionId: string
        path: string
        metadata: {
            sectionId: string
            title?: string
            createdAt: number
            updatedAt: number
            tags?: string[]
            [key: string]: unknown
        }
        content: string
        savedAt: number
    } | null> => {
        return unwrapIpcResult(ipcRenderer.invoke('personality:load-one', params))
    },
    delete: (params: {
        sectionId: string
        id: string
    }): Promise<void> => {
        return unwrapIpcResult(ipcRenderer.invoke('personality:delete', params))
    },
    onFileChange: (callback: (event: {
        type: 'added' | 'changed' | 'removed'
        sectionId: string
        fileId: string
        filePath: string
        timestamp: number
    }) => void): (() => void) => {
        const handler = (_event: Electron.IpcRendererEvent, changeEvent: {
            type: 'added' | 'changed' | 'removed'
            sectionId: string
            fileId: string
            filePath: string
            timestamp: number
        }): void => {
            callback(changeEvent)
        }
        ipcRenderer.on('personality:file-changed', handler)
        return () => {
            ipcRenderer.removeListener('personality:file-changed', handler)
        }
    },
    onWatcherError: (callback: (error: { error: string; timestamp: number }) => void): (() => void) => {
        const handler = (_event: Electron.IpcRendererEvent, errorData: { error: string; timestamp: number }): void => {
            callback(errorData)
        }
        ipcRenderer.on('personality:watcher-error', handler)
        return () => {
            ipcRenderer.removeListener('personality:watcher-error', handler)
        }
    },
    /**
     * Load the section-level config for the given section.
     * Returns null when no section config has been saved yet.
     */
    loadSectionConfig: (params: { sectionId: string }): Promise<{
        schemaVersion: number
        provider: string
        model: string
        temperature?: number | null
        maxTokens?: number | null
        reasoning?: boolean
        displayName?: string
        description?: string
        createdAt: string
        updatedAt: string
    } | null> => {
        return unwrapIpcResult(ipcRenderer.invoke('personality:load-section-config', params))
    },
    /**
     * Create or update the section-level config for the given section.
     * Returns the full updated config after persisting to disk.
     */
    saveSectionConfig: (params: {
        sectionId: string
        update: {
            provider?: string
            model?: string
            temperature?: number | null
            maxTokens?: number | null
            reasoning?: boolean
            displayName?: string
            description?: string
        }
    }): Promise<{
        schemaVersion: number
        provider: string
        model: string
        temperature?: number | null
        maxTokens?: number | null
        reasoning?: boolean
        displayName?: string
        description?: string
        createdAt: string
        updatedAt: string
    }> => {
        return unwrapIpcResult(ipcRenderer.invoke('personality:save-section-config', params))
    },
    /**
     * Subscribe to section config changes (both app-triggered and external file edits).
     * Returns a cleanup function to remove the listener.
     */
    onSectionConfigChange: (callback: (event: {
        sectionId: string
        config: {
            schemaVersion: number
            provider: string
            model: string
            temperature?: number | null
            maxTokens?: number | null
            reasoning?: boolean
            displayName?: string
            description?: string
            createdAt: string
            updatedAt: string
        } | null
        timestamp: number
    }) => void): (() => void) => {
        const handler = (_event: Electron.IpcRendererEvent, changeEvent: {
            sectionId: string
            config: {
                schemaVersion: number
                provider: string
                model: string
                temperature?: number | null
                maxTokens?: number | null
                reasoning?: boolean
                displayName?: string
                description?: string
                createdAt: string
                updatedAt: string
            } | null
            timestamp: number
        }): void => {
            callback(changeEvent)
        }
        ipcRenderer.on('personality:section-config-changed', handler)
        return () => {
            ipcRenderer.removeListener('personality:section-config-changed', handler)
        }
    },
}

// ---------------------------------------------------------------------------
// window.output — Output file management for posts and writings
// ---------------------------------------------------------------------------

/** A single content block hydrated from its <name>.md file on disk. */
interface OutputContentBlock {
    name: string
    content: string
    filetype: 'markdown'
    type: 'content'
    createdAt: string
    updatedAt: string
}

/** Shape of an output entry as returned by the main process. */
interface OutputFileResult {
    id: string
    type: string
    path: string
    metadata: {
        title: string
        type: string
        category: string
        tags: string[]
        visibility: string
        provider: string
        model: string
        temperature?: number
        maxTokens?: number | null
        reasoning?: boolean
        createdAt: string
        updatedAt: string
        content: Array<{
            type: 'content'
            filetype: 'markdown'
            name: string
            createdAt: string
            updatedAt: string
        }>
    }
    blocks: OutputContentBlock[]
    savedAt: number
}

const output = {
    save: (input: {
        type: string
        blocks: Array<{
            name: string
            content: string
            filetype?: 'markdown'
            type?: 'content'
        }>
        metadata?: Record<string, unknown>
    }): Promise<{ id: string; path: string; savedAt: number }> => {
        return unwrapIpcResult(ipcRenderer.invoke('output:save', input))
    },
    loadAll: (): Promise<OutputFileResult[]> => {
        return unwrapIpcResult(ipcRenderer.invoke('output:load-all'))
    },
    loadByType: (type: string): Promise<OutputFileResult[]> => {
        return unwrapIpcResult(ipcRenderer.invoke('output:load-by-type', type))
    },
    loadOne: (params: { type: string; id: string }): Promise<OutputFileResult | null> => {
        return unwrapIpcResult(ipcRenderer.invoke('output:load-one', params))
    },
    update: (params: {
        type: string
        id: string
        blocks: Array<{
            name: string
            content: string
            createdAt?: string
            filetype?: 'markdown'
            type?: 'content'
        }>
        metadata: Record<string, unknown>
    }): Promise<void> => {
        return unwrapIpcResult(ipcRenderer.invoke('output:update', params))
    },
    delete: (params: { type: string; id: string }): Promise<void> => {
        return unwrapIpcResult(ipcRenderer.invoke('output:delete', params))
    },
    onFileChange: (callback: (event: {
        type: 'added' | 'changed' | 'removed'
        outputType: string
        fileId: string
        filePath: string
        timestamp: number
    }) => void): (() => void) => {
        const handler = (_event: Electron.IpcRendererEvent, changeEvent: {
            type: 'added' | 'changed' | 'removed'
            outputType: string
            fileId: string
            filePath: string
            timestamp: number
        }): void => {
            callback(changeEvent)
        }
        ipcRenderer.on('output:file-changed', handler)
        return () => {
            ipcRenderer.removeListener('output:file-changed', handler)
        }
    },
    onWatcherError: (callback: (error: { error: string; timestamp: number }) => void): (() => void) => {
        const handler = (_event: Electron.IpcRendererEvent, errorData: { error: string; timestamp: number }): void => {
            callback(errorData)
        }
        ipcRenderer.on('output:watcher-error', handler)
        return () => {
            ipcRenderer.removeListener('output:watcher-error', handler)
        }
    },
}

// ---------------------------------------------------------------------------
// window.task — Background task queue
// ---------------------------------------------------------------------------
const task = {
    submit: (type: string, input: unknown, options?: {
        priority?: 'low' | 'normal' | 'high'
        timeoutMs?: number
        windowId?: number
    }): Promise<{ success: true; data: { taskId: string } } | { success: false; error: { code: string; message: string } }> => {
        return ipcRenderer.invoke('task:submit', { type, input, options })
    },
    cancel: (taskId: string): Promise<{ success: true; data: boolean } | { success: false; error: { code: string; message: string } }> => {
        return ipcRenderer.invoke('task:cancel', taskId)
    },
    list: (): Promise<{
        success: true; data: Array<{
            taskId: string
            type: string
            status: string
            priority: string
            startedAt?: number
            completedAt?: number
            windowId?: number
            error?: string
        }>
    } | { success: false; error: { code: string; message: string } }> => {
        return ipcRenderer.invoke('task:list')
    },
    onEvent: (callback: (event: {
        type: 'queued' | 'started' | 'progress' | 'completed' | 'error' | 'cancelled' | 'stream'
        data: unknown
    }) => void): (() => void) => {
        const handler = (_event: Electron.IpcRendererEvent, taskEvent: {
            type: 'queued' | 'started' | 'progress' | 'completed' | 'error' | 'cancelled' | 'stream'
            data: unknown
        }): void => {
            callback(taskEvent)
        }
        ipcRenderer.on('task:event', handler)
        return () => {
            ipcRenderer.removeListener('task:event', handler)
        }
    }
}

// ---------------------------------------------------------------------------
// window.ai — AI inference API (pipeline-based)
// ---------------------------------------------------------------------------
const ai = {
    // Run AI inference using the pipeline
    inference: (agentName: string, input: { prompt: string; context?: Record<string, unknown> }): Promise<{ success: true; data: { runId: string } } | { success: false; error: { code: string; message: string } }> => {
        return ipcRenderer.invoke('pipeline:run', agentName, input)
    },
    // Cancel a running AI inference
    cancel: (runId: string): void => {
        ipcRenderer.send('pipeline:cancel', runId)
    },
    // Listen for AI inference events (tokens, thinking, done, error)
    onEvent: (callback: (event: { type: 'token' | 'thinking' | 'done' | 'error'; data: unknown }) => void): (() => void) => {
        const handler = (_event: Electron.IpcRendererEvent, pipelineEvent: { type: 'token' | 'thinking' | 'done' | 'error'; data: unknown }): void => {
            callback(pipelineEvent)
        }
        ipcRenderer.on('pipeline:event', handler)
        return () => {
            ipcRenderer.removeListener('pipeline:event', handler)
        }
    },
    // List available AI agents
    listAgents: (): Promise<{ success: true; data: string[] } | { success: false; error: { code: string; message: string } }> => {
        return ipcRenderer.invoke('pipeline:list-agents')
    },
    // List active AI runs
    listRuns: (): Promise<{ success: true; data: Array<{ runId: string; agentName: string; startedAt: number }> } | { success: false; error: { code: string; message: string } }> => {
        return ipcRenderer.invoke('pipeline:list-runs')
    }
}

// ---------------------------------------------------------------------------
// Registration — expose all namespaces via contextBridge
// ---------------------------------------------------------------------------
if (process.contextIsolated) {
    try {
        contextBridge.exposeInMainWorld('electron', electronAPI)
        contextBridge.exposeInMainWorld('app', app)
        contextBridge.exposeInMainWorld('win', win)
        contextBridge.exposeInMainWorld('media', media)
        contextBridge.exposeInMainWorld('bluetooth', bluetooth)
        contextBridge.exposeInMainWorld('network', network)
        contextBridge.exposeInMainWorld('cron', cron)
        contextBridge.exposeInMainWorld('lifecycle', lifecycle)
        contextBridge.exposeInMainWorld('wm', wm)
        contextBridge.exposeInMainWorld('fs', fs)
        contextBridge.exposeInMainWorld('dialog', dialog)
        contextBridge.exposeInMainWorld('notification', notification)
        contextBridge.exposeInMainWorld('clipboard', clipboard)
        contextBridge.exposeInMainWorld('store', store)
        contextBridge.exposeInMainWorld('workspace', workspace)
        contextBridge.exposeInMainWorld('posts', posts)
        contextBridge.exposeInMainWorld('documents', documents)
        contextBridge.exposeInMainWorld('agent', agent)
        contextBridge.exposeInMainWorld('contextMenu', contextMenu)
        contextBridge.exposeInMainWorld('directories', directories)
        contextBridge.exposeInMainWorld('personality', personality)
        contextBridge.exposeInMainWorld('output', output)
        contextBridge.exposeInMainWorld('task', task)
        contextBridge.exposeInMainWorld('ai', ai)
    } catch (error) {
        console.error(error)
    }
} else {
    // @ts-ignore (define in dts)
    globalThis.electron = electronAPI
    // @ts-ignore (define in dts)
    globalThis.app = app
    // @ts-ignore (define in dts)
    globalThis.win = win
    // @ts-ignore (define in dts)
    globalThis.media = media
    // @ts-ignore (define in dts)
    globalThis.bluetooth = bluetooth
    // @ts-ignore (define in dts)
    globalThis.network = network
    // @ts-ignore (define in dts)
    globalThis.cron = cron
    // @ts-ignore (define in dts)
    globalThis.lifecycle = lifecycle
    // @ts-ignore (define in dts)
    globalThis.wm = wm
    // @ts-ignore (define in dts)
    globalThis.fs = fs
    // @ts-ignore (define in dts)
    globalThis.dialog = dialog
    // @ts-ignore (define in dts)
    globalThis.notification = notification
    // @ts-ignore (define in dts)
    globalThis.clipboard = clipboard
    // @ts-ignore (define in dts)
    globalThis.store = store
    // @ts-ignore (define in dts)
    globalThis.workspace = workspace
    // @ts-ignore (define in dts)
    globalThis.posts = posts
    // @ts-ignore (define in dts)
    globalThis.documents = documents
    // @ts-ignore (define in dts)
    globalThis.agent = agent
    // @ts-ignore (define in dts)
    globalThis.contextMenu = contextMenu
    // @ts-ignore (define in dts)
    globalThis.directories = directories
    // @ts-ignore (define in dts)
    globalThis.personality = personality
    // @ts-ignore (define in dts)
    globalThis.output = output
    // @ts-ignore (define in dts)
    globalThis.task = task
    // @ts-ignore (define in dts)
    globalThis.ai = ai
}
