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