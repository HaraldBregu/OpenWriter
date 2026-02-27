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
import { ServiceContainer, EventBus, WindowFactory, AppState, WindowContextManager } from './core'

// Services
import { StoreService } from './services/store'
import { LoggerService } from './services/logger'
import { FileManagementService } from './services/FileManagementService'
import { AIAgentsManager, AIAgentsRegistry, ALL_AGENT_DEFINITIONS } from './aiAgentsManager'
import { TasksManagerHandlerRegistry } from './tasksManager/TasksManagerHandlerRegistry'
import { TasksManagerExecutor } from './tasksManager/TasksManagerExecutor'
import { FileDownloadHandler, AIChatHandler, AIEnhanceHandler } from './tasksManager/handlers'

// IPC modules
import type { IpcModule } from './ipc'
import {
  AppIpc,
  AIAgentsManagerIpc,
  WorkspaceIpc,
  TasksManagerIpc,
  WindowIpc,
} from './ipc'

export interface BootstrapResult {
  container: ServiceContainer
  eventBus: EventBus
  windowFactory: WindowFactory
  appState: AppState
  logger: LoggerService
  windowContextManager: WindowContextManager
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

  container.register('fileManagement', new FileManagementService())

  // REMOVED: WorkspaceService, WorkspaceMetadataService, FileWatcherService, DocumentsWatcherService
  // These services are now window-scoped and created per-window by WindowContextManager
  // This ensures complete isolation between different workspace windows

  // Initialize logger with event bus for automatic event logging
  const logger = new LoggerService(eventBus)
  container.register('logger', logger)

  container.register('AIAgentsManager', new AIAgentsManager(storeService, eventBus))

  // Named agent registry — populated explicitly (mirrors TasksManagerHandlerRegistry pattern)
  const agentRegistry = container.register('AIAgentsRegistry', new AIAgentsRegistry())
  for (const def of ALL_AGENT_DEFINITIONS) {
    agentRegistry.register(def)
  }

  // Task system -- handler registry + executor + built-in handlers
  const taskHandlerRegistry = container.register('taskHandlerRegistry', new TasksManagerHandlerRegistry())
  taskHandlerRegistry.register(new FileDownloadHandler())
  taskHandlerRegistry.register(new AIChatHandler(storeService))
  taskHandlerRegistry.register(new AIEnhanceHandler(storeService))
  container.register('taskExecutor', new TasksManagerExecutor(taskHandlerRegistry, eventBus, 5))

  // Create WindowContextManager for managing per-window service instances
  const windowContextManager = new WindowContextManager(container, eventBus)
  container.register('windowContextManager', windowContextManager)

  console.log(`[Bootstrap] Registered ${container.has('store') ? 'all' : 'some'} global services`)

  return { container, eventBus, windowFactory, appState, logger, windowContextManager }
}

/**
 * Register all IPC modules.
 * This should be called after services are registered and before app is ready.
 */
export function bootstrapIpcModules(container: ServiceContainer, eventBus: EventBus): void {
  console.log('[Bootstrap] Registering IPC modules...')

  const ipcModules: IpcModule[] = [
    new AppIpc(),
    new AIAgentsManagerIpc(),
    new WorkspaceIpc(),
    new TasksManagerIpc(),
    new WindowIpc(),
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
export function setupAppLifecycle(appState: AppState, logger?: LoggerService): void {
  app.on('before-quit', () => {
    appState.setQuitting()
    logger?.info('App', 'Application is quitting')
  })

  app.on('window-all-closed', () => {
    logger?.info('App', 'All windows closed')
    if (process.platform !== 'darwin' && appState.isQuitting) {
      app.quit()
    }
  })

  app.on('activate', () => {
    logger?.debug('App', 'Application activated')
  })

  app.on('will-quit', () => {
    logger?.info('App', 'Application will quit')
  })

  app.on('quit', (_event, exitCode) => {
    logger?.info('App', `Application quit with exit code: ${exitCode}`)
  })
}

/**
 * Setup Electron event logging hooks.
 * Captures various Electron lifecycle and window events for debugging.
 */
export function setupEventLogging(logger: LoggerService): void {
  // App lifecycle events
  app.on('ready', () => {
    logger.info('App', 'Application ready', {
      version: app.getVersion(),
      platform: process.platform,
      arch: process.arch,
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      node: process.versions.node
    })
  })

  app.on('browser-window-created', (_event, window) => {
    logger.debug('App', `Browser window created: ID ${window.id}`)

    // Window-specific events
    window.on('ready-to-show', () => {
      logger.debug('Window', `Window ready to show: ID ${window.id}`)
    })

    window.on('show', () => {
      logger.debug('Window', `Window shown: ID ${window.id}`)
    })

    window.on('hide', () => {
      logger.debug('Window', `Window hidden: ID ${window.id}`)
    })

    window.on('focus', () => {
      logger.debug('Window', `Window focused: ID ${window.id}`)
    })

    window.on('blur', () => {
      logger.debug('Window', `Window blurred: ID ${window.id}`)
    })

    window.on('maximize', () => {
      logger.debug('Window', `Window maximized: ID ${window.id}`)
    })

    window.on('unmaximize', () => {
      logger.debug('Window', `Window unmaximized: ID ${window.id}`)
    })

    window.on('minimize', () => {
      logger.debug('Window', `Window minimized: ID ${window.id}`)
    })

    window.on('restore', () => {
      logger.debug('Window', `Window restored: ID ${window.id}`)
    })

    window.on('close', () => {
      logger.debug('Window', `Window closing: ID ${window.id}`)
    })

    window.on('closed', () => {
      logger.debug('Window', `Window closed: ID ${window.id}`)
    })

    window.webContents.on('did-finish-load', () => {
      logger.debug('WebContents', `Page loaded: Window ID ${window.id}`)
    })

    window.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
      logger.error('WebContents', `Page failed to load: ${validatedURL}`, {
        windowId: window.id,
        errorCode,
        errorDescription
      })
    })

    window.webContents.on('render-process-gone', (_event, details) => {
      logger.error('WebContents', `Renderer process gone: Window ID ${window.id}`, {
        reason: details.reason,
        exitCode: details.exitCode
      })
    })

    window.webContents.on('unresponsive', () => {
      logger.warn('WebContents', `Renderer process unresponsive: Window ID ${window.id}`)
    })

    window.webContents.on('responsive', () => {
      logger.info('WebContents', `Renderer process responsive again: Window ID ${window.id}`)
    })
  })

  app.on('browser-window-focus', (_event, window) => {
    logger.debug('App', `Browser window focused: ID ${window.id}`)
  })

  app.on('browser-window-blur', (_event, window) => {
    logger.debug('App', `Browser window blurred: ID ${window.id}`)
  })

  app.on('child-process-gone', (_event, details) => {
    logger.error('App', 'Child process gone', {
      type: details.type,
      reason: details.reason,
      exitCode: details.exitCode
    })
  })

  // Certificate errors
  app.on('certificate-error', (_event, _webContents, url, error, certificate) => {
    logger.error('App', 'Certificate error', {
      url,
      error,
      issuer: certificate.issuerName
    })
  })

  // Session events
  app.on('web-contents-created', (_event, webContents) => {
    logger.debug('App', `WebContents created: ID ${webContents.id}`)
  })

  // Accessibility support
  app.on('accessibility-support-changed', (_event, accessibilitySupportEnabled) => {
    logger.info('App', `Accessibility support: ${accessibilitySupportEnabled ? 'enabled' : 'disabled'}`)
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
