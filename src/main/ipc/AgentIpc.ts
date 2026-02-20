import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { AgentService } from '../services/agent'

/**
 * IPC handlers for agent operations.
 *
 * NOTE: AgentService.registerHandlers() currently handles all agent IPC.
 * This module exists as a placeholder for future refactoring when
 * AgentService methods are made public and can be called from here.
 *
 * TODO: Refactor AgentService to make methods public and remove registerHandlers()
 */
export class AgentIpc implements IpcModule {
  readonly name = 'agent'

  register(container: ServiceContainer, _eventBus: EventBus): void {
    const agent = container.get<AgentService>('agent')

    // For now, we delegate to the original registerHandlers()
    // This maintains backward compatibility while we transition to the IPC Module pattern
    agent.registerHandlers()

    console.log(`[IPC] Registered ${this.name} module (delegated to AgentService)`)
  }
}
