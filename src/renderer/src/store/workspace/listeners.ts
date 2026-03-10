/** Workspace RTK listener effects — side-effect handlers for workspace actions. */
import { startAppListening } from '../listener-middleware';
import { importResourcesRequested, importResourcesCompleted } from './reducer';

/**
 * Listener: when `importResourcesRequested` is dispatched, call the IPC
 * method to open the file picker and import files into the workspace.
 * The resource list is reloaded automatically by the file watcher bridge
 * in App.tsx, so we only need to manage the `importing` flag here.
 */
startAppListening({
	actionCreator: importResourcesRequested,
	effect: async (action, listenerApi) => {
		const extensions = action.payload;
		try {
			await window.workspace.importFiles(extensions);
		} catch {
			// Import errors are handled by the watcher triggering a reload
		} finally {
			listenerApi.dispatch(importResourcesCompleted());
		}
	},
});
