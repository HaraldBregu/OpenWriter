import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { ipcRenderer } from 'electron'
import { IApplicationAPI, IDocumentAPI, IMenuAPI, ISystemAPI, IThemeAPI } from './index.d'

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
    setTocVisibility: (visibility: boolean): Promise<void> => ipcRenderer.invoke('menu:setTocVisibility', visibility),
    setTocMenuItemsEnabled: (isEnable: boolean): Promise<void> => ipcRenderer.invoke('menu:setTocMenuItemsEnabled', isEnable),
}

const api = {}

const store = {}

const systemAPI: ISystemAPI = {
    getUserInfo: (): Promise<void> => ipcRenderer.invoke('system:getUserInfo'),
    getFonts: (): Promise<string[]> => ipcRenderer.invoke('system:getFonts'),
    getSubsets: (): Promise<Subset[]> => ipcRenderer.invoke('system:getSubsets'),
    getSymbols: (fontName: string): Promise<CharacterSet> => ipcRenderer.invoke('system:getSymbols', fontName),
    getConfiguredSpcialCharactersList: (): Promise<CharacterConfiguration[]> => ipcRenderer.invoke('system:getConfiguredSpcialCharactersList'),
    showMessageBox: (message: string): Promise<void> => ipcRenderer.invoke('system:showMessageBox', message)
}

const applicationAPI: IApplicationAPI = {
    toolbarIsVisible: (): Promise<boolean> => ipcRenderer.invoke('application:toolbarIsVisible'),
    toolbarAdditionalItems: (): Promise<string[]> => ipcRenderer.invoke('application:toolbarAdditionalItems'),
    closeChildWindow: (): Promise<void> => ipcRenderer.invoke('application:closeChildWindow'),
}

const documentAPI: IDocumentAPI = {
    openDocument: (): Promise<void> => ipcRenderer.invoke('document:openDocument'),
    getTemplates: (): Promise<string[]> => ipcRenderer.invoke('document:getTemplates'),
    importTemplate: (): Promise<void> => ipcRenderer.invoke('document:importTemplate'),
    createTemplate: (template: unknown, name: string): Promise<void> => ipcRenderer.invoke('document:createTemplate', template, name),
    getApparatuses: (): Promise<DocumentApparatus[]> => ipcRenderer.invoke('document:getApparatuses'),
    setApparatuses: (apparatuses: DocumentApparatus[]): Promise<void> => ipcRenderer.invoke('document:setApparatuses', apparatuses),
    setLayoutTemplate: (layoutTemplate: unknown): Promise<void> => ipcRenderer.invoke('document:setLayoutTemplate', layoutTemplate),
    setPageSetup: (pageSetup: unknown): Promise<void> => ipcRenderer.invoke('document:setPageSetup', pageSetup),
    setSort: (sort: unknown[]): Promise<void> => ipcRenderer.invoke('document:setSort', sort),
    setStyles: (style: unknown[]): Promise<void> => ipcRenderer.invoke('document:setStyles', style),
    setParatextual: (paratextual: unknown): Promise<void> => ipcRenderer.invoke('document:setParatextual', paratextual),
    getStylesNames: (): Promise<string[]> => ipcRenderer.invoke("document:getStylesNames"),
    getStyle: (filename: string): Promise<string> => ipcRenderer.invoke("document:getStyle", filename),
    createStyle: (style: unknown): Promise<void> => ipcRenderer.invoke('document:createStyle', style, name),
    importStyle: (): Promise<string> => ipcRenderer.invoke('document:importStyle'),
    exportSiglumList: (siglumList: Siglum[]): Promise<void> => ipcRenderer.invoke('document:exportSiglumList', siglumList),
    importSiglumList: (): Promise<DocumentSiglum[]> => ipcRenderer.invoke('document:importSiglumList')
}

const themeAPI: IThemeAPI = {
    setTheme: (theme: 'light' | 'dark' | 'system'): Promise<void> => ipcRenderer.invoke('theme:setTheme', theme),
    getTheme: (): Promise<'light' | 'dark' | 'system'> => ipcRenderer.invoke('theme:getTheme')
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
        contextBridge.exposeInMainWorld('theme', themeAPI)
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
    // @ts-ignore (define in dts)
    window.theme = themeAPI
}
