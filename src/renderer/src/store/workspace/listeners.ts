/** Workspace RTK listener effects — side-effect handlers for workspace actions. */
import { startAppListening } from '../listener-middleware';
import { importResourcesRequested, importResourcesCompleted } from './reducer';
import { loadResources } from './actions';

/**
 * Listener: when `importResourcesRequested` is dispatched, call the IPC
 * method to open the file picker and import files into the workspace.
 *
 * After the import resolves we explicitly reload the resources list.
 * We cannot rely on the file watcher bridge in App.tsx for this because
 * DocumentsService calls watcher.markFileAsWritten() before each copy,
 * which causes DocumentsWatcherService to suppress the resulting 'add'
 * event and never broadcast it to the renderer.
 */
startAppListening({
	actionCreator: importResourcesRequested,
	effect: async (action, listenerApi) => {
		const extensions = action.payload;
		try {
			const imported = await window.workspace.importFiles(extensions);
			if (imported.length > 0) {
				await listenerApi.dispatch(loadResources());
			}
		} catch {
			// Swallow picker-cancellation and validation errors; the UI
			// already shows an Electron dialog for validation failures.
		} finally {
			listenerApi.dispatch(importResourcesCompleted());
		}
	},
});
