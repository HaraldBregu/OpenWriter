/**
 * Tests for AgentService.
 * Validates session management, IPC handler registration, and status reporting.
 * AgentController and LangChain are mocked since they require external API keys.
 */
import { ipcMain } from 'electron'

// Mock the AgentController before importing AgentService
jest.mock('../../../../src/main/agent/AgentController', () => ({
  AgentController: jest.fn().mockImplementation(() => ({
    runAgent: jest.fn().mockResolvedValue(undefined),
    cancel: jest.fn(),
    isRunning: jest.fn().mockReturnValue(false)
  }))
}))

import { AgentService } from '../../../../src/main/services/agent'

describe('AgentService', () => {
  let service: AgentService
  let mockStoreService: Record<string, jest.Mock>

  beforeEach(() => {
    jest.clearAllMocks()

    mockStoreService = {
      getModelSettings: jest.fn().mockReturnValue({
        selectedModel: 'gpt-4o-mini',
        apiToken: 'test-token'
      }),
      getAllModelSettings: jest.fn().mockReturnValue({}),
      setSelectedModel: jest.fn(),
      setApiToken: jest.fn()
    }

    service = new AgentService(mockStoreService as any)
  })

  afterEach(() => {
    service.cleanup()
  })

  describe('registerHandlers', () => {
    it('should register all IPC handlers', () => {
      service.registerHandlers()
      const handleCalls = (ipcMain.handle as jest.Mock).mock.calls
      const onCalls = (ipcMain.on as jest.Mock).mock.calls

      const handleChannels = handleCalls.map((c: unknown[]) => c[0])
      expect(handleChannels).toContain('agent:create-session')
      expect(handleChannels).toContain('agent:destroy-session')
      expect(handleChannels).toContain('agent:get-session')
      expect(handleChannels).toContain('agent:list-sessions')
      expect(handleChannels).toContain('agent:clear-sessions')
      expect(handleChannels).toContain('agent:run')
      expect(handleChannels).toContain('agent:run-session')
      expect(handleChannels).toContain('agent:cancel-session')
      expect(handleChannels).toContain('agent:get-status')
      expect(handleChannels).toContain('agent:is-running')

      const onChannels = onCalls.map((c: unknown[]) => c[0])
      expect(onChannels).toContain('agent:cancel')
    })
  })

  describe('session management via IPC', () => {
    it('should create and retrieve a session via IPC handlers', async () => {
      service.registerHandlers()

      // Find create-session handler
      const createHandler = (ipcMain.handle as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'agent:create-session'
      )[1]

      const session = await createHandler({}, {
        sessionId: 'test-session',
        providerId: 'openai'
      })

      expect(session.sessionId).toBe('test-session')
      expect(session.providerId).toBe('openai')
      expect(session.isActive).toBe(false)

      // Find get-session handler
      const getHandler = (ipcMain.handle as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'agent:get-session'
      )[1]

      const retrieved = await getHandler({}, 'test-session')
      expect(retrieved).not.toBeNull()
      expect(retrieved.sessionId).toBe('test-session')
    })

    it('should list all sessions', async () => {
      service.registerHandlers()

      const createHandler = (ipcMain.handle as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'agent:create-session'
      )[1]

      await createHandler({}, { sessionId: 's1', providerId: 'openai' })
      await createHandler({}, { sessionId: 's2', providerId: 'anthropic' })

      const listHandler = (ipcMain.handle as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'agent:list-sessions'
      )[1]

      const sessions = await listHandler({})
      expect(sessions).toHaveLength(2)
    })

    it('should destroy a session', async () => {
      service.registerHandlers()

      const createHandler = (ipcMain.handle as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'agent:create-session'
      )[1]
      await createHandler({}, { sessionId: 'del-me', providerId: 'openai' })

      const destroyHandler = (ipcMain.handle as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'agent:destroy-session'
      )[1]
      const result = await destroyHandler({}, 'del-me')
      expect(result).toBe(true)

      const getHandler = (ipcMain.handle as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'agent:get-session'
      )[1]
      const session = await getHandler({}, 'del-me')
      expect(session).toBeNull()
    })

    it('should clear all sessions', async () => {
      service.registerHandlers()

      const createHandler = (ipcMain.handle as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'agent:create-session'
      )[1]
      await createHandler({}, { sessionId: 's1', providerId: 'openai' })
      await createHandler({}, { sessionId: 's2', providerId: 'openai' })

      const clearHandler = (ipcMain.handle as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'agent:clear-sessions'
      )[1]
      const count = await clearHandler({})
      expect(count).toBe(2)
    })
  })

  describe('status', () => {
    it('should report status via IPC handler', async () => {
      service.registerHandlers()

      const statusHandler = (ipcMain.handle as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === 'agent:get-status'
      )[1]
      const status = await statusHandler({})
      expect(status).toEqual({
        totalSessions: 0,
        activeSessions: 0,
        totalMessages: 0
      })
    })
  })

  describe('cleanup', () => {
    it('should clear all sessions and controllers', () => {
      service.cleanup()
      // No error thrown
    })
  })
})
