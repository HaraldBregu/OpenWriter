/**
 * IPC Module exports.
 * Each module is responsible for registering its own IPC handlers.
 */

export type { IpcModule } from './IpcModule'
export { AgentIpc } from './AgentIpc'
export { CronIpc } from './CronIpc'
export { CustomIpc } from './CustomIpc'
export { DocumentsIpc } from './DocumentsIpc'
export { PipelineIpc } from './PipelineIpc'
// StoreIpc has been merged into CustomIpc. Store handlers are now registered
// there and exposed to the renderer via window.app instead of window.store.
export { TaskIpc } from './TaskIpc'
export { WorkspaceIpc } from './WorkspaceIpc'
export { DirectoriesIpc } from './DirectoriesIpc'
export { PersonalityIpc } from './PersonalityIpc'
export { ThemeIpc } from './ThemeIpc'
export { WindowIpc } from './WindowIpc'
