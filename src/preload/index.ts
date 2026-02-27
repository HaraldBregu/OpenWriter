import { contextBridge } from 'electron'
import { typedInvoke, typedInvokeUnwrap, typedInvokeRaw, typedSend, typedOn } from './typed-ipc'
import {
    AppChannels,
    WindowChannels,
    WorkspaceChannels,
    TaskChannels,
} from '../shared/types/ipc/channels'
import type {
    AppApi,
    WindowApi,
    WorkspaceApi,
    TaskApi,
} from './index.d'

// ---------------------------------------------------------------------------
// window.app — General application utilities + persisted AI model settings
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
        return typedInvoke(AppChannels.showWritingContextMenu, writingId, writingTitle)
    },
    onWritingAction: (callback: (data: { action: string; writingId: string }) => void): (() => void) => {
        return typedOn(AppChannels.writingContextMenuAction, callback)
    },
    // -------------------------------------------------------------------------
    // Persisted AI model settings (merged from former window.store namespace)
    // -------------------------------------------------------------------------
    getAllProviderSettings: (): Promise<Record<string, { selectedModel: string; apiToken: string; temperature: number; maxTokens: number | null; reasoning: boolean }>> => {
        return typedInvokeUnwrap(AppChannels.getAllProviderSettings)
    },
    getProviderSettings: (providerId: string): Promise<{ selectedModel: string; apiToken: string; temperature: number; maxTokens: number | null; reasoning: boolean } | null> => {
        return typedInvokeUnwrap(AppChannels.getProviderSettings, providerId)
    },
    setProviderSettings: (providerId: string, settings: { selectedModel: string; apiToken: string; temperature: number; maxTokens: number | null; reasoning: boolean }): Promise<void> => {
        return typedInvokeUnwrap(AppChannels.setProviderSettings, providerId, settings)
    },
    setInferenceDefaults: (providerId: string, update: { temperature?: number; maxTokens?: number | null; reasoning?: boolean }): Promise<void> => {
        return typedInvokeUnwrap(AppChannels.setInferenceDefaults, providerId, update)
    },
    // Legacy methods — kept for backward compatibility with any remaining callers
    getAllModelSettings: (): Promise<Record<string, { selectedModel: string; apiToken: string }>> => {
        return typedInvokeUnwrap(AppChannels.getAllModelSettings)
    },
    getModelSettings: (providerId: string): Promise<{ selectedModel: string; apiToken: string } | null> => {
        return typedInvokeUnwrap(AppChannels.getModelSettings, providerId)
    },
    setSelectedModel: (providerId: string, modelId: string): Promise<void> => {
        return typedInvokeUnwrap(AppChannels.setSelectedModel, providerId, modelId)
    },
    setApiToken: (providerId: string, token: string): Promise<void> => {
        return typedInvokeUnwrap(AppChannels.setApiToken, providerId, token)
    },
    setModelSettings: (providerId: string, settings: { selectedModel: string; apiToken: string }): Promise<void> => {
        return typedInvokeUnwrap(AppChannels.setModelSettings, providerId, settings)
    },
} satisfies AppApi;

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
} satisfies WindowApi;

// ---------------------------------------------------------------------------
// window.workspace — Workspace folder selection, documents, directories, personality, output
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
    // -------------------------------------------------------------------------
    // Document import, download, and file-watch events
    // -------------------------------------------------------------------------
    importFiles: (): Promise<Array<{
        id: string; name: string; path: string; size: number;
        mimeType: string; importedAt: number; lastModified: number;
    }>> => {
        return typedInvokeUnwrap(WorkspaceChannels.importFiles)
    },
    importByPaths: (paths: string[]): Promise<Array<{
        id: string; name: string; path: string; size: number;
        mimeType: string; importedAt: number; lastModified: number;
    }>> => {
        return typedInvokeUnwrap(WorkspaceChannels.importByPaths, paths)
    },
    downloadFromUrl: (url: string): Promise<{
        id: string; name: string; path: string; size: number;
        mimeType: string; importedAt: number; lastModified: number;
    }> => {
        return typedInvokeUnwrap(WorkspaceChannels.downloadFromUrl, url)
    },
    loadDocuments: (): Promise<Array<{
        id: string; name: string; path: string; size: number;
        mimeType: string; importedAt: number; lastModified: number;
    }>> => {
        return typedInvokeUnwrap(WorkspaceChannels.documentsLoadAll)
    },
    deleteDocument: (id: string): Promise<void> => {
        return typedInvokeUnwrap(WorkspaceChannels.deleteFile, id)
    },
    onDocumentFileChange: (callback: (event: {
        type: 'added' | 'changed' | 'removed';
        fileId: string;
        filePath: string;
        timestamp: number;
    }) => void): (() => void) => {
        return typedOn(WorkspaceChannels.documentsFileChanged, callback)
    },
    onDocumentWatcherError: (callback: (error: { error: string; timestamp: number }) => void): (() => void) => {
        return typedOn(WorkspaceChannels.documentsWatcherError, callback)
    },
    // -------------------------------------------------------------------------
    // Indexed directory management
    // -------------------------------------------------------------------------
    listDirectories: (): Promise<Array<{
        id: string
        path: string
        addedAt: number
        isIndexed: boolean
        lastIndexedAt?: number
    }>> => {
        return typedInvokeUnwrap(WorkspaceChannels.list)
    },
    addDirectory: (dirPath: string): Promise<{
        id: string
        path: string
        addedAt: number
        isIndexed: boolean
        lastIndexedAt?: number
    }> => {
        return typedInvokeUnwrap(WorkspaceChannels.add, dirPath)
    },
    addDirectories: (dirPaths: string[]): Promise<{
        added: Array<{
            id: string
            path: string
            addedAt: number
            isIndexed: boolean
            lastIndexedAt?: number
        }>
        errors: Array<{ path: string; error: string }>
    }> => {
        return typedInvokeUnwrap(WorkspaceChannels.addMany, dirPaths)
    },
    removeDirectory: (id: string): Promise<boolean> => {
        return typedInvokeUnwrap(WorkspaceChannels.remove, id)
    },
    validateDirectory: (dirPath: string): Promise<{ valid: boolean; error?: string }> => {
        return typedInvokeUnwrap(WorkspaceChannels.validate, dirPath)
    },
    markDirectoryIndexed: (id: string, isIndexed: boolean): Promise<boolean> => {
        return typedInvokeUnwrap(WorkspaceChannels.markIndexed, id, isIndexed)
    },
    onDirectoriesChanged: (callback: (directories: Array<{
        id: string
        path: string
        addedAt: number
        isIndexed: boolean
        lastIndexedAt?: number
    }>) => void): (() => void) => {
        return typedOn(WorkspaceChannels.directoriesChanged, callback)
    },
    // -------------------------------------------------------------------------
    // Output file management (posts and writings)
    // -------------------------------------------------------------------------
    saveOutput: (input: {
        type: string
        blocks: Array<{
            name: string
            content: string
            createdAt: string
            updatedAt: string
        }>
        metadata?: Record<string, unknown>
    }): Promise<{ id: string; path: string; savedAt: number }> => {
        return typedInvokeUnwrap(WorkspaceChannels.outputSave, input)
    },
    loadOutputs: () => {
        return typedInvokeUnwrap(WorkspaceChannels.outputLoadAll)
    },
    loadOutputsByType: (type: string) => {
        return typedInvokeUnwrap(WorkspaceChannels.loadByType, type)
    },
    loadOutput: (params: { type: string; id: string }) => {
        return typedInvokeUnwrap(WorkspaceChannels.outputLoadOne, params)
    },
    updateOutput: (params: {
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
        return typedInvokeUnwrap(WorkspaceChannels.update, params)
    },
    deleteOutput: (params: { type: string; id: string }): Promise<void> => {
        return typedInvokeUnwrap(WorkspaceChannels.outputDelete, params)
    },
    onOutputFileChange: (callback: (event: {
        type: 'added' | 'changed' | 'removed'
        outputType: string
        fileId: string
        filePath: string
        timestamp: number
    }) => void): (() => void) => {
        return typedOn(WorkspaceChannels.outputFileChanged, callback)
    },
    onOutputWatcherError: (callback: (error: { error: string; timestamp: number }) => void): (() => void) => {
        return typedOn(WorkspaceChannels.outputWatcherError, callback)
    },
    // -------------------------------------------------------------------------
    // Personality/conversation file management
    // -------------------------------------------------------------------------
    savePersonality: (input: {
        sectionId: string
        content: string
        metadata?: Record<string, unknown>
    }): Promise<{
        id: string
        path: string
        savedAt: number
    }> => {
        return typedInvokeUnwrap(WorkspaceChannels.save, input)
    },
    loadPersonalities: () => {
        return typedInvokeUnwrap(WorkspaceChannels.personalityLoadAll)
    },
    loadPersonality: (params: {
        sectionId: string
        id: string
    }) => {
        return typedInvokeUnwrap(WorkspaceChannels.loadOne, params)
    },
    deletePersonality: (params: {
        sectionId: string
        id: string
    }): Promise<void> => {
        return typedInvokeUnwrap(WorkspaceChannels.delete, params)
    },
    onPersonalityFileChange: (callback: (event: {
        type: 'added' | 'changed' | 'removed'
        sectionId: string
        fileId: string
        filePath: string
        timestamp: number
    }) => void): (() => void) => {
        return typedOn(WorkspaceChannels.personalityFileChanged, callback)
    },
    onPersonalityWatcherError: (callback: (error: { error: string; timestamp: number }) => void): (() => void) => {
        return typedOn(WorkspaceChannels.personalityWatcherError, callback)
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
        return typedInvokeUnwrap(WorkspaceChannels.loadSectionConfig, params)
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
        return typedInvokeUnwrap(WorkspaceChannels.saveSectionConfig, params)
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
        return typedOn(WorkspaceChannels.sectionConfigChanged, callback)
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
        contextBridge.exposeInMainWorld('workspace', workspace)
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
    globalThis.workspace = workspace
    // @ts-ignore (define in dts)
    globalThis.task = task
    // @ts-ignore (define in dts)
    globalThis.agent = agent
}
