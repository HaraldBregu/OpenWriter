/**
 * IPC Module exports.
 * Each module is responsible for registering its own IPC handlers.
 */

export type { IpcModule } from './IpcModule'
export { AppIpc } from './AppIpc'
export { AgentIpc } from './AgentIpc'
export { TasksManagerIpc } from './TasksManagerIpc'
export { WorkspaceIpc } from './WorkspaceIpc'
export { WindowIpc } from './WindowIpc'
