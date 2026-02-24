/**
 * Tests for AgentIpc.
 * Verifies that AgentIpc delegates IPC registration to AgentService.registerHandlers().
 */
import { AgentIpc } from '../../../../src/main/ipc/AgentIpc'
import { ServiceContainer } from '../../../../src/main/core/ServiceContainer'
import { EventBus } from '../../../../src/main/core/EventBus'

describe('AgentIpc', () => {
  let module: AgentIpc
  let container: ServiceContainer
  let eventBus: EventBus
  let mockAgent: { registerHandlers: jest.Mock }

  beforeEach(() => {
    jest.clearAllMocks()

    mockAgent = {
      registerHandlers: jest.fn()
    }

    container = new ServiceContainer()
    container.register('agent', mockAgent)
    eventBus = new EventBus()
    module = new AgentIpc()
  })

  it('should have name "agent"', () => {
    expect(module.name).toBe('agent')
  })

  it('should retrieve the agent service from the container and call registerHandlers', () => {
    module.register(container, eventBus)
    expect(mockAgent.registerHandlers).toHaveBeenCalledTimes(1)
  })

  it('should not call registerHandlers if not registered', () => {
    // Calling register again with a fresh container that has a different mock
    const secondMockAgent = { registerHandlers: jest.fn() }
    const freshContainer = new ServiceContainer()
    freshContainer.register('agent', secondMockAgent)

    module.register(freshContainer, eventBus)

    expect(mockAgent.registerHandlers).not.toHaveBeenCalled()
    expect(secondMockAgent.registerHandlers).toHaveBeenCalledTimes(1)
  })
})
