import { BaseWindow, shell, WebContentsView } from 'electron'
import { join } from 'path'
import { getRootUrl } from './shared/util'
import { getTabs, setTabs } from './store';

const toolbarHeight = 32
const toolbar: Route = "/browser-tab-bar";

let toolbarWebContentsView: WebContentsView | null = null

export const getToolbarWebContentsViewHeight = (): number => toolbarHeight
export const getToolbarWebContentsView = (): WebContentsView | null => toolbarWebContentsView

export function createToolbarWebContentsView(baseWindow: BaseWindow | null): Promise<WebContentsView | null> {
  return new Promise((resolve) => {

    if (toolbarWebContentsView !== null)
      return resolve(toolbarWebContentsView)

    if (baseWindow === null)
      return resolve(null)

    toolbarWebContentsView = new WebContentsView({
      webPreferences: {
        preload: join(__dirname, '../preload/index.mjs'),
        sandbox: false,
        nodeIntegration: false,
        contextIsolation: true,
      }
    })

    toolbarWebContentsView.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url)
      return { action: 'deny' }
    })

    const bounds = baseWindow.getBounds()

    toolbarWebContentsView.setBounds({
      x: 0,
      y: 0,
      width: bounds.width,
      height: toolbarHeight
    })

    baseWindow.on('resize', () => {
      const newBounds = baseWindow.getBounds()

      if (toolbarWebContentsView === null)
        return

      toolbarWebContentsView.setBounds({
        x: 0,
        y: 0,
        width: newBounds.width,
        height: toolbarHeight
      })
    })

    const url = getRootUrl() + toolbar
    toolbarWebContentsView.webContents.loadURL(url)

    toolbarWebContentsView.webContents.on('did-finish-load', () => {
      return resolve(toolbarWebContentsView)
    })

    toolbarWebContentsView.webContents.on('did-fail-load', () => {
      return resolve(null)
    })
  })
}

export function resizeToolbarWebContentsView(baseWindow: BaseWindow): void {
  const newBounds = baseWindow.getBounds()

  if (toolbarWebContentsView === null)
    return

  toolbarWebContentsView.setBounds({
    x: 0,
    y: 0,
    width: newBounds.width,
    height: toolbarHeight
  })
}

export function setSelectedTabIndex(index: number): void {
  const tabs = getTabs()

  tabs?.forEach((tab, i) => {
    tab.selected = (i === index)
  })

  setTabs(tabs)
}

export function getSelectedTab(): Tab | null {
  return getTabs()?.find((tab) => tab.selected) ?? null
}

export function getSelectedTabIndex(): number {
  const tabs = getTabs()

  if (!tabs)
    return -1

  const selectedTabIndex = tabs.findIndex((tab) => tab.selected)

  if (selectedTabIndex === -1)
    return -1

  return selectedTabIndex;
}

export function setFilePathForSelectedTab(path: string): void {
  const tabs = getTabs()
  if (!tabs) return

  const selectedTabIndex = getSelectedTabIndex()
  tabs[selectedTabIndex].filePath = path

  setTabs(tabs)
}