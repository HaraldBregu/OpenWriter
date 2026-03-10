/** Workspace RTK listener effects — side-effect handlers for workspace actions. */
import { startAppListening } from '../listener-middleware';
import { importDocumentsRequested, importDocumentsCompleted } from './reducer';

/**
 * Listener: when `importDocumentsRequested` is dispatched, call the IPC
 * method to open the file picker and import files into the workspace.
 * The document list is reloaded automatically by the file watcher bridge
 * in App.tsx, so we only need to manage the `importing` flag here.
 */
startAppListening({
	actionCreator: importDocumentsRequested,
	effect: async (action, listenerApi) => {
		const extensions = action.payload;
		try {
			await window.workspace.importFiles(extensions);
		} catch {
			// Import errors are handled by the watcher triggering a reload
		} finally {
			listenerApi.dispatch(importDocumentsCompleted());
		}
	},
});
