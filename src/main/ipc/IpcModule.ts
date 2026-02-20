import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'

/**
 * Interface for self-contained IPC handler modules.
 * Each module registers its own ipcMain.handle/on calls
 * and has access to the service container and event bus.
 */
export interface IpcModule {
  /**
   * Unique name for this IPC module (used for logging).
   */
  readonly name: string

  /**
   * Register all IPC handlers for this domain.
   * Called once during app initialization.
   */
  register(container: ServiceContainer, eventBus: EventBus): void
}
