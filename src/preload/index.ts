import { contextBridge } from 'electron'
import { typedInvoke, typedInvokeUnwrap, typedInvokeRaw, typedSend, typedOn } from './typed-ipc'
import {
    AppChannels,
    WindowChannels,
    StoreChannels,
    WorkspaceChannels,
    DocumentsChannels,
    ContextMenuChannels,
    DirectoriesChannels,
    PersonalityChannels,
    OutputChannels,
    TaskChannels,
} from '../shared/types/ipc/channels'
import type {
    AppApi,
    WindowApi,
    StoreApi,
    WorkspaceApi,
    TaskApi,
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
    showWriting: (writingId: string, writingTitle: string): Promise<void> => {
        return typedInvoke(ContextMenuChannels.writing, writingId, writingTitle)
    },
    onWritingAction: (callback: (data: { action: string; writingId: string }) => void): (() => void) => {
        return typedOn(ContextMenuChannels.writingAction, callback)
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
// window.workspace — Workspace folder selection, recent workspaces, and docs/dirs/personality
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
    onDeleted: (callback: (event: { deletedPath: string; reason: 'deleted' | 'inaccessible' | 'renamed'; timestamp: number }) => void): (() => void) => {
        return typedOn(WorkspaceChannels.deleted, callback)
    },
    // Nested: Document import, download, and file-watch events
    documents: {
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
    },
    // Nested: Indexed directory management
    directories: {
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
    },
    // Nested: Output file management (posts and writings)
    output: {
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
    },
    // Nested: Personality/conversation file management
    personality: {
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
    },
} satisfies WorkspaceApi;


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
// Registration — expose all namespaces via contextBridge
// ---------------------------------------------------------------------------
if (process.contextIsolated) {
    try {
        contextBridge.exposeInMainWorld('app', app)
        contextBridge.exposeInMainWorld('win', win)
        contextBridge.exposeInMainWorld('store', store)
        contextBridge.exposeInMainWorld('workspace', workspace)
        contextBridge.exposeInMainWorld('contextMenu', contextMenu)
        contextBridge.exposeInMainWorld('task', task)
    } catch (error) {
        console.error('[preload] Failed to expose IPC APIs:', error)
    }
} else {
    // @ts-ignore (define in dts)
    globalThis.app = app
    // @ts-ignore (define in dts)
    globalThis.win = win
    // @ts-ignore (define in dts)
    globalThis.store = store
    // @ts-ignore (define in dts)
    globalThis.workspace = workspace
    // @ts-ignore (define in dts)
    globalThis.contextMenu = contextMenu
    // @ts-ignore (define in dts)
    globalThis.task = task
}
