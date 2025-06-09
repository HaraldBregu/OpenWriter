
import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
    store: unknown
    tabs: ITabsAPI
    menu: IMenuAPI
    system: ISystemAPI,
    application: IApplicationAPI,
    doc: IDocumentAPI
  }
}

interface ITabsAPI {
  new: (fileType: FileType) => Promise<number>
  close: (id: number) => Promise<void>
  select: (id: number, tabType: TabType) => Promise<void>
  reorder: (tabIds: number[]) => Promise<void>
  getAllContentViewsIds: () => Promise<number[]>
  getSelectedTabId: () => Promise<number>
}

interface IMenuAPI {
  disableReferencesMenuItems: (items: string[]) => Promise<void>
  updateViewApparatusesMenuItems: (items: { id: string, title: string, visible: boolean }[]) => Promise<void>
}

interface IDocumentAPI {
  openDocument: () => Promise<void>
  getTemplates: () => Promise<string[]>
  importTemplate: () => Promise<void>
  createTemplate: (template: unknown, name: string) => Promise<void>
  getApparatuses: () => Promise<unknown[]>
  setApparatuses: (apparatuses: unknown[]) => Promise<void>
  setLayoutTemplate: (layoutTemplate: unknown) => Promise<void>
  setPageSetup: (pageSetup: unknown) => Promise<void>
  setSort: (sort: unknown[]) => Promise<void>
  setStyles: (style: unknown[]) => Promise<void>
  setParatextual: (paratextual: unknown) => Promise<void>
}

interface ISystemAPI {
  getUserInfo: () => Promise<void>
}

interface IApplicationAPI {
  toolbarIsVisible: () => Promise<boolean>
  toolbarAdditionalItems: () => Promise<string[]>
}

