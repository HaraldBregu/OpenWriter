import type { ServiceContainer, EventBus } from './index'
import type { StoreService } from '../services/store'
import type { WorkspaceService } from '../services/workspace'
import path from 'node:path'

/**
 * Interface for window-scoped service definitions.
 * Each service registered with the factory must implement this pattern.
 */
export interface WindowScopedServiceDefinition {
  /**
   * Unique key to register the service under
   */
  key: string

  /**
   * Factory function to create the service instance
   * Has access to global container, event bus, and workspace service
   */
  factory: (context: {
    globalContainer: ServiceContainer
    eventBus: EventBus
    storeService: StoreService
    workspaceService: WorkspaceService
  }) => Promise<any> | any
}

/**
 * WindowScopedServiceFactory manages the creation and initialization of per-window services.
 *
 * Benefits:
 *   - Adding new window-scoped services requires only registering them with the factory
 *   - No need to modify WindowContext.initializeServices() for each new service
 *   - Makes the list of window-scoped services explicit and discoverable
 *   - Ensures consistent initialization pattern across all services
 *   - Reduces code duplication in WindowContext
 *
 * Usage:
 *   // Register services
 *   factory.register({
 *     key: 'workspace',
 *     factory: ({ storeService, eventBus }) => new WorkspaceService(storeService, eventBus)
 *   })
 *
 *   // Create all services for a window
 *   await factory.createAndRegisterAll(container, { globalContainer, eventBus, storeService, workspaceService })
 */
export class WindowScopedServiceFactory {
  private definitions: Map<string, WindowScopedServiceDefinition> = new Map()

  /**
   * Register a service definition
   */
  register(definition: WindowScopedServiceDefinition): void {
    if (this.definitions.has(definition.key)) {
      throw new Error(`Service "${definition.key}" is already registered`)
    }
    this.definitions.set(definition.key, definition)
  }

  /**
   * Create and register all services in the container.
   * Services are created in registration order, allowing dependencies to be satisfied.
   */
  async createAndRegisterAll(
    container: ServiceContainer,
    context: {
      globalContainer: ServiceContainer
      eventBus: EventBus
      storeService: StoreService
      workspaceService: WorkspaceService
    }
  ): Promise<void> {
    console.log(`[WindowScopedServiceFactory] Creating ${this.definitions.size} window-scoped services`)

    for (const definition of this.definitions.values()) {
      try {
        const service = await definition.factory(context)
        container.register(definition.key, service)
        console.log(`[WindowScopedServiceFactory] Registered service: ${definition.key}`)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error(`[WindowScopedServiceFactory] Failed to register service "${definition.key}": ${errorMessage}`)
        throw error
      }
    }

    console.log(`[WindowScopedServiceFactory] Successfully registered all window-scoped services`)
  }

  /**
   * Get the list of registered service keys
   */
  getRegisteredServices(): string[] {
    return Array.from(this.definitions.keys())
  }

  /**
   * Check if a service is registered
   */
  isRegistered(key: string): boolean {
    return this.definitions.has(key)
  }
}

/**
 * Factory for creating the default set of window-scoped services.
 * Can be overridden or extended by applications that need custom services.
 */
export function createDefaultWindowScopedServiceFactory(): WindowScopedServiceFactory {
  // Use absolute paths to ensure correct module resolution in compiled output
  const servicesDir = path.resolve(__dirname, '../services')
  const { WorkspaceService } = require(path.join(servicesDir, 'workspace'))
  const { WorkspaceMetadataService } = require(path.join(servicesDir, 'workspace-metadata'))
  const { FileWatcherService } = require(path.join(servicesDir, 'file-watcher'))
  const { DocumentsWatcherService } = require(path.join(servicesDir, 'documents-watcher'))
  const { PersonalityFilesService } = require(path.join(servicesDir, 'personality-files'))
  const { OutputFilesService } = require(path.join(servicesDir, 'output-files'))

  const factory = new WindowScopedServiceFactory()

  // Register workspace service (primary dependency for other services)
  factory.register({
    key: 'workspace',
    factory: ({ storeService, eventBus }) => {
      const service = new WorkspaceService(storeService, eventBus)
      service.initialize()
      return service
    }
  })

  // Register workspace metadata service (depends on workspace)
  factory.register({
    key: 'workspaceMetadata',
    factory: ({ workspaceService, eventBus }) => {
      const service = new WorkspaceMetadataService(workspaceService, eventBus)
      service.initialize()
      return service
    }
  })

  // Register file watcher (depends on workspace)
  factory.register({
    key: 'fileWatcher',
    factory: async ({ workspaceService, eventBus }) => {
      const service = new FileWatcherService(eventBus)
      await service.initialize(workspaceService.getCurrent())
      return service
    }
  })

  // Register documents watcher (depends on workspace)
  factory.register({
    key: 'documentsWatcher',
    factory: async ({ workspaceService, eventBus }) => {
      const service = new DocumentsWatcherService(eventBus)
      await service.initialize(workspaceService.getCurrent())
      return service
    }
  })

  // Register personality files service
  factory.register({
    key: 'personalityFiles',
    factory: ({ workspaceService, eventBus }) => {
      const service = new PersonalityFilesService(workspaceService, eventBus)
      service.initialize()
      return service
    }
  })

  // Register output files service
  factory.register({
    key: 'outputFiles',
    factory: ({ workspaceService, eventBus }) => {
      const service = new OutputFilesService(workspaceService, eventBus)
      service.initialize()
      return service
    }
  })

  return factory
}
