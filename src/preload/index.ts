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