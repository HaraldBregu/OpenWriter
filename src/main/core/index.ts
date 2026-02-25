/**
 * Core infrastructure for the Electron main process.
 * These utilities provide the foundation for the refactored architecture.
 */

export { AppState } from './AppState'
export { EventBus, type AppEvent, type AppEvents } from './EventBus'
export { WindowFactory } from './WindowFactory'
export { ServiceContainer, type Disposable } from './ServiceContainer'
export { WindowContext, WindowContextManager, type WindowContextConfig } from './WindowContext'
export {
  WindowScopedServiceFactory,
  createDefaultWindowScopedServiceFactory,
  type WindowScopedServiceDefinition
} from './WindowScopedServiceFactory'
