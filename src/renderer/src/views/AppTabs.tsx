import BrowserTabBar from "@/components/browser-tab-bar"
import { memo, useEffect, useMemo, useReducer } from "react"
import { useIpcRenderer } from "../hooks/use-ipc-renderer"
import { ThemeProvider } from "../providers/theme-provider"

type TabsState = {
  tabs: TabInfo[];
  selectedTab: TabInfo | null;
}

type TabsActions =
  | { type: 'ADD_TABS_WITH_IDS'; payload: number[] }
  | { type: 'ADD'; payload: { id: number, fileName: string, type: TabType } }
  | { type: 'SELECT'; payload: TabInfo }
  | { type: 'REMOVE'; payload: TabInfo }
  | { type: 'REMOVE_TAB_WITH_ID'; payload: number }
  | { type: 'REORDER'; payload: TabInfo[] }
  | { type: 'RENAME_SELECTED_TAB'; payload: string }
  | { type: 'SET_CURRENT_TAB_AS_CHANGED'; payload: boolean }

const reducer = (state: TabsState, action: TabsActions): TabsState => {
  switch (action.type) {
    case "ADD_TABS_WITH_IDS":
      const tabsIds = action.payload
      const newtabs = tabsIds.map((tab) => ({
        id: tab,
        name: "Untitled.critx",
        changed: false,
        type: 'critx' as const
      }))

      return {
        ...state,
        tabs: newtabs,
        selectedTab: newtabs[0]
      }
    case "ADD": {
      const { id, fileName, type } = action.payload
      const tabs = state.tabs.concat({
        id,
        name: fileName,
        changed: false,
        type
      })
      return {
        ...state,
        tabs: tabs,
        selectedTab: tabs[tabs.length - 1]
      }
    }
    case "SELECT": {
      const tab = action.payload
      return {
        ...state,
        selectedTab: tab
      }
    }
    case "REMOVE": {
      const tab = action.payload
      const tabs = state.tabs
      if (tabs.length > 0) {
        const index = tabs.findIndex((t) => t.id === tab.id)
        if (index !== -1)
          tabs.splice(index, 1)
      }

      return {
        ...state,
        tabs: tabs,
      }
    }
    case "REMOVE_TAB_WITH_ID": {
      const id = action.payload
      const tabs = state.tabs
      const index = tabs.findIndex((t) => t.id === id)
      if (index !== -1)
        tabs.splice(index, 1)

      let selectedTab: TabInfo | null = null
      if (tabs.length > 0)
        selectedTab = tabs[tabs.length - 1]

      return {
        ...state,
        tabs: tabs,
        selectedTab: selectedTab,
      }
    }
    case "REORDER": {
      const tabs = action.payload
      return {
        ...state,
        tabs: tabs,
      }
    }
    case "RENAME_SELECTED_TAB": {
      const filename = action.payload
      const tabs = state.tabs
      const selectedTab = state.selectedTab
      if (selectedTab) {
        selectedTab.name = filename
        selectedTab.changed = false
      }
      tabs.forEach((tab) => {
        if (tab.id === state.selectedTab?.id) {
          tab.name = filename
          tab.changed = false
        }
      })
      return {
        ...state,
        tabs: tabs,
        selectedTab: selectedTab,
      }
    }
    case "SET_CURRENT_TAB_AS_CHANGED": {
      const changed = action.payload
      const tabs = state.tabs
      const selectedTab = state.selectedTab
      if (selectedTab)
        selectedTab.changed = changed

      tabs.forEach((tab) => {
        if (tab.id === selectedTab?.id)
          tab.changed = changed
      })
      return {
        ...state,
        tabs: tabs,
        selectedTab: selectedTab,
      }
    }
  }
}

const initialState: TabsState = {
  tabs: [],
  selectedTab: null,
}

const actions: Record<string, (...args: any[]) => TabsActions> = {
  addTabsWithIds: (ids: number[]) => ({ type: 'ADD_TABS_WITH_IDS', payload: ids }),
  addTab: (id: number, fileName: string, type: TabType) => ({ type: 'ADD', payload: { id, fileName, type } }),
  selectTab: (tab: TabInfo) => ({ type: 'SELECT', payload: tab }),
  removeTab: (tab: TabInfo) => ({ type: 'REMOVE', payload: tab }),
  removeTabWithId: (id: number) => ({ type: 'REMOVE_TAB_WITH_ID', payload: id }),
  reorderTabs: (tabs: TabInfo[]) => ({ type: 'REORDER', payload: tabs }),
  renameSelectedTab: (filename: string) => ({ type: 'RENAME_SELECTED_TAB', payload: filename }),
  setCurrentTabAsChanged: (changed: boolean) => ({ type: 'SET_CURRENT_TAB_AS_CHANGED', payload: changed }),
};

const AppTabs = () => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const contentViewsIds = useMemo(() => {
    return window.tabs.getAllContentViewsIds()
  }, [window.tabs])

  useEffect(() => {
    contentViewsIds.then((ids) => {
      dispatch(actions.addTabsWithIds(ids))
    })
  }, [contentViewsIds])

  useIpcRenderer((ipc) => {

    ipc.on('create-new-document', async (_: any) => {
      const fileType: FileType = "critx"
      const id = await window.tabs.new(fileType)
      dispatch(actions.addTab(id, 'Untitled.critx', fileType))
      ipc.send('open-choose-layout-modal');
    })

    ipc.on('document-opened', async (_: any, filepath: string, filename: string, fileType: FileType) => {
      const id = await window.tabs.new(fileType)
      dispatch(actions.addTab(id, filename, fileType))
      ipc.send('document-opened-at-path', filepath, fileType);
    });

    ipc.on('document-renamed', async (_: any, filename: string) => {
      dispatch(actions.renameSelectedTab(filename))
    });

    ipc.on('document-saved', async (_: any, filename: string) => {
      dispatch(actions.renameSelectedTab(filename))
    });

    ipc.on('close-current-document', async (_: any, tabId: number) => {
      dispatch(actions.removeTabWithId(tabId))
    });

    ipc.on('main-text-changed', async (_: any, changed: boolean) => {
      dispatch(actions.setCurrentTabAsChanged(changed))
    });

    return () => {
      ipc.cleanup()
    }
  }, [window.electron.ipcRenderer]);

  return (
    <BrowserTabBar
      tabs={state.tabs}
      selectedTab={state.selectedTab}
      onAdd={async () => {
        await window.doc.openDocument();
      }}
      onSelect={(tab) => {
        window.tabs.select(tab.id, tab.type)
        dispatch(actions.selectTab(tab))
      }}
      onRemove={async (tab) => {
        await window.tabs.close(tab.id)
        dispatch(actions.removeTab(tab))
      }}
      onReorder={(tabs) => {
        dispatch(actions.reorderTabs(tabs))
        window.tabs.reorder(tabs.map((tab) => tab.id))
      }}
    />
  )
}

const AppTabsWithTheme = () => {
  return (
    <ThemeProvider>
      <AppTabs />
    </ThemeProvider>
  )
}

export default memo(AppTabsWithTheme)