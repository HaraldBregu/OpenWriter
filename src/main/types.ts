// ---------------------------------------------------------------------------
// Main Process Type Barrel
// ---------------------------------------------------------------------------
// Single import point for all main-process-only type definitions.
// These types are NOT safe to use in preload or renderer (they may reference
// Node.js APIs or Electron main-process internals).
//
// Individual type files are preserved for co-location with their domain code.
// This barrel makes cross-module main-process imports cleaner.
//
// Usage:
//   import type { BluetoothDeviceInfo, NetworkConnectionStatus } from '../types'
// ---------------------------------------------------------------------------

// ---- Hardware / OS types --------------------------------------------------
export type {
  BluetoothDeviceInfo,
  BluetoothScanResult,
  BluetoothConnectionStatus,
  BluetoothPermissionStatus,
} from './types/bluetooth'

export type {
  MediaPermissionStatus,
  MediaDeviceInfo,
  MediaType,
} from './types/media'

export type {
  NetworkConnectionStatus,
  NetworkInterfaceInfo,
  NetworkInfo,
} from './types/network'

// ---- Agent manager types --------------------------------------------------
// Note: AgentManagerTypes.ts lives in its domain folder for co-location.
// Import directly from '../agentManager/AgentManagerTypes' when needed within
// the agentManager subtree.
export type {
  AgentSessionConfig,
  AgentRequest,
  AgentStreamEvent,
  AgentSessionSnapshot,
  AgentRunSnapshot,
  AgentManagerStatus,
} from './agentManager/AgentManagerTypes'

// ---- Task system types ---------------------------------------------------
// Note: Individual task type files are co-located with their domain code.
// Import directly from the specific file when needed within the tasks subtree.
export type {
  TaskPriority,
  TaskStatus,
  TaskOptions,
  ActiveTask,
} from './tasks/TaskDescriptor'

export type {
  ProgressReporter,
  StreamReporter,
  TaskHandler,
} from './tasks/TaskHandler'

// ---- Core types ----------------------------------------------------------
// Note: Core types are co-located with their implementation files.
// Export them here for convenience when importing from outside the core subtree.
export type { Disposable } from './core/ServiceContainer'
export type { AppEvent, AppEvents } from './core/EventBus'
export type { WindowContextConfig } from './core/WindowContext'
export type { WindowPreset } from './core/WindowFactory'
export type {
  WindowScopedServiceDefinition,
} from './core/WindowScopedServiceFactory'

// ---- IPC types -----------------------------------------------------------
export type { IpcModule } from './ipc/IpcModule'

// ---- Service types -------------------------------------------------------
export type { WorkspaceState } from './services/workspace'
export type { LogLevel, LoggerOptions } from './services/logger'
export type { WorkspaceInfo, StoreSchema } from './services/store'

// ---- File utility types --------------------------------------------------
export type { FileTypeValidationResult } from './utils/file-type-validator'

// ---- Task handler types --------------------------------------------------
export type { AIChatInput, AIChatOutput } from './tasks/handlers/AIChatHandler'
export type {
  FileDownloadInput,
  FileDownloadOutput,
  DownloadDiagnostics,
} from './tasks/handlers/FileDownloadHandler'
