import { contextBridge } from 'electron'
import { typedInvoke, typedInvokeUnwrap, typedInvokeRaw, typedSend, typedOn } from './typed-ipc'
import {
    AppChannels,
    WindowChannels,
    CronChannels,
    StoreChannels,
    WorkspaceChannels,
    DocumentsChannels,
    AgentChannels,
    ContextMenuChannels,
    DirectoriesChannels,
    PersonalityChannels,
    OutputChannels,
    TaskChannels,
    PipelineChannels,
} from '../shared/types/ipc/channels'
import type {
    AppApi,
    WindowApi,
    CronApi,
    StoreApi,
    WorkspaceApi,
    DocumentsApi,
    AgentApi,
    ContextMenuApi,
    DirectoriesApi,
    PersonalityApi,
    OutputApi,
    TaskApi,
    AiApi,
} from './index.d'

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
// window.cron — Scheduled job management
// ---------------------------------------------------------------------------
const cron: CronApi = {
    getAll: () => {
        return typedInvoke(CronChannels.getAll)
    },
    getJob: (id: string) => {
        return typedInvoke(CronChannels.getJob, id)
    },
    start: (id: string) => {
        return typedInvoke(CronChannels.start, id)
    },
    stop: (id: string) => {
        return typedInvoke(CronChannels.stop, id)
    },
    delete: (id: string) => {
        return typedInvoke(CronChannels.delete, id)
    },
    create: (config) => {
        return typedInvoke(CronChannels.create, config)
    },
    updateSchedule: (id: string, schedule: string) => {
        return typedInvoke(CronChannels.updateSchedule, id, schedule)
    },
    validateExpression: (expression: string) => {
        return typedInvoke(CronChannels.validateExpression, expression)
    },
    onJobResult: (callback) => {
        return typedOn(CronChannels.jobResult, callback)
    },
}

// ---------------------------------------------------------------------------
// window.store — Persisted AI model settings
// ---------------------------------------------------------------------------
const store: StoreApi = {
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
const workspace: WorkspaceApi = {
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
    onChange: (callback: (event: { currentPath: string | null; previousPath: string | null }) => void): (() => void) => {
        return typedOn(WorkspaceChannels.changed, callback)
    },
} satisfies WorkspaceApi;

// ---------------------------------------------------------------------------
// window.documents — Document import, download, and file-watch events
// ---------------------------------------------------------------------------
const documents: DocumentsApi = {
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
const agent: AgentApi = {
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
const contextMenu: ContextMenuApi = {
    showWriting: (writingId: string, writingTitle: string): Promise<void> => {
        return typedInvoke(ContextMenuChannels.writing, writingId, writingTitle)
    },
    onWritingAction: (callback: (data: { action: string; writingId: string }) => void): (() => void) => {
        return typedOn(ContextMenuChannels.writingAction, callback)
    },
}

// ---------------------------------------------------------------------------
// window.directories — Indexed directory management
// ---------------------------------------------------------------------------
const directories: DirectoriesApi = {
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
const personality: PersonalityApi = {
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
const output: OutputApi = {
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
const task: TaskApi = {
    submit: (type: string, input: unknown, options?: {
        priority?: 'low' | 'normal' | 'high'
        timeoutMs?: number
        windowId?: number
    }) => {
        return typedInvokeRaw(TaskChannels.submit, { type, input, options })
    },
    cancel: (taskId: string) => {
        return typedInvokeRaw(TaskChannels.cancel, taskId)
    },
    list: () => {
        return typedInvokeRaw(TaskChannels.list)
    },
    onEvent: (callback) => {
        return typedOn(TaskChannels.event, callback)
    },
    pause: (taskId: string) => {
        return typedInvokeRaw(TaskChannels.pause, taskId)
    },
    resume: (taskId: string) => {
        return typedInvokeRaw(TaskChannels.resume, taskId)
    },
    updatePriority: (taskId: string, priority: 'low' | 'normal' | 'high') => {
        return typedInvokeRaw(TaskChannels.updatePriority, taskId, priority)
    },
    getResult: (taskId: string) => {
        return typedInvokeRaw(TaskChannels.getResult, taskId)
    },
    queueStatus: () => {
        return typedInvokeRaw(TaskChannels.queueStatus)
    }
} satisfies TaskApi;

// ---------------------------------------------------------------------------
// window.ai — AI inference API (pipeline-based)
// ---------------------------------------------------------------------------
const ai: AiApi = {
    // Run AI inference using the pipeline
    inference: (agentName: string, input) => {
        return typedInvokeRaw(PipelineChannels.run, agentName, input)
    },
    // Cancel a running AI inference
    cancel: (runId: string) => {
        typedSend(PipelineChannels.cancel, runId)
    },
    // Listen for AI inference events (tokens, thinking, done, error)
    onEvent: (callback) => {
        return typedOn(PipelineChannels.event, callback)
    },
    // List available AI agents
    listAgents: () => {
        return typedInvokeRaw(PipelineChannels.listAgents)
    },
    // List active AI runs
    listRuns: () => {
        return typedInvokeRaw(PipelineChannels.listRuns)
    }
}

// ---------------------------------------------------------------------------
// Registration — expose all namespaces via contextBridge
// ---------------------------------------------------------------------------
if (process.contextIsolated) {
    try {
        contextBridge.exposeInMainWorld('app', app)
        contextBridge.exposeInMainWorld('win', win)
        contextBridge.exposeInMainWorld('cron', cron)
        contextBridge.exposeInMainWorld('store', store)
        contextBridge.exposeInMainWorld('workspace', workspace)
        contextBridge.exposeInMainWorld('documents', documents)
        contextBridge.exposeInMainWorld('agent', agent)
        contextBridge.exposeInMainWorld('contextMenu', contextMenu)
        contextBridge.exposeInMainWorld('directories', directories)
        contextBridge.exposeInMainWorld('personality', personality)
        contextBridge.exposeInMainWorld('output', output)
        contextBridge.exposeInMainWorld('task', task)
        contextBridge.exposeInMainWorld('ai', ai)
        contextBridge.exposeInMainWorld('writingItems', writingItems)
    } catch (error) {
        console.error('[preload] Failed to expose IPC APIs:', error)
    }
} else {
    // @ts-ignore (define in dts)
    globalThis.app = app
    // @ts-ignore (define in dts)
    globalThis.win = win
    // @ts-ignore (define in dts)
    globalThis.cron = cron
    // @ts-ignore (define in dts)
    globalThis.store = store
    // @ts-ignore (define in dts)
    globalThis.workspace = workspace
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
    // @ts-ignore (define in dts)
    globalThis.writingItems = writingItems
}
