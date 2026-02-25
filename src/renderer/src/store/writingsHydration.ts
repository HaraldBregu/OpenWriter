import { loadOutputItems } from './outputSlice'
import { hydrateWritingsFromDisk } from './writingsSlice'
import { startAppListening } from './listenerMiddleware'

/**
 * Register the writings hydration listener.
 *
 * When loadOutputItems (the 'output/loadAll' thunk) fulfills, dispatch
 * hydrateWritingsFromDisk so writingsSlice reconciles its state with disk.
 *
 * This replaces the previous extraReducers pattern that matched
 * 'output/loadAll/fulfilled' by string — now fully type-safe via the
 * thunk's .fulfilled action creator.
 *
 * Call this once from store/index.ts before the store is created.
 */
export function registerWritingsHydration(): void {
  startAppListening({
    actionCreator: loadOutputItems.fulfilled,
    effect: (action, listenerApi) => {
      listenerApi.dispatch(hydrateWritingsFromDisk(action.payload))
    },
  })
}
