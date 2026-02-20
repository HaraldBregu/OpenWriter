/**
 * Minimal service container with lifecycle management.
 *
 * Design decision: This is intentionally NOT a full IoC framework.
 * For an Electron main process with ~15 services, a simple typed
 * registry is more appropriate than abstract factories or reflection.
 */

export interface Disposable {
  destroy(): void
}

export class ServiceContainer {
  private services = new Map<string, unknown>()
  private disposables: Disposable[] = []

  /**
   * Register a service instance. If it has a destroy() method,
   * it will be called during shutdown.
   */
  register<T>(key: string, instance: T): T {
    if (this.services.has(key)) {
      throw new Error(`Service "${key}" is already registered`)
    }
    this.services.set(key, instance)

    if (this.isDisposable(instance)) {
      this.disposables.push(instance)
    }

    return instance
  }

  /**
   * Retrieve a service by key. Throws if not found.
   */
  get<T>(key: string): T {
    const service = this.services.get(key)
    if (!service) {
      throw new Error(`Service "${key}" not found. Was it registered?`)
    }
    return service as T
  }

  /**
   * Check if a service is registered.
   */
  has(key: string): boolean {
    return this.services.has(key)
  }

  /**
   * Gracefully shut down all disposable services in reverse registration order.
   */
  async shutdown(): Promise<void> {
    console.log(`[ServiceContainer] Shutting down ${this.disposables.length} services...`)
    for (const disposable of [...this.disposables].reverse()) {
      try {
        disposable.destroy()
      } catch (err) {
        console.error('[ServiceContainer] Error during shutdown:', err)
      }
    }
    this.services.clear()
    this.disposables = []
  }

  private isDisposable(obj: unknown): obj is Disposable {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'destroy' in obj &&
      typeof (obj as Disposable).destroy === 'function'
    )
  }
}
