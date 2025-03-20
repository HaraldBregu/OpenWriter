import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  /*
       sendLog: (entry: unknown) => {
        ipcRenderer.send('log-entry', entry)
    },
    sendData: (data: DocumentContentParsed) => {
        ipcRenderer.send('currentDocumentUpdate', data);
    },
    subscribeAlertMessage: (callback: (message: any) => void) => {
        const listener = (_: any, message: Alert) => callback(message);
        ipcRenderer.on('alert', listener);
        return () => ipcRenderer.removeListener('alert', listener);
    },
    getOpenedDocumentContent: (callback: (content: any) => void) => {
        const listener = (_: any, content: DocumentContent) => callback(content);
        ipcRenderer.on('opened-doc', listener);
        return () => ipcRenderer.removeListener('opened-doc', listener);
    },
    startNewDocument: (callback: (content: any) => void) => {
        const listener = (_: any, content: DocumentContent) => callback(content);
        ipcRenderer.on('new-doc', listener);
        return () => ipcRenderer.removeListener('new-doc', listener);
    },
    setElectronLanguage: (lang: string) => {
        ipcRenderer.send("set-electron-language", lang)
    },
    onLanguageChanged: (callback: (content: any) => void) => {
        const listener = (_: any, lang: string) => callback(lang);
        ipcRenderer.on('language-changed', listener);
        return () => ipcRenderer.removeListener('language-changed', listener);
    },
    onCapitalizationChange: (callback: (type: string) => void) => {
        const listener = (_: any, type: string) => callback(type);
        ipcRenderer.on("change-capitalization", listener);
        return () => ipcRenderer.removeListener("change-capitalization", listener);
    },
    onCharacterSpacingChange: (callback: (type: string) => void) => {
        const listener = (_: any, type: string) => callback(type);
        ipcRenderer.on("change-character-spacing", listener);
        return () => ipcRenderer.removeListener("change-character-spacing", listener);
    },
    onCharacterStyleChange: (callback: (type: string) => void) => {
        const listener = (_: any, type: string) => callback(type);
        ipcRenderer.on("change-character-style", listener);
        return () => ipcRenderer.removeListener("change-character-style", listener);
    },
    onListStyleChange: (callback: (type: string) => void) => {
        const listener = (_: any, type: string) => callback(type);
        ipcRenderer.on("change-list-style", listener);
        return () => ipcRenderer.removeListener("change-list-style", listener);
    },
    onTextAlignmentChange: (callback: (type: string) => void) => {
        const listener = (_: any, type: string) => callback(type);
        ipcRenderer.on("change-text-alignment-style", listener);
        return () => ipcRenderer.removeListener("change-text-alignment-style", listener);
    },
    onIndentLevelChange: (callback: (increase: boolean) => void) => {
        const listener = (_: any, increase: boolean) => callback(increase);
        ipcRenderer.on("change-indent-level", listener);
        return () => ipcRenderer.removeListener("change-indent-level", listener);
    },
    onShowSpacingSettings: (callback: () => void) => {
        const listener = (_: any) => callback();
        ipcRenderer.on("show-spacing-settings", listener);
        return () => ipcRenderer.removeListener("show-spacing-settings", listener);
    },
    onSetSpacing: (callback: (space: string) => void) => {
        const listener = (_: any, space: string) => callback(space);
        ipcRenderer.on("set-spacing-level", listener);
        return () => ipcRenderer.removeListener("set-spacing-level", listener);
    },
    getSystemFonts: (callback) => {
        const listener = (_: any, fonts: string[]) => callback(fonts)
        ipcRenderer.send('request-system-fonts');
        ipcRenderer.on('receive-system-fonts', listener);
        return () => ipcRenderer.removeListener('receive-system-fonts', listener);
    },
    onUndoChange: (callback: () => void) => {
        const listener = (_: any) => callback();
        ipcRenderer.on("trigger-undo", listener);
        return () => ipcRenderer.removeListener("trigger-undo", listener);
    },
    onRedoChange: (callback: () => void) => {
        const listener = (_: any) => callback();
        ipcRenderer.on("trigger-redo", listener);
        return () => ipcRenderer.removeListener("trigger-redo", listener);
    },
    updateUndoRedoState: (canUndo: boolean, canRedo: boolean) => {
        ipcRenderer.send('update-undo-redo-state', { canUndo, canRedo });
    },
    onLigatureChange: (callback: (type: string) => void) => {
        const listener = (_: any, type: string) => callback(type);
        ipcRenderer.on("set-font-ligature", listener);
        return () => ipcRenderer.removeListener("set-font-ligature", listener);
    },
    onInsertComment: (callback: () => void) => {
        const listener = (_: any) => callback();
        ipcRenderer.on("insert-comment", listener);
        return () => ipcRenderer.removeListener("insert-comment", listener);
    }
      */
}

const store = {
  // @ts-ignore (define in dts)
  get: (_: string) => {},
  set: (_: string, __: any) => {}
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('store', store)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
  // @ts-ignore (define in dts)
  window.store = store
}
