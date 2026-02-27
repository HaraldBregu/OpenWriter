/**
 * IPC Module exports.
 * Each module is responsible for registering its own IPC handlers.
 */

export type { IpcModule } from './IpcModule'
export { AppIpc } from './AppIpc'
export { TaskIpc } from './TaskIpc'
export { WorkspaceIpc } from './WorkspaceIpc'
export { ThemeIpc } from './ThemeIpc'
export { WindowIpc } from './WindowIpc'
