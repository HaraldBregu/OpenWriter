import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { ipcRenderer } from 'electron'
import { IApplicationAPI, IDocumentAPI, IMenuAPI, ISystemAPI } from './index.d'

const tabsAPI = {
    new: (fileType: FileType): Promise<number> => ipcRenderer.invoke('tabs:new', fileType),
    close: (id: number): Promise<void> => ipcRenderer.invoke('tabs:close', id),
    select: (id: number, fileType: TabType): Promise<void> => ipcRenderer.invoke('tabs:select', id, fileType),
    reorder: (tabIds: number[]): Promise<void> => ipcRenderer.invoke('tabs:reorder', tabIds),
    getAllContentViewsIds: (): Promise<number[]> => ipcRenderer.invoke('tabs:getAllContentViewsIds'),
    getSelectedTabId: (): Promise<number> => ipcRenderer.invoke('tabs:getSelectedTabId'),
}

const menuAPI: IMenuAPI = {
    disableReferencesMenuItems: (items: string[]): Promise<void> => ipcRenderer.invoke('menu:disableReferencesMenuItems', items),
    updateViewApparatusesMenuItems: (items: { id: string, title: string, visible: boolean }[]): Promise<void> => ipcRenderer.invoke('menu:updateViewApparatusesMenuItems', items),
}

const api = {}

const store = {}

const systemAPI: ISystemAPI = {
    getUserInfo: (): Promise<void> => ipcRenderer.invoke('system:getUserInfo'),
}

const applicationAPI: IApplicationAPI = {
    toolbarIsVisible: (): Promise<boolean> => ipcRenderer.invoke('application:toolbarIsVisible'),
    toolbarAdditionalItems: (): Promise<string[]> => ipcRenderer.invoke('application:toolbarAdditionalItems'),
}

const documentAPI: IDocumentAPI = {
    openDocument: (): Promise<void> => ipcRenderer.invoke('document:openDocument'),
    getTemplates: (): Promise<string[]> => ipcRenderer.invoke('document:getTemplates'),
    importTemplate: (): Promise<void> => ipcRenderer.invoke('document:importTemplate'),
    createTemplate: (template: unknown, name: string): Promise<void> => ipcRenderer.invoke('document:createTemplate', template, name),
    getApparatuses: (): Promise<unknown[]> => ipcRenderer.invoke('document:getApparatuses'),
    setApparatuses: (apparatuses: unknown[]): Promise<void> => ipcRenderer.invoke('document:setApparatuses', apparatuses),
    setLayoutTemplate: (layoutTemplate: unknown): Promise<void> => ipcRenderer.invoke('document:setLayoutTemplate', layoutTemplate),
    setPageSetup: (pageSetup: unknown): Promise<void> => ipcRenderer.invoke('document:setPageSetup', pageSetup),
    setSort: (sort: unknown[]): Promise<void> => ipcRenderer.invoke('document:setSort', sort),
    setStyles: (style: unknown[]): Promise<void> => ipcRenderer.invoke('document:setStyles', style),
    setParatextual: (paratextual: unknown): Promise<void> => ipcRenderer.invoke('document:setParatextual', paratextual)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
    try {
        contextBridge.exposeInMainWorld('electron', electronAPI)
        contextBridge.exposeInMainWorld('api', api)
        contextBridge.exposeInMainWorld('store', store)
        contextBridge.exposeInMainWorld('tabs', tabsAPI)
        contextBridge.exposeInMainWorld('menu', menuAPI)
        contextBridge.exposeInMainWorld('system', systemAPI)
        contextBridge.exposeInMainWorld('application', applicationAPI)
        contextBridge.exposeInMainWorld('doc', documentAPI)
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
    // @ts-ignore (define in dts)
    window.tabs = tabsAPI
    // @ts-ignore (define in dts)
    window.system = systemAPI
    // @ts-ignore (define in dts)
    window.application = applicationAPI
    // @ts-ignore (define in dts)
    window.doc = documentAPI
    // @ts-ignore (define in dts)
    window.menu = menuAPI
}
