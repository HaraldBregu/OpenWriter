import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Minimal preload for simplified app
if (process.contextIsolated) {
    try {
        contextBridge.exposeInMainWorld('electron', electronAPI)
    } catch (error) {
        console.error(error)
    }
} else {
    // @ts-ignore (define in dts)
    globalThis.electron = electronAPI
}