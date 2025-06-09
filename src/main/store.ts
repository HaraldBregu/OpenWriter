import Store from 'electron-store'

const store = new Store({
    defaults: {
        toolbarIsVisible: true,
        toolbarAdditionalItems: [],
    },
});

export const setTabs = (tabs: Tab[]): void => store.set('tabs', tabs)

export const getTabs = (): Tab[] => store.get('tabs', []) as Tab[]

export const resetTabs = (): void => store.set('tabs', [])

export const storeLastFolderPath = (folderPath: string | null): void => store.set('lastFolderPath', folderPath)

export const readLastFolderPath = (): string | null => store.get('lastFolderPath', null) as string | null

export const storeRecentDocuments = (documents: string[]): void => store.set('recentDocuments', documents)

export const readRecentDocuments = (): string[] => store.get('recentDocuments', []) as string[];

export const storeToolbarIsVisible = (visible: boolean): void => store.set("toolbarIsVisible", visible)

export const readToolbarIsVisible = (): boolean => store.get("toolbarIsVisible", true) as boolean

export const readToolbarAdditionalItems = (): string[] => store.get("toolbarAdditionalItems", []) as string[]

export const storeToolbarAdditionalItems = (items: string[]): void => store.set("toolbarAdditionalItems", items)

export const storeAppLanguage = (language: string): void => store.set("appLanguage", language);

export const readAppLanguage = (): string => store.get("appLanguage", "en") as string