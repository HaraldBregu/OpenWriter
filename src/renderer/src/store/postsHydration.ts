import { loadOutputItems } from './outputSlice'
import { hydratePostsFromDisk } from './postsSlice'
import { startAppListening } from './listenerMiddleware'

/**
 * Register the posts hydration listener.
 *
 * When loadOutputItems (the 'output/loadAll' thunk) fulfills, dispatch
 * hydratePostsFromDisk so postsSlice reconciles its state with disk.
 *
 * This replaces the previous extraReducers pattern that matched
 * 'output/loadAll/fulfilled' by string — now fully type-safe via the
 * thunk's .fulfilled action creator.
 *
 * Call this once from store/index.ts before the store is created.
 */
export function registerPostsHydration(): void {
  startAppListening({
    actionCreator: loadOutputItems.fulfilled,
    effect: (action, listenerApi) => {
      listenerApi.dispatch(hydratePostsFromDisk(action.payload))
    },
  })
}
