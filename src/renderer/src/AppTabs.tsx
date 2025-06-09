import BrowserTabBar from "@/components/browser-tab-bar"
import { selectSelectedTab, selectTabs } from "./store/tabs/tabs.selector"
import { useDispatch, useSelector } from "react-redux"
import { add, addTabsWithIds, remove, removeTabWithId, renameSelectedTab, reorder, select, setCurrentTabAsChanged } from "./store/tabs/tabs.slice"
import { useEffect } from "react"
import { useIpcRenderer } from "./hooks/use-ipc-renderer"

export default function AppTabs() {
  const dispatch = useDispatch()

  const tabs = useSelector(selectTabs)
  const selectedTab = useSelector(selectSelectedTab)

  useEffect(() => {
    window.tabs.getAllContentViewsIds()
      .then(ids => {
        dispatch(addTabsWithIds(ids))
      })
  }, [window.tabs.getAllContentViewsIds])

  // HANDLE IPC EVENTS
  useIpcRenderer((ipc) => {

    ipc.on('create-new-document', async (_: any) => {
      const fileType: FileType = "critx"
      const id = await window.tabs.new(fileType)
      dispatch(add({ id, fileName: 'Untitled.critx', type: fileType }))
      ipc.send('open-choose-layout-modal');
    })

    ipc.on('document-opened', async (_: any, filepath: string, filename: string, fileType: FileType) => {
      const id = await window.tabs.new(fileType)
      dispatch(add({ id, fileName: filename, type: fileType }))
      ipc.send('document-opened-at-path', filepath, fileType);
    });

    ipc.on('document-renamed', async (_: any, filename: string) => {
      dispatch(renameSelectedTab(filename))
    });

    ipc.on('document-saved', async (_: any, filename: string) => {
      dispatch(renameSelectedTab(filename))
    });

    ipc.on('close-current-document', async (_: any, tabId: number) => {
      dispatch(removeTabWithId(tabId))
    });

    ipc.on('main-text-changed', async (_: any, changed: boolean) => {
      dispatch(setCurrentTabAsChanged(changed))
    });

    return () => {
      ipc.cleanup()
    }
  }, [window.electron.ipcRenderer]);

  return (
    <BrowserTabBar
      tabs={tabs}
      selectedTab={selectedTab}
      onAdd={async () => {
        window.doc.openDocument();
      }}
      onSelect={(tab) => {
        window.tabs.select(tab.id, tab.type)
        dispatch(select(tab))
      }}
      onRemove={async (tab) => {
        await window.tabs.close(tab.id)
        dispatch(remove(tab))
      }}
      onReorder={(tabs) => {
        dispatch(reorder(tabs))
        window.tabs.reorder(tabs.map((tab) => tab.id))
      }}
    />
  )
}
