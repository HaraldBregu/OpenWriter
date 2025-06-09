import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface TabsState {
  items: TabInfo[];
  selectedTab: TabInfo | null;
}

const initialState: TabsState = {
  items: [],
  selectedTab: null,
}

const tabsSlice = createSlice({
  name: 'tabs',
  initialState,
  reducers: {
    addTabsWithIds: (state, action: PayloadAction<number[]>) => {
      const tabs = action.payload

      state.items = []
      tabs.forEach((tab) => {
        state.items.push({
          id: tab,
          name: "Untitled.critx",
          changed: false,
          type: 'critx'
        })
      })

      state.selectedTab = state.items[0]
    },
    add: (state, action: PayloadAction<{ id: number, fileName: string, type: TabType }>) => {
      const { id, fileName, type } = action.payload
      state.items.push({
        id,
        name: fileName,
        changed: false,
        type
      })
      state.selectedTab = state.items[state.items.length - 1]
    },
    select: (state, action: PayloadAction<TabInfo>) => {
      const tab = action.payload
      state.selectedTab = tab
    },
    remove: (state, action: PayloadAction<TabInfo>) => {
      const tab = action.payload
      if (state.items.length === 1) {
        state.items.splice(0, 1)
      } else {
        const index = state.items.findIndex((t) => t.id === tab.id)
        state.items.splice(index, 1)
      }
    },
    removeTabWithId: (state, action: PayloadAction<number>) => {
      const id = action.payload
      const index = state.items.findIndex((t) => t.id === id)
      state.items.splice(index, 1)
      if (state.items.length > 0) {
        state.selectedTab = state.items[state.items.length - 1]
      } else {
        state.selectedTab = null
      }
    },
    removeSelectedTab: (state) => {
      const index = state.items.findIndex((t) => t.id === state.selectedTab?.id)
      state.items.splice(index, 1)
      if (state.items.length > 0) {
        state.selectedTab = state.items[state.items.length - 1]
      } else {
        state.selectedTab = null
      }
    },
    reorder: (state, action: PayloadAction<TabInfo[]>) => {
      const tabs = action.payload
      state.items = tabs
    },
    renameSelectedTab: (state, action: PayloadAction<string>) => {
      const filename = action.payload
    
      if (state.selectedTab) {
        state.selectedTab.name = filename
        state.selectedTab.changed = false
      }

      state.items.forEach((tab) => {
        if (tab.id === state.selectedTab?.id) {
          tab.name = filename
          tab.changed = false
        }
      })
    },
    setCurrentTabAsChanged: (state, action: PayloadAction<boolean>) => {
      if (state.selectedTab) {
        state.selectedTab.changed = action.payload
      }

      state.items.forEach((tab) => {
        if (tab.id === state.selectedTab?.id) {
          tab.changed = action.payload
        }
      })
    },
  },
});

export const {
  add,
  addTabsWithIds,
  select,
  remove,
  removeTabWithId,
  reorder,
  renameSelectedTab,
  removeSelectedTab,
  setCurrentTabAsChanged,
} = tabsSlice.actions;
export default tabsSlice.reducer;
