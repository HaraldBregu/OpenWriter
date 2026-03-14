// ---- Task system types ---------------------------------------------------
// Note: Individual task type files are co-located with their domain code.
// Import directly from the specific file when needed within the taskManager subtree.
export type {
	TaskPriority,
	TaskStatus,
	TaskOptions,
	ActiveTask,
} from './task_manager/task-descriptor';

export type { ProgressReporter, StreamReporter, TaskHandler } from './task_manager/task-handler';

// ---- Core types ----------------------------------------------------------
// Note: Core types are co-located with their implementation files.
// Export them here for convenience when importing from outside the core subtree.
export type { Disposable } from './core/service-container';
export type { AppEvent, AppEvents } from './core/event-bus';
export type { WindowContextConfig } from './core/window-context';
export type { WindowPreset } from './core/window-factory';
export type { WindowScopedServiceDefinition } from './core/window-scoped-service-factory';

// ---- IPC types -----------------------------------------------------------
export type { IpcModule } from './ipc/ipc-module';

// ---- Service types -------------------------------------------------------
export type { WorkspaceState } from './workspace/workspace-service';
export type { LogLevel, LoggerOptions } from './services/logger';
export type { WorkspaceInfo, StoreSchema } from './services/store';

// ---- File utility types --------------------------------------------------
export type { FileTypeValidationResult } from '../shared/file-type-validator';
