import { contextBridge } from 'electron'
import { typedInvoke, typedInvokeUnwrap, typedInvokeRaw, typedSend, typedOn } from './typed-ipc'
import {
    AppChannels,
    WindowChannels,
    MediaChannels,
    BluetoothChannels,
    NetworkChannels,
    CronChannels,
    LifecycleChannels,
    WmChannels,
    FsChannels,
    DialogChannels,
    NotificationChannels,
    ClipboardChannels,
    StoreChannels,
    WorkspaceChannels,
    PostsChannels,
    DocumentsChannels,
    AgentChannels,
    ContextMenuChannels,
    DirectoriesChannels,
    PersonalityChannels,
    OutputChannels,
    TaskChannels,
    PipelineChannels,
} from '../shared/types/ipc/channels'

// ---------------------------------------------------------------------------
// window.app — General application utilities
// ---------------------------------------------------------------------------
const app: AppApi = {
    playSound: (): void => {
        typedSend(AppChannels.playSound)
    },
    setTheme: (theme: string): void => {
        typedSend(AppChannels.setTheme, theme)
    },
    showContextMenu: (): void => {
        typedSend(AppChannels.contextMenu)
    },
    showContextMenuEditable: (): void => {
        typedSend(AppChannels.contextMenuEditable)
    },
    onLanguageChange: (callback: (lng: string) => void): (() => void) => {
        return typedOn(AppChannels.changeLanguage, callback)
    },
    onThemeChange: (callback: (theme: string) => void): (() => void) => {
        return typedOn(AppChannels.changeTheme, callback)
    },
    onFileOpened: (callback: (filePath: string) => void): (() => void) => {
        return typedOn(AppChannels.fileOpened, callback)
    },
    popupMenu: (): void => {
        typedSend(WindowChannels.popupMenu)
    },
    getPlatform: (): Promise<string> => {
        return typedInvoke(WindowChannels.getPlatform)
    },
}

// ---------------------------------------------------------------------------
// window.win — Window controls
// ---------------------------------------------------------------------------
const win: WindowApi = {
    minimize: (): void => {
        typedSend(WindowChannels.minimize)
    },
    maximize: (): void => {
        typedSend(WindowChannels.maximize)
    },
    close: (): void => {
        typedSend(WindowChannels.close)
    },
    isMaximized: (): Promise<boolean> => {
        return typedInvokeUnwrap(WindowChannels.isMaximized)
    },
    isFullScreen: (): Promise<boolean> => {
        return typedInvokeUnwrap(WindowChannels.isFullScreen)
    },
    onMaximizeChange: (callback: (isMaximized: boolean) => void): (() => void) => {
        return typedOn(WindowChannels.maximizeChange, callback)
    },
    onFullScreenChange: (callback: (isFullScreen: boolean) => void): (() => void) => {
        return typedOn(WindowChannels.fullScreenChange, callback)
    },
}

// ---------------------------------------------------------------------------
// window.media — Microphone / camera permissions and device enumeration
// ---------------------------------------------------------------------------
const media: MediaApi = {
    requestMicrophonePermission: (): Promise<string> => {
        return typedInvoke(MediaChannels.requestMicrophone)
    },
    requestCameraPermission: (): Promise<string> => {
        return typedInvoke(MediaChannels.requestCamera)
    },
    getMicrophonePermissionStatus: (): Promise<string> => {
        return typedInvoke(MediaChannels.getMicrophoneStatus)
    },
    getCameraPermissionStatus: (): Promise<string> => {
        return typedInvoke(MediaChannels.getCameraStatus)
    },
    getDevices: (type: 'audioinput' | 'videoinput') => {
        return typedInvoke(MediaChannels.getDevices, type)
    },
}

// ---------------------------------------------------------------------------
// window.bluetooth — Bluetooth capability queries
// ---------------------------------------------------------------------------
const bluetooth: BluetoothApi = {
    isSupported: (): Promise<boolean> => {
        return typedInvoke(BluetoothChannels.isSupported)
    },
    getPermissionStatus: (): Promise<string> => {
        return typedInvoke(BluetoothChannels.getPermissionStatus)
    },
    getInfo: (): Promise<{ platform: string; supported: boolean; apiAvailable: boolean }> => {
        return typedInvoke(BluetoothChannels.getInfo)
    },
}

// ---------------------------------------------------------------------------
// window.network — Network connectivity and interface information
// ---------------------------------------------------------------------------
const network: NetworkApi = {
    isSupported: (): Promise<boolean> => {
        return typedInvoke(NetworkChannels.isSupported)
    },
    getConnectionStatus: (): Promise<string> => {
        return typedInvoke(NetworkChannels.getConnectionStatus)
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
        return typedInvoke(NetworkChannels.getInterfaces)
    },
    getInfo: (): Promise<{
        platform: string
        supported: boolean
        isOnline: boolean
        interfaceCount: number
    }> => {
        return typedInvoke(NetworkChannels.getInfo)
    },
    onStatusChange: (callback: (status: string) => void): (() => void) => {
        return typedOn(NetworkChannels.statusChanged, callback)
    },
}

// ---------------------------------------------------------------------------
// window.cron — Scheduled job management
// ---------------------------------------------------------------------------
const cron: CronApi = {
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
        return typedInvoke(CronChannels.getAll)
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
        return typedInvoke(CronChannels.getJob, id)
    },
    start: (id: string): Promise<boolean> => {
        return typedInvoke(CronChannels.start, id)
    },
    stop: (id: string): Promise<boolean> => {
        return typedInvoke(CronChannels.stop, id)
    },
    delete: (id: string): Promise<boolean> => {
        return typedInvoke(CronChannels.delete, id)
    },
    create: (config: {
        id: string
        name: string
        schedule: string
        enabled: boolean
        runCount: number
        description?: string
    }): Promise<boolean> => {
        return typedInvoke(CronChannels.create, config)
    },
    updateSchedule: (id: string, schedule: string): Promise<boolean> => {
        return typedInvoke(CronChannels.updateSchedule, id, schedule)
    },
    validateExpression: (expression: string): Promise<{ valid: boolean; description?: string; error?: string }> => {
        return typedInvoke(CronChannels.validateExpression, expression)
    },
    onJobResult: (callback: (result: {
        id: string
        timestamp: Date
        success: boolean
        message?: string
        data?: unknown
    }) => void): (() => void) => {
        return typedOn(CronChannels.jobResult, callback)
    },
}

// ---------------------------------------------------------------------------
// window.lifecycle — App lifecycle state and events
// ---------------------------------------------------------------------------
const lifecycle: LifecycleApi = {
    getState: (): Promise<{
        isSingleInstance: boolean
        events: Array<{ type: string; timestamp: number; detail?: string }>
        appReadyAt: number | null
        platform: string
    }> => {
        return typedInvoke(LifecycleChannels.getState)
    },
    getEvents: (): Promise<Array<{ type: string; timestamp: number; detail?: string }>> => {
        return typedInvoke(LifecycleChannels.getEvents)
    },
    restart: (): Promise<void> => {
        return typedInvoke(LifecycleChannels.restart)
    },
    onEvent: (callback: (event: { type: string; timestamp: number; detail?: string }) => void): (() => void) => {
        return typedOn(LifecycleChannels.event, callback)
    },
}

// ---------------------------------------------------------------------------
// window.wm — Window manager (child / modal / frameless / widget windows)
// ---------------------------------------------------------------------------
const wm = {
    getState: (): Promise<{
        windows: Array<{ id: number; type: string; title: string; createdAt: number }>
    }> => {
        return typedInvoke(WmChannels.getState)
    },
    createChild: (): Promise<{ id: number; type: string; title: string; createdAt: number }> => {
        return typedInvoke(WmChannels.createChild)
    },
    createModal: (): Promise<{ id: number; type: string; title: string; createdAt: number }> => {
        return typedInvoke(WmChannels.createModal)
    },
    createFrameless: (): Promise<{ id: number; type: string; title: string; createdAt: number }> => {
        return typedInvoke(WmChannels.createFrameless)
    },
    createWidget: (): Promise<{ id: number; type: string; title: string; createdAt: number }> => {
        return typedInvoke(WmChannels.createWidget)
    },
    closeWindow: (id: number): Promise<boolean> => {
        return typedInvoke(WmChannels.closeWindow, id)
    },
    closeAll: (): Promise<void> => {
        return typedInvoke(WmChannels.closeAll)
    },
    onStateChange: (callback: (state: {
        windows: Array<{ id: number; type: string; title: string; createdAt: number }>
    }) => void): (() => void) => {
        return typedOn(WmChannels.stateChanged, callback)
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
        return typedInvoke(FsChannels.openFileDialog)
    },
    readFile: (filePath: string): Promise<{
        filePath: string
        fileName: string
        content: string
        size: number
        lastModified: number
    }> => {
        return typedInvoke(FsChannels.readFile, filePath)
    },
    saveFile: (defaultName: string, content: string): Promise<{
        success: boolean
        filePath: string | null
    }> => {
        return typedInvoke(FsChannels.saveFileDialog, defaultName, content)
    },
    writeFile: (filePath: string, content: string): Promise<{
        success: boolean
        filePath: string
    }> => {
        return typedInvoke(FsChannels.writeFile, filePath, content)
    },
    selectDirectory: (): Promise<string | null> => {
        return typedInvoke(FsChannels.selectDirectory)
    },
    watchDirectory: (dirPath: string): Promise<boolean> => {
        return typedInvoke(FsChannels.watchDirectory, dirPath)
    },
    unwatchDirectory: (dirPath: string): Promise<boolean> => {
        return typedInvoke(FsChannels.unwatchDirectory, dirPath)
    },
    getWatched: (): Promise<string[]> => {
        return typedInvoke(FsChannels.getWatchedDirectories)
    },
    onWatchEvent: (callback: (event: {
        eventType: string
        filename: string | null
        directory: string
        timestamp: number
    }) => void): (() => void) => {
        return typedOn(FsChannels.watchEvent, callback)
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
        return typedInvokeUnwrap(DialogChannels.open)
    },
    openDirectory: (multiSelections = false): Promise<{
        type: string
        timestamp: number
        data: Record<string, unknown>
    }> => {
        return typedInvokeUnwrap(DialogChannels.openDirectory, multiSelections)
    },
    save: (): Promise<{
        type: string
        timestamp: number
        data: Record<string, unknown>
    }> => {
        return typedInvokeUnwrap(DialogChannels.save)
    },
    message: (message: string, detail: string, buttons: string[]): Promise<{
        type: string
        timestamp: number
        data: Record<string, unknown>
    }> => {
        return typedInvokeUnwrap(DialogChannels.message, message, detail, buttons)
    },
    error: (title: string, content: string): Promise<{
        type: string
        timestamp: number
        data: Record<string, unknown>
    }> => {
        return typedInvokeUnwrap(DialogChannels.error, title, content)
    },
}

// ---------------------------------------------------------------------------
// window.notification — Desktop notifications
// ---------------------------------------------------------------------------
const notification = {
    isSupported: (): Promise<boolean> => {
        return typedInvoke(NotificationChannels.isSupported)
    },
    show: (options: {
        title: string
        body: string
        silent?: boolean
        urgency?: 'normal' | 'critical' | 'low'
    }): Promise<string> => {
        return typedInvoke(NotificationChannels.show, options)
    },
    onEvent: (callback: (result: {
        id: string
        title: string
        body: string
        timestamp: number
        action: 'clicked' | 'closed' | 'shown'
    }) => void): (() => void) => {
        return typedOn(NotificationChannels.event, callback)
    },
}

// ---------------------------------------------------------------------------
// window.clipboard — Clipboard read / write operations
// ---------------------------------------------------------------------------
const clipboard = {
    writeText: (text: string): Promise<boolean> => {
        return typedInvoke(ClipboardChannels.writeText, text)
    },
    readText: (): Promise<string> => {
        return typedInvoke(ClipboardChannels.readText)
    },
    writeHTML: (html: string): Promise<boolean> => {
        return typedInvoke(ClipboardChannels.writeHTML, html)
    },
    readHTML: (): Promise<string> => {
        return typedInvoke(ClipboardChannels.readHTML)
    },
    writeImage: (dataURL: string): Promise<boolean> => {
        return typedInvoke(ClipboardChannels.writeImage, dataURL)
    },
    readImage: (): Promise<{ dataURL: string; width: number; height: number } | null> => {
        return typedInvoke(ClipboardChannels.readImage)
    },
    clear: (): Promise<boolean> => {
        return typedInvoke(ClipboardChannels.clear)
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
        return typedInvoke(ClipboardChannels.getContent)
    },
    getFormats: (): Promise<string[]> => {
        return typedInvoke(ClipboardChannels.getFormats)
    },
    hasText: (): Promise<boolean> => {
        return typedInvoke(ClipboardChannels.hasText)
    },
    hasImage: (): Promise<boolean> => {
        return typedInvoke(ClipboardChannels.hasImage)
    },
    hasHTML: (): Promise<boolean> => {
        return typedInvoke(ClipboardChannels.hasHTML)
    },
}

// ---------------------------------------------------------------------------
// window.store — Persisted AI model settings
// ---------------------------------------------------------------------------
const store = {
    // New provider settings methods
    getAllProviderSettings: (): Promise<Record<string, { selectedModel: string; apiToken: string; temperature: number; maxTokens: number | null; reasoning: boolean }>> => {
        return typedInvokeUnwrap(StoreChannels.getAllProviderSettings)
    },
    getProviderSettings: (providerId: string): Promise<{ selectedModel: string; apiToken: string; temperature: number; maxTokens: number | null; reasoning: boolean } | null> => {
        return typedInvokeUnwrap(StoreChannels.getProviderSettings, providerId)
    },
    setProviderSettings: (providerId: string, settings: { selectedModel: string; apiToken: string; temperature: number; maxTokens: number | null; reasoning: boolean }): Promise<void> => {
        return typedInvokeUnwrap(StoreChannels.setProviderSettings, providerId, settings)
    },
    setInferenceDefaults: (providerId: string, update: { temperature?: number; maxTokens?: number | null; reasoning?: boolean }): Promise<void> => {
        return typedInvokeUnwrap(StoreChannels.setInferenceDefaults, providerId, update)
    },
    // Legacy methods
    getAllModelSettings: (): Promise<Record<string, { selectedModel: string; apiToken: string }>> => {
        return typedInvokeUnwrap(StoreChannels.getAllModelSettings)
    },
    getModelSettings: (providerId: string): Promise<{ selectedModel: string; apiToken: string } | null> => {
        return typedInvokeUnwrap(StoreChannels.getModelSettings, providerId)
    },
    setSelectedModel: (providerId: string, modelId: string): Promise<void> => {
        return typedInvokeUnwrap(StoreChannels.setSelectedModel, providerId, modelId)
    },
    setApiToken: (providerId: string, token: string): Promise<void> => {
        return typedInvokeUnwrap(StoreChannels.setApiToken, providerId, token)
    },
    setModelSettings: (providerId: string, settings: { selectedModel: string; apiToken: string }): Promise<void> => {
        return typedInvokeUnwrap(StoreChannels.setModelSettings, providerId, settings)
    },
}

// ---------------------------------------------------------------------------
// window.workspace — Workspace folder selection and recent workspaces
// ---------------------------------------------------------------------------
const workspace = {
    selectFolder: (): Promise<string | null> => {
        return typedInvokeUnwrap(WorkspaceChannels.selectFolder)
    },
    getCurrent: (): Promise<string | null> => {
        return typedInvokeUnwrap(WorkspaceChannels.getCurrent)
    },
    setCurrent: (workspacePath: string): Promise<void> => {
        return typedInvokeUnwrap(WorkspaceChannels.setCurrent, workspacePath)
    },
    getRecent: (): Promise<Array<{ path: string; lastOpened: number }>> => {
        return typedInvokeUnwrap(WorkspaceChannels.getRecent)
    },
    clear: (): Promise<void> => {
        return typedInvokeUnwrap(WorkspaceChannels.clear)
    },
    directoryExists: (directoryPath: string): Promise<boolean> => {
        return typedInvokeUnwrap(WorkspaceChannels.directoryExists, directoryPath)
    },
    removeRecent: (workspacePath: string): Promise<void> => {
        return typedInvokeUnwrap(WorkspaceChannels.removeRecent, workspacePath)
    },
}

// ---------------------------------------------------------------------------
// window.posts — Post sync and file-watch events
// ---------------------------------------------------------------------------
const posts = {
    syncToWorkspace: (postsData: Array<{
        id: string
        title: string
        blocks: Array<{ id: string; content: string; createdAt: string; updatedAt: string }>
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
        return typedInvokeUnwrap(PostsChannels.syncToWorkspace, postsData)
    },
    update: (post: {
        id: string
        title: string
        blocks: Array<{ id: string; content: string; createdAt: string; updatedAt: string }>
        category: string
        tags: string[]
        visibility: string
        createdAt: number
        updatedAt: number
    }): Promise<void> => {
        return typedInvokeUnwrap(PostsChannels.updatePost, post)
    },
    delete: (postId: string): Promise<void> => {
        return typedInvokeUnwrap(PostsChannels.deletePost, postId)
    },
    loadFromWorkspace: (): Promise<Array<{
        id: string
        title: string
        blocks: Array<{ id: string; content: string; createdAt: string; updatedAt: string }>
        category: string
        tags: string[]
        visibility: string
        createdAt: number
        updatedAt: number
    }>> => {
        return typedInvokeUnwrap(PostsChannels.loadFromWorkspace)
    },
    onFileChange: (callback: (event: {
        type: 'added' | 'changed' | 'removed'
        postId: string
        filePath: string
        timestamp: number
    }) => void): (() => void) => {
        return typedOn(PostsChannels.fileChanged, callback)
    },
    onWatcherError: (callback: (error: { error: string; timestamp: number }) => void): (() => void) => {
        return typedOn(PostsChannels.watcherError, callback)
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
        return typedInvokeUnwrap(DocumentsChannels.importFiles)
    },
    importByPaths: (paths: string[]): Promise<Array<{
        id: string; name: string; path: string; size: number;
        mimeType: string; importedAt: number; lastModified: number;
    }>> => {
        return typedInvokeUnwrap(DocumentsChannels.importByPaths, paths)
    },
    downloadFromUrl: (url: string): Promise<{
        id: string; name: string; path: string; size: number;
        mimeType: string; importedAt: number; lastModified: number;
    }> => {
        return typedInvokeUnwrap(DocumentsChannels.downloadFromUrl, url)
    },
    loadAll: (): Promise<Array<{
        id: string; name: string; path: string; size: number;
        mimeType: string; importedAt: number; lastModified: number;
    }>> => {
        return typedInvokeUnwrap(DocumentsChannels.loadAll)
    },
    delete: (id: string): Promise<void> => {
        return typedInvokeUnwrap(DocumentsChannels.deleteFile, id)
    },
    onFileChange: (callback: (event: {
        type: 'added' | 'changed' | 'removed';
        fileId: string;
        filePath: string;
        timestamp: number;
    }) => void): (() => void) => {
        return typedOn(DocumentsChannels.fileChanged, callback)
    },
    onWatcherError: (callback: (error: { error: string; timestamp: number }) => void): (() => void) => {
        return typedOn(DocumentsChannels.watcherError, callback)
    },
}

// ---------------------------------------------------------------------------
// window.agent — AI agent execution and session management
// ---------------------------------------------------------------------------
const agent = {
    run: (messages: Array<{ role: 'user' | 'assistant'; content: string }>, runId: string, providerId: string): Promise<void> => {
        return typedInvoke(AgentChannels.run, messages, runId, providerId)
    },
    cancel: (runId: string): void => {
        typedSend(AgentChannels.cancel, runId)
    },
    onEvent: (callback: (eventType: string, data: unknown) => void): (() => void) => {
        const channels = [
            AgentChannels.token,
            AgentChannels.thinking,
            AgentChannels.toolStart,
            AgentChannels.toolEnd,
            AgentChannels.done,
            AgentChannels.error,
        ] as const
        const cleanups = channels.map((channel) => {
            return typedOn(channel, (data: unknown) => {
                callback(channel, data)
            })
        })
        return (): void => {
            cleanups.forEach((cleanup) => cleanup())
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
        return typedInvoke(AgentChannels.createSession, config)
    },
    destroySession: (sessionId: string): Promise<boolean> => {
        return typedInvoke(AgentChannels.destroySession, sessionId)
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
        return typedInvoke(AgentChannels.getSession, sessionId)
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
        return typedInvoke(AgentChannels.listSessions)
    },
    clearSessions: (): Promise<number> => {
        return typedInvoke(AgentChannels.clearSessions)
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
        return typedInvoke(AgentChannels.runSession, options)
    },
    cancelSession: (sessionId: string): Promise<boolean> => {
        return typedInvoke(AgentChannels.cancelSession, sessionId)
    },
    getStatus: (): Promise<{
        totalSessions: number
        activeSessions: number
        totalMessages: number
    }> => {
        return typedInvoke(AgentChannels.getStatus)
    },
    isRunning: (runId: string): Promise<boolean> => {
        return typedInvoke(AgentChannels.isRunning, runId)
    },
}

// ---------------------------------------------------------------------------
// window.contextMenu — Application-specific context menus
// ---------------------------------------------------------------------------
const contextMenu = {
    showWriting: (writingId: string, writingTitle: string): Promise<void> => {
        return typedInvoke(ContextMenuChannels.writing, writingId, writingTitle)
    },
    onWritingAction: (callback: (data: { action: string; writingId: string }) => void): (() => void) => {
        return typedOn(ContextMenuChannels.writingAction, callback)
    },
    showPost: (postId: string, postTitle: string): Promise<void> => {
        return typedInvoke(ContextMenuChannels.post, postId, postTitle)
    },
    onPostAction: (callback: (data: { action: string; postId: string }) => void): (() => void) => {
        return typedOn(ContextMenuChannels.postAction, callback)
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
        return typedInvokeUnwrap(DirectoriesChannels.list)
    },
    add: (dirPath: string): Promise<{
        id: string
        path: string
        addedAt: number
        isIndexed: boolean
        lastIndexedAt?: number
    }> => {
        return typedInvokeUnwrap(DirectoriesChannels.add, dirPath)
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
        return typedInvokeUnwrap(DirectoriesChannels.addMany, dirPaths)
    },
    remove: (id: string): Promise<boolean> => {
        return typedInvokeUnwrap(DirectoriesChannels.remove, id)
    },
    validate: (dirPath: string): Promise<{ valid: boolean; error?: string }> => {
        return typedInvokeUnwrap(DirectoriesChannels.validate, dirPath)
    },
    markIndexed: (id: string, isIndexed: boolean): Promise<boolean> => {
        return typedInvokeUnwrap(DirectoriesChannels.markIndexed, id, isIndexed)
    },
    onChanged: (callback: (directories: Array<{
        id: string
        path: string
        addedAt: number
        isIndexed: boolean
        lastIndexedAt?: number
    }>) => void): (() => void) => {
        return typedOn(DirectoriesChannels.changed, callback)
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
        return typedInvokeUnwrap(PersonalityChannels.save, input)
    },
    loadAll: () => {
        return typedInvokeUnwrap(PersonalityChannels.loadAll)
    },
    loadOne: (params: {
        sectionId: string
        id: string
    }) => {
        return typedInvokeUnwrap(PersonalityChannels.loadOne, params)
    },
    delete: (params: {
        sectionId: string
        id: string
    }): Promise<void> => {
        return typedInvokeUnwrap(PersonalityChannels.delete, params)
    },
    onFileChange: (callback: (event: {
        type: 'added' | 'changed' | 'removed'
        sectionId: string
        fileId: string
        filePath: string
        timestamp: number
    }) => void): (() => void) => {
        return typedOn(PersonalityChannels.fileChanged, callback)
    },
    onWatcherError: (callback: (error: { error: string; timestamp: number }) => void): (() => void) => {
        return typedOn(PersonalityChannels.watcherError, callback)
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
        return typedInvokeUnwrap(PersonalityChannels.loadSectionConfig, params)
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
        return typedInvokeUnwrap(PersonalityChannels.saveSectionConfig, params)
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
        return typedOn(PersonalityChannels.sectionConfigChanged, callback)
    },
}

// ---------------------------------------------------------------------------
// window.output — Output file management for posts and writings
// ---------------------------------------------------------------------------
const output = {
    save: (input: {
        type: string
        blocks: Array<{
            name: string
            content: string
            createdAt: string
            updatedAt: string
        }>
        metadata?: Record<string, unknown>
    }): Promise<{ id: string; path: string; savedAt: number }> => {
        return typedInvokeUnwrap(OutputChannels.save, input)
    },
    loadAll: () => {
        return typedInvokeUnwrap(OutputChannels.loadAll)
    },
    loadByType: (type: string) => {
        return typedInvokeUnwrap(OutputChannels.loadByType, type)
    },
    loadOne: (params: { type: string; id: string }) => {
        return typedInvokeUnwrap(OutputChannels.loadOne, params)
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
        return typedInvokeUnwrap(OutputChannels.update, params)
    },
    delete: (params: { type: string; id: string }): Promise<void> => {
        return typedInvokeUnwrap(OutputChannels.delete, params)
    },
    onFileChange: (callback: (event: {
        type: 'added' | 'changed' | 'removed'
        outputType: string
        fileId: string
        filePath: string
        timestamp: number
    }) => void): (() => void) => {
        return typedOn(OutputChannels.fileChanged, callback)
    },
    onWatcherError: (callback: (error: { error: string; timestamp: number }) => void): (() => void) => {
        return typedOn(OutputChannels.watcherError, callback)
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
        return typedInvokeRaw(TaskChannels.submit, { type, input, options })
    },
    cancel: (taskId: string): Promise<{ success: true; data: boolean } | { success: false; error: { code: string; message: string } }> => {
        return typedInvokeRaw(TaskChannels.cancel, taskId)
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
        return typedInvokeRaw(TaskChannels.list)
    },
    onEvent: (callback: (event: {
        type: 'queued' | 'started' | 'progress' | 'completed' | 'error' | 'cancelled' | 'stream'
        data: unknown
    }) => void): (() => void) => {
        return typedOn(TaskChannels.event, callback)
    }
}

// ---------------------------------------------------------------------------
// window.ai — AI inference API (pipeline-based)
// ---------------------------------------------------------------------------
const ai = {
    // Run AI inference using the pipeline
    inference: (agentName: string, input: { prompt: string; context?: Record<string, unknown> }): Promise<{ success: true; data: { runId: string } } | { success: false; error: { code: string; message: string } }> => {
        return typedInvokeRaw(PipelineChannels.run, agentName, input)
    },
    // Cancel a running AI inference
    cancel: (runId: string): void => {
        typedSend(PipelineChannels.cancel, runId)
    },
    // Listen for AI inference events (tokens, thinking, done, error)
    onEvent: (callback: (event: { type: 'token' | 'thinking' | 'done' | 'error'; data: unknown }) => void): (() => void) => {
        return typedOn(PipelineChannels.event, callback)
    },
    // List available AI agents
    listAgents: (): Promise<{ success: true; data: string[] } | { success: false; error: { code: string; message: string } }> => {
        return typedInvokeRaw(PipelineChannels.listAgents)
    },
    // List active AI runs
    listRuns: (): Promise<{ success: true; data: Array<{ runId: string; agentName: string; startedAt: number }> } | { success: false; error: { code: string; message: string } }> => {
        return typedInvokeRaw(PipelineChannels.listRuns)
    }
}

// ---------------------------------------------------------------------------
// Registration — expose all namespaces via contextBridge
// ---------------------------------------------------------------------------
if (process.contextIsolated) {
    // Register each namespace independently so a single failure cannot
    // prevent subsequent namespaces from being exposed to the renderer.
    const namespaces: Array<[string, unknown]> = [
        ['app', app],
        ['win', win],
        ['media', media],
        ['bluetooth', bluetooth],
        ['network', network],
        ['cron', cron],
        ['lifecycle', lifecycle],
        ['wm', wm],
        ['fs', fs],
        ['dialog', dialog],
        ['notification', notification],
        ['clipboard', clipboard],
        ['store', store],
        ['workspace', workspace],
        ['posts', posts],
        ['documents', documents],
        ['agent', agent],
        ['contextMenu', contextMenu],
        ['directories', directories],
        ['personality', personality],
        ['output', output],
        ['task', task],
        ['ai', ai],
    ]
    for (const [name, api] of namespaces) {
        try {
            contextBridge.exposeInMainWorld(name, api)
        } catch (error) {
            console.error(`[preload] Failed to expose window.${name}:`, error)
        }
    }
} else {
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
