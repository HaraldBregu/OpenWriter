/**
 * IPC Module exports.
 * Each module is responsible for registering its own IPC handlers.
 */

export type { IpcModule } from './ipc-module';
export { AppIpc } from './app-ipc';
export { TaskManagerIpc } from './task-manager-ipc';
export { WorkspaceIpc } from './workspace-ipc';
export { WindowIpc } from './window-ipc';
