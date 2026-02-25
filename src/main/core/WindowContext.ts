/**
 * WindowContext provides per-window isolated services.
 *
 * Problem: Previously, all windows shared the same global service instances,
 * causing workspace data to leak between windows (WorkspaceService.setCurrent()
 * would affect ALL windows).
 *
 * Solution: Each window gets its own ServiceContainer with isolated instances
 * of workspace-related services (WorkspaceService, WorkspaceMetadataService, etc.).
 *
 * Architecture:
 * - Global services (shared across all windows): Logger, MediaPermissions, etc.
 * - Window-scoped services (isolated per window): Workspace, WorkspaceMetadata, FileWatcher, etc.
 */

import { BrowserWindow } from 'electron'
import { ServiceContainer, type EventBus } from './index'
import { StoreService } from '../services/store'
import { WorkspaceService } from '../services/workspace'
import { createDefaultWindowScopedServiceFactory, type WindowScopedServiceFactory } from './WindowScopedServiceFactory'

export interface WindowContextConfig {
  window: BrowserWindow
  globalContainer: ServiceContainer
  eventBus: EventBus
}

/**
 * WindowContext encapsulates all per-window state and services.
 * Each BrowserWindow gets its own WindowContext instance.
 */
export class WindowContext {
  public readonly windowId: number
  public readonly window: BrowserWindow
  public readonly container: ServiceContainer
  public readonly eventBus: EventBus

  constructor(config: WindowContextConfig) {
    this.window = config.window
    this.windowId = config.window.id
    this.container = new ServiceContainer()
    this.eventBus = config.eventBus

    console.log(`[WindowContext] Creating context for window ${this.windowId}`)

    // Initialize window-scoped services
    this.initializeServices(config.globalContainer)

    // Cleanup when window is closed
    this.window.on('closed', () => {
      this.destroy()
    })
  }

  /**
   * Initialize window-scoped services.
   * These services are isolated per window and don't affect other windows.
   */
  private initializeServices(globalContainer: ServiceContainer): void {
    const storeService = globalContainer.get<StoreService>('store')

    // Workspace service - scoped to this window
    const workspaceService = new WorkspaceService(storeService, this.eventBus)
    workspaceService.initialize()
    this.container.register('workspace', workspaceService)

    // Workspace metadata service - scoped to this window
    const workspaceMetadataService = new WorkspaceMetadataService(workspaceService, this.eventBus)
    workspaceMetadataService.initialize()
    this.container.register('workspaceMetadata', workspaceMetadataService)

    // File watcher service - scoped to this window's workspace
    const fileWatcherService = new FileWatcherService(this.eventBus)
    fileWatcherService.initialize(workspaceService.getCurrent()).catch((error) => {
      console.error(`[WindowContext] Failed to initialize FileWatcherService for window ${this.windowId}:`, error)
    })
    this.container.register('fileWatcher', fileWatcherService)

    // Documents watcher service - scoped to this window's workspace
    const documentsWatcherService = new DocumentsWatcherService(this.eventBus)
    documentsWatcherService.initialize(workspaceService.getCurrent()).catch((error) => {
      console.error(`[WindowContext] Failed to initialize DocumentsWatcherService for window ${this.windowId}:`, error)
    })
    this.container.register('documentsWatcher', documentsWatcherService)

    // Personality files service - scoped to this window's workspace
    const personalityFilesService = new PersonalityFilesService(workspaceService, this.eventBus)
    personalityFilesService.initialize().catch((error) => {
      console.error(`[WindowContext] Failed to initialize PersonalityFilesService for window ${this.windowId}:`, error)
    })
    this.container.register('personalityFiles', personalityFilesService)

    // Output files service - scoped to this window's workspace
    const outputFilesService = new OutputFilesService(workspaceService, this.eventBus)
    outputFilesService.initialize().catch((error) => {
      console.error(`[WindowContext] Failed to initialize OutputFilesService for window ${this.windowId}:`, error)
    })
    this.container.register('outputFiles', outputFilesService)

    console.log(`[WindowContext] Initialized ${this.container.has('workspace') ? 'all' : 'some'} services for window ${this.windowId}`)
  }

  /**
   * Get a service from this window's container.
   * Falls back to global container if not found in window scope.
   */
  getService<T>(key: string, globalContainer: ServiceContainer): T {
    if (this.container.has(key)) {
      return this.container.get<T>(key)
    }
    return globalContainer.get<T>(key)
  }

  /**
   * Cleanup window-scoped services when window is closed.
   */
  async destroy(): Promise<void> {
    console.log(`[WindowContext] Destroying context for window ${this.windowId}`)
    await this.container.shutdown()
  }
}

/**
 * WindowContextManager manages all window contexts.
 * Provides a centralized registry to look up contexts by window ID.
 */
export class WindowContextManager {
  private contexts = new Map<number, WindowContext>()

  constructor(
    private readonly globalContainer: ServiceContainer,
    private readonly eventBus: EventBus
  ) {}

  /**
   * Create a new window context for a BrowserWindow.
   */
  create(window: BrowserWindow): WindowContext {
    const context = new WindowContext({
      window,
      globalContainer: this.globalContainer,
      eventBus: this.eventBus
    })

    this.contexts.set(window.id, context)

    // Auto-cleanup when window is closed
    window.on('closed', () => {
      this.contexts.delete(window.id)
    })

    return context
  }

  /**
   * Get the context for a specific window ID.
   * Throws if the context doesn't exist.
   */
  get(windowId: number): WindowContext {
    const context = this.contexts.get(windowId)
    if (!context) {
      throw new Error(`No window context found for window ID ${windowId}`)
    }
    return context
  }

  /**
   * Get the context for a specific window ID, or undefined if not found.
   */
  tryGet(windowId: number): WindowContext | undefined {
    return this.contexts.get(windowId)
  }

  /**
   * Check if a context exists for a window ID.
   */
  has(windowId: number): boolean {
    return this.contexts.has(windowId)
  }

  /**
   * Destroy all window contexts.
   */
  async destroyAll(): Promise<void> {
    console.log(`[WindowContextManager] Destroying ${this.contexts.size} window contexts`)
    for (const context of this.contexts.values()) {
      await context.destroy()
    }
    this.contexts.clear()
  }
}
