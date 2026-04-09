/** Files RTK listener effects — side-effect handlers for files actions. */
import { startAppListening } from '../listener-middleware';
import { insertFilesRequested, insertFilesCompleted } from './reducer';
import { loadFiles } from './actions';

/**
 * Listener: when `insertFilesRequested` is dispatched, call the IPC method
 * to open the file picker and insert files into resources/files/.
 *
 * After the import resolves we explicitly reload the files list because
 * FilesWatcherService suppresses events for app-generated writes.
 */
startAppListening({
	actionCreator: insertFilesRequested,
	effect: async (action, listenerApi) => {
		const extensions = action.payload;
		try {
			const inserted = await window.workspace.insertFiles(extensions);
			if (inserted.length > 0) {
				await listenerApi.dispatch(loadFiles());
			}
		} catch {
			// Swallow picker-cancellation and validation errors; the UI
			// already shows an Electron dialog for validation failures.
		} finally {
			listenerApi.dispatch(insertFilesCompleted());
		}
	},
});
