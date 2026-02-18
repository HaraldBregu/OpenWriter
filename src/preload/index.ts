import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
    playSound: (): void => {
        ipcRenderer.send('play-sound')
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
    // Update
    updateGetState: (): Promise<{
        status: string
        updateInfo: { version: string; releaseNotes?: string } | null
        error: string | null
    }> => {
        return ipcRenderer.invoke('update-get-state')
    },
    updateGetVersion: (): Promise<string> => {
        return ipcRenderer.invoke('update-get-version')
    },
    updateCheck: (): Promise<void> => {
        return ipcRenderer.invoke('update-check')
    },
    updateInstall: (): Promise<void> => {
        return ipcRenderer.invoke('update-install')
    },
    onUpdateStateChange: (callback: (state: {
        status: string
        updateInfo: { version: string; releaseNotes?: string } | null
        error: string | null
    }) => void): (() => void) => {
        const handler = (_event: Electron.IpcRendererEvent, state: {
            status: string
            updateInfo: { version: string; releaseNotes?: string } | null
            error: string | null
        }): void => {
            callback(state)
        }
        ipcRenderer.on('update-state-changed', handler)
        return () => {
            ipcRenderer.removeListener('update-state-changed', handler)
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
        return ipcRenderer.invoke('dialog-open')
    },
    dialogSave: (): Promise<{
        type: string
        timestamp: number
        data: Record<string, unknown>
    }> => {
        return ipcRenderer.invoke('dialog-save')
    },
    dialogMessage: (message: string, detail: string, buttons: string[]): Promise<{
        type: string
        timestamp: number
        data: Record<string, unknown>
    }> => {
        return ipcRenderer.invoke('dialog-message', message, detail, buttons)
    },
    dialogError: (title: string, content: string): Promise<{
        type: string
        timestamp: number
        data: Record<string, unknown>
    }> => {
        return ipcRenderer.invoke('dialog-error', title, content)
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
        return ipcRenderer.invoke('store-get-all-model-settings')
    },
    storeGetModelSettings: (providerId: string): Promise<{ selectedModel: string; apiToken: string } | null> => {
        return ipcRenderer.invoke('store-get-model-settings', providerId)
    },
    storeSetSelectedModel: (providerId: string, modelId: string): Promise<void> => {
        return ipcRenderer.invoke('store-set-selected-model', providerId, modelId)
    },
    storeSetApiToken: (providerId: string, token: string): Promise<void> => {
        return ipcRenderer.invoke('store-set-api-token', providerId, token)
    },
    storeSetModelSettings: (providerId: string, settings: { selectedModel: string; apiToken: string }): Promise<void> => {
        return ipcRenderer.invoke('store-set-model-settings', providerId, settings)
    },
    // Update Simulator
    updateSimCheck: (): Promise<void> => {
        return ipcRenderer.invoke('update-sim-check')
    },
    updateSimDownload: (): Promise<void> => {
        return ipcRenderer.invoke('update-sim-download')
    },
    updateSimInstall: (): Promise<void> => {
        return ipcRenderer.invoke('update-sim-install')
    },
    updateSimCancel: (): Promise<void> => {
        return ipcRenderer.invoke('update-sim-cancel')
    },
    updateSimReset: (): Promise<void> => {
        return ipcRenderer.invoke('update-sim-reset')
    },
    updateSimGetState: (): Promise<{
        status: string
        updateInfo: {
            version: string
            releaseDate: string
            releaseNotes: string
            downloadSize: number
        } | null
        progress: {
            percent: number
            transferred: number
            total: number
            bytesPerSecond: number
        } | null
        error: string | null
    }> => {
        return ipcRenderer.invoke('update-sim-get-state')
    },
    onUpdateSimStateChange: (callback: (state: {
        status: string
        updateInfo: {
            version: string
            releaseDate: string
            releaseNotes: string
            downloadSize: number
        } | null
        progress: {
            percent: number
            transferred: number
            total: number
            bytesPerSecond: number
        } | null
        error: string | null
    }) => void): (() => void) => {
        const handler = (_event: Electron.IpcRendererEvent, state: {
            status: string
            updateInfo: {
                version: string
                releaseDate: string
                releaseNotes: string
                downloadSize: number
            } | null
            progress: {
                percent: number
                transferred: number
                total: number
                bytesPerSecond: number
            } | null
            error: string | null
        }): void => {
            callback(state)
        }
        ipcRenderer.on('update-sim-state-changed', handler)
        return () => {
            ipcRenderer.removeListener('update-sim-state-changed', handler)
        }
    },
    onUpdateSimProgress: (callback: (progress: {
        percent: number
        transferred: number
        total: number
        bytesPerSecond: number
    }) => void): (() => void) => {
        const handler = (_event: Electron.IpcRendererEvent, progress: {
            percent: number
            transferred: number
            total: number
            bytesPerSecond: number
        }): void => {
            callback(progress)
        }
        ipcRenderer.on('update-sim-progress', handler)
        return () => {
            ipcRenderer.removeListener('update-sim-progress', handler)
        }
    },
    // Agent
    agentRun: (messages: Array<{role: 'user' | 'assistant'; content: string}>, runId: string, providerId: string): Promise<void> => {
        return ipcRenderer.invoke('agent:run', messages, runId, providerId)
    },
    agentCancel: (runId: string): void => {
        ipcRenderer.send('agent:cancel', runId)
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