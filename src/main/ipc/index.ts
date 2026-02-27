/**
 * IPC Module exports.
 * Each module is responsible for registering its own IPC handlers.
 */

export type { IpcModule } from './IpcModule'
export { AppIpc } from './AppIpc'
export { AgentIpc } from './AgentIpc'
export { TaskIpc } from './TaskIpc'
export { WorkspaceIpc } from './WorkspaceIpc'
export { WindowIpc } from './WindowIpc'
