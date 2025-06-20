import { shell, WebContentsView } from 'electron'
import { join } from 'path'
import { getBaseWindow } from './main-window'
import { getRootUrl } from './shared/util'
import { Route } from './shared/constants'
import {
  getSelectedTabIndex,
  getToolbarWebContentsViewHeight,
  resizeToolbarWebContentsView,
  setSelectedTabIndex,
} from './toolbar'
import { getTabs, setTabs } from './store'
import { UpdateTabsCallback } from './shared/types'

const webContentViews: WebContentsView[] = []
let currentWebContentsView: WebContentsView | null = null

export const getWebContentsView = (id: number): WebContentsView | undefined => webContentViews.find((tab) => tab.webContents.id === id)
export const getWebContentsViews = (): WebContentsView[] => webContentViews
export const getWebContentsViewsIds = (): number[] => webContentViews.map((tab) => tab.webContents.id)
export const getSelectedWebContentsView = (): WebContentsView | null => currentWebContentsView
export const getSelectedWebContentsViewId = (): number => currentWebContentsView?.webContents.id ?? -1

export function createWebContentsView(route: WebContentsRoute): Promise<WebContentsView | null> {
  return new Promise((resolve) => {
    const url = getRootUrl() + route
    // const startTime = performance.now();

    const webContentsView = new WebContentsView({
      webPreferences: {
        preload: join(__dirname, '../preload/index.mjs'),
        sandbox: false,
        nodeIntegration: false,
        contextIsolation: true,
      }
    })

    // webContentsView.webContents.on('did-start-loading', () => {
    //   showWebContentsView(webContentsView);
    //   updateTabs(webContentViews);
    //   resolve(webContentsView)
    // });

    // webContentsView.webContents.on('dom-ready', () => {
    //   showWebContentsView(webContentsView)
    //   updateTabs(webContentViews)
    //   resolve(webContentsView)
    // })

    webContentsView.webContents.on('did-finish-load', () => {
      showWebContentsView(webContentsView)
      updateTabs(webContentViews)
      resolve(webContentsView)
      // const endTime = performance.now();
      // console.log(`loading content view took ${endTime - startTime} milliseconds`);
    })

    webContentsView.webContents.on('did-fail-load', () => {
      resolve(webContentsView)
    })

    webContentsView.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url)
      return { action: 'deny' }
    })

    webContentViews.push(webContentsView)
    webContentsView.webContents.loadURL(url)

    return webContentsView.webContents.id
  })
}

export function showWebContentsView(webContentsView: WebContentsView): void {
  const baseWindow = getBaseWindow()
  if (!baseWindow)
    return

  const setWebContentBounds = (): void => {
    const [width, height] = baseWindow.getContentSize()
    webContentsView.setBounds({
      x: 0,
      y: getToolbarWebContentsViewHeight(),
      width,
      height: height - getToolbarWebContentsViewHeight()
    })
  }

  setWebContentBounds()

  baseWindow.removeAllListeners('resize')

  baseWindow.on('resize', () => {
    setWebContentBounds()
    resizeToolbarWebContentsView(baseWindow)
  })

  currentWebContentsView = webContentsView
  baseWindow.contentView.addChildView(webContentsView)
}

export function closeWebContentsViewWithId(id: number): Tab[] {
  const idx = webContentViews.findIndex((tab) => tab.webContents.id === id)
  const baseWindow = getBaseWindow()
  if (idx === -1 || !baseWindow)
    return []

  const webContentsViews = getWebContentsViews();

  let indexToSelect = 0;

  if (webContentsViews.length > 1) {
    const isLastTab = idx === webContentsViews.length - 1;
    const isNotFirstTab = idx > 0;

    if (isLastTab && isNotFirstTab) {
      indexToSelect = idx - 1;
    } else if (!isLastTab) {
      indexToSelect = idx + 1;
    }
  }

  setSelectedWebContentsViewWithId(webContentsViews[indexToSelect].webContents.id)
  baseWindow.contentView.removeChildView(webContentViews[idx])
  webContentViews[idx].webContents.close()
  webContentViews.splice(idx, 1)
  updateTabs(webContentViews)

  const tabs = getTabs()
  return tabs
}

export function closeAllTabs({ save = true }: { save?: boolean } = {}): void {
  if (save) {
    updateTabs(webContentViews)
  }

  for (const tab of webContentViews) {
    tab.webContents.close()
  }

  webContentViews.splice(0, webContentViews.length)
  if (!save) {
    updateTabs(webContentViews)
  }
}

export function selectedWebContentsViewSend(message: string, ...args: unknown[]): void {
  currentWebContentsView?.webContents.send(message, ...args)
}

export function setSelectedWebContentsViewWithId(id: number): void {
  if (currentWebContentsView?.webContents.id === id)
    return

  const idx = webContentViews.findIndex((tab) => tab.webContents.id === id)
  if (idx === -1)
    return

  const webContentsView = webContentViews[idx]

  showWebContentsView(webContentsView)
  saveSelectedTab({ tabIndex: idx })
}

export function reorderTabs(ids: number[]): void {
  const newTabs = ids
    .map((id) => webContentViews.find((tab) => tab.webContents.id === id))
    .filter((tab): tab is WebContentsView => tab !== undefined)

  if (newTabs.length === 0)
    return

  webContentViews.splice(0, webContentViews.length, ...newTabs)

  updateTabs(webContentViews)
  saveSelectedTab()
}

/**
 * @deprecated Use createWebContentsView() instead
 */
export async function restoreWebContentsViews({ restore = true }: { restore?: boolean } = {}): Promise<WebContentsView | null> {
  if (!restore) {
    return createWebContentsView(Route.root)
  }

  const lastSessionTabs = getTabs()

  let selectedTabIndex = getSelectedTabIndex()

  if (lastSessionTabs !== null && lastSessionTabs.length > 0) {
    if (selectedTabIndex < 0 || selectedTabIndex >= lastSessionTabs.length) {
      selectedTabIndex = 0
    }

    for (let i = 0; i < lastSessionTabs.length; i++) {
      if (i === selectedTabIndex) {
        currentWebContentsView = await createWebContentsView(lastSessionTabs[i].route)
        continue
      }
      createWebContentsView(lastSessionTabs[i].route)
    }
  }

  if (currentWebContentsView === null) {
    currentWebContentsView = await createWebContentsView(Route.root)
  }

  return currentWebContentsView
}

// UTILS

export function hideWebContentsViewWithId(id: number): void {
  const webContentView = webContentViews.find((tab) => tab.webContents.id === id)
  if (!webContentView) return
  const baseWindow = getBaseWindow()
  baseWindow?.contentView.removeChildView(webContentView)
}

const updateTabs = (webContentViews: WebContentsView[], onUpdate?: UpdateTabsCallback): void => {
  const webContentViewsData = webContentViews
    .map((webContentView) => {
      const url = webContentView.webContents.getURL()
      const idx = url.indexOf('#')
      const path = idx === -1 ? '/' : url.substring(idx + 1)

      const data = {
        id: webContentView.webContents.id,
        path: path,
      } as const satisfies Record<string, number | WebContentsRoute>

      return data
    })

  const currentTabs = getTabs()

  const newTabs = webContentViewsData
    .map((webContentView, index) => {
      const currentTab = currentTabs?.find((tab) => tab.id === webContentView.id)

      const tab = {
        id: webContentView.id,
        route: webContentView.path,
        selected: index === webContentViewsData.length - 1,
        filePath: currentTab?.filePath,
      } as Tab

      return tab
    })

  setTabs(newTabs)
  onUpdate?.(newTabs)
}

function saveSelectedTab({ tabIndex = -1 }: { tabIndex?: number } = {}): void {
  if (tabIndex !== -1) {
    setSelectedTabIndex(tabIndex)
    return
  }

  if (!currentWebContentsView)
    return

  const idx = webContentViews.findIndex((tab) => {
    if (currentWebContentsView === null)
      return false

    return tab.webContents.id === currentWebContentsView!.webContents.id
  })

  if (idx === -1)
    return

  setSelectedTabIndex(idx)
}