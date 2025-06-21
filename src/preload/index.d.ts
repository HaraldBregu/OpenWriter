import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron?: ElectronAPI
    api?: unknown
    store?: unknown
    tabs?: ITabsAPI
    menu?: IMenuAPI
    system?: ISystemAPI
    application?: IApplicationAPI
    doc?: IDocumentAPI
    theme?: IThemeAPI
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
  updateViewApparatusesMenuItems: (
    items: { id: string; title: string; visible: boolean }[]
  ) => Promise<void>
  setTocVisibility: (visibility: boolean) => Promise<void>
  setTocMenuItemsEnabled: (isEnable: boolean) => Promise<void>
}

interface IDocumentAPI {
  openDocument: () => Promise<void>
  getTemplates: () => Promise<string[]>
  importTemplate: () => Promise<void>
  createTemplate: (template: unknown, name: string) => Promise<void>
  getApparatuses: () => Promise<DocumentApparatus[]>
  setApparatuses: (apparatuses: DocumentApparatus[]) => Promise<void>
  setLayoutTemplate: (layoutTemplate: unknown) => Promise<void>
  setPageSetup: (pageSetup: unknown) => Promise<void>
  setSort: (sort: unknown[]) => Promise<void>
  setStyles: (style: unknown[]) => Promise<void>
  setParatextual: (paratextual: unknown) => Promise<void>
  getStylesNames: () => Promise<string[]>
  getStyle: (filename: string) => Promise<string>
  createStyle: (style: unknown) => Promise<void>
  importStyle: () => Promise<string>
  exportSiglumList: (siglumList: Siglum[]) => Promise<void>
  importSiglumList: () => Promise<DocumentSiglum[]>
}

interface ISystemAPI {
  getUserInfo: () => Promise<UserInfo>
  getFonts: () => Promise<string[]>
  getSubsets: () => Promise<Subset[]>
  getSymbols: (fontName: string) => Promise<CharacterSet>
  getConfiguredSpcialCharactersList: () => Promise<CharacterConfiguration[]>
  showMessageBox: (message: string) => Promise<void>
}

interface IApplicationAPI {
  toolbarIsVisible: () => Promise<boolean>
  toolbarAdditionalItems: () => Promise<string[]>
  closeChildWindow: () => Promise<void>
}

interface IThemeAPI {
  setTheme: (theme: 'light' | 'dark' | 'system') => Promise<void>
  getTheme: () => Promise<'light' | 'dark' | 'system'>
}
