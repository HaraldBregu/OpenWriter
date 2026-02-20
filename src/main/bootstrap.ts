/**
 * Bootstrap module demonstrating the new architecture.
 *
 * This file shows how to initialize the core infrastructure and IPC modules.
 * It can be gradually integrated into index.ts to replace the old architecture.
 *
 * Usage (in index.ts):
 *   import { bootstrapServices, bootstrapIpcModules } from './bootstrap'
 *   const { container, eventBus, windowFactory, appState } = await bootstrapServices()
 *   bootstrapIpcModules(container, eventBus)
 */

import { app } from 'electron'

// Core infrastructure
import { ServiceContainer, EventBus, WindowFactory, AppState } from './core'

// Services
import { StoreService } from './services/store'
import { LifecycleService } from './services/lifecycle'
import { MediaPermissionsService } from './services/media-permissions'
import { BluetoothService } from './services/bluetooth'
import { NetworkService } from './services/network'
import { CronService } from './services/cron'
import { WindowManagerService } from './services/window-manager'
import { FilesystemService } from './services/filesystem'
import { DialogService } from './services/dialogs'
import { NotificationService } from './services/notification'
import { ClipboardService } from './services/clipboard'
import { AgentService } from './services/agent'
import { RagController } from './rag/RagController'

// IPC modules
import type { IpcModule } from './ipc'
import {
  AgentIpc,
  BluetoothIpc,
  ClipboardIpc,
  CronIpc,
  CustomIpc,
  DialogIpc,
  FilesystemIpc,
  LifecycleIpc,
  MediaPermissionsIpc,
  NetworkIpc,
  NotificationIpc,
  RagIpc,
  StoreIpc,
  WindowIpc,
  WorkspaceIpc
} from './ipc'

export interface BootstrapResult {
  container: ServiceContainer
  eventBus: EventBus
  windowFactory: WindowFactory
  appState: AppState
}

/**
 * Initialize core infrastructure and register all services.
 * Returns the initialized components for use in the main process.
 */
export function bootstrapServices(): BootstrapResult {
  console.log('[Bootstrap] Initializing core infrastructure...')

  // Initialize core infrastructure
  const appState = new AppState()
  const container = new ServiceContainer()
  const eventBus = new EventBus()
  const windowFactory = new WindowFactory()

  // Register core infrastructure
  container.register('appState', appState)
  container.register('eventBus', eventBus)
  container.register('windowFactory', windowFactory)

  console.log('[Bootstrap] Registering services...')

  // Register services (order matters for dependencies)
  const storeService = container.register('store', new StoreService())
  container.register('lifecycle', new LifecycleService({
    onSecondInstanceFile: (filePath) => {
      console.log('[Lifecycle] Second instance file:', filePath)
      // This callback will be wired up after main window creation
    }
  }))

  container.register('mediaPermissions', new MediaPermissionsService())
  container.register('bluetooth', new BluetoothService())
  container.register('network', new NetworkService())
  container.register('cron', new CronService())
  container.register('windowManager', new WindowManagerService())
  container.register('filesystem', new FilesystemService())
  container.register('dialog', new DialogService())
  container.register('notification', new NotificationService())
  container.register('clipboard', new ClipboardService())
  container.register('agent', new AgentService(storeService))
  container.register('rag', new RagController(storeService))

  console.log(`[Bootstrap] Registered ${container.has('store') ? 'all' : 'some'} services`)

  return { container, eventBus, windowFactory, appState }
}

/**
 * Register all IPC modules.
 * This should be called after services are registered and before app is ready.
 */
export function bootstrapIpcModules(container: ServiceContainer, eventBus: EventBus): void {
  console.log('[Bootstrap] Registering IPC modules...')

  const ipcModules: IpcModule[] = [
    new AgentIpc(),
    new BluetoothIpc(),
    new ClipboardIpc(),
    new CronIpc(),
    new CustomIpc(),
    new DialogIpc(),
    new FilesystemIpc(),
    new LifecycleIpc(),
    new MediaPermissionsIpc(),
    new NetworkIpc(),
    new NotificationIpc(),
    new RagIpc(),
    new StoreIpc(),
    new WindowIpc(),
    new WorkspaceIpc()
  ]

  for (const module of ipcModules) {
    try {
      module.register(container, eventBus)
    } catch (error) {
      console.error(`[Bootstrap] Failed to register IPC module: ${module.name}`, error)
    }
  }

  console.log(`[Bootstrap] Registered ${ipcModules.length} IPC modules`)
}

/**
 * Setup app lifecycle handlers using AppState.
 * Replaces the unsafe (app as { isQuitting?: boolean }).isQuitting pattern.
 */
export function setupAppLifecycle(appState: AppState): void {
  app.on('before-quit', () => {
    appState.setQuitting()
    console.log('[AppState] App is quitting')
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin' && appState.isQuitting) {
      app.quit()
    }
  })
}

/**
 * Cleanup handler to be called on app quit.
 * Ensures all services are properly disposed.
 */
export async function cleanup(container: ServiceContainer): Promise<void> {
  console.log('[Bootstrap] Starting cleanup...')
  await container.shutdown()
  console.log('[Bootstrap] Cleanup complete')
}
