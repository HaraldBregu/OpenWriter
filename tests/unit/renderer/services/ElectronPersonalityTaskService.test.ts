/**
 * Tests for ElectronPersonalityTaskService.
 *
 * Testing strategy:
 *   - The service accesses three global bridges: window.task, window.app,
 *     and window.workspace. These are installed by tests/setup/renderer.ts
 *     with jest.fn() mocks. Individual tests configure mock return values.
 *   - The `assertBridge()` private method is exercised indirectly through the
 *     public API by removing window.task before the call.
 *   - window.task.cancel does NOT throw when window.task is undefined — the
 *     method has an explicit guard (`if (!window.task) return`). This is
 *     documented as intentional: cancel is fire-and-forget.
 *   - The service file uses `import.meta.env` references only in context files
 *     that import it; the service itself does not use import.meta directly.
 *
 * Cases covered:
 *   - assertBridge(): throws when window.task is undefined
 *   - assertBridge(): does not throw when window.task is present
 *   - submitTask: delegates to window.task.submit with correct payload
 *   - submitTask: includes optional fields (modelId, temperature, maxTokens)
 *   - submitTask: omits optional fields when not provided
 *   - cancelTask: delegates to window.task.cancel when bridge is present
 *   - cancelTask: is a no-op when window.task is undefined (graceful)
 *   - getModelSettings: delegates to window.app.getModelSettings
 *   - getModelSettings: returns null when window.app throws
 *   - savePersonality: delegates to window.workspace.personality.save
 */

import { ElectronPersonalityTaskService } from '../../../../src/renderer/src/services/ElectronPersonalityTaskService'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createService() {
  return new ElectronPersonalityTaskService()
}

// Save a reference to the original window.task installed by renderer.ts setup.
// Individual tests that need to remove it do so inside their own describe block.
function removeTaskBridge() {
  Object.defineProperty(window, 'task', {
    value: undefined,
    writable: true,
    configurable: true
  })
}

function restoreTaskBridge() {
  Object.defineProperty(window, 'task', {
    value: {
      submit: jest.fn().mockResolvedValue({ success: true, data: { taskId: 'task-1' } }),
      cancel: jest.fn().mockResolvedValue({ success: true, data: true }),
      list: jest.fn().mockResolvedValue({ success: true, data: [] }),
      onEvent: jest.fn().mockReturnValue(jest.fn())
    },
    writable: true,
    configurable: true
  })
}

// ---------------------------------------------------------------------------
// Suite 1: assertBridge() — bridge missing
// ---------------------------------------------------------------------------

describe('ElectronPersonalityTaskService — assertBridge() when bridge is missing', () => {
  beforeEach(() => {
    removeTaskBridge()
  })

  afterEach(() => {
    restoreTaskBridge()
  })

  it('submitTask throws when window.task is undefined', async () => {
    const service = createService()

    await expect(
      service.submitTask({
        prompt: 'hello',
        providerId: 'openai',
        systemPrompt: 'sys',
        messages: []
      })
    ).rejects.toThrow('[ElectronPersonalityTaskService] window.task is undefined.')
  })

  it('cancelTask is a no-op (does not throw) when window.task is undefined', () => {
    const service = createService()

    // cancelTask has an explicit guard: `if (!window.task) return`
    // This ensures fire-and-forget cancels never crash the UI.
    expect(() => service.cancelTask('any-task-id')).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// Suite 2: submitTask
// ---------------------------------------------------------------------------

describe('ElectronPersonalityTaskService — submitTask', () => {
  beforeEach(() => {
    ;(window.task.submit as jest.Mock).mockResolvedValue({
      success: true,
      data: { taskId: 'new-task' }
    })
  })

  it('calls window.task.submit with the required fields', async () => {
    const service = createService()

    await service.submitTask({
      prompt: 'test prompt',
      providerId: 'openai',
      systemPrompt: 'You are helpful.',
      messages: [{ role: 'user', content: 'hello' }]
    })

    expect(window.task.submit).toHaveBeenCalledWith(
      'ai-chat',
      expect.objectContaining({
        prompt: 'test prompt',
        providerId: 'openai',
        systemPrompt: 'You are helpful.',
        messages: [{ role: 'user', content: 'hello' }]
      })
    )
  })

  it('includes modelId in the payload when provided', async () => {
    const submitMock = jest.fn().mockResolvedValue({ success: true, data: { taskId: 't' } })
    Object.defineProperty(window, 'task', {
      value: { ...window.task, submit: submitMock },
      writable: true, configurable: true
    })

    const service = createService()

    await service.submitTask({
      prompt: 'p',
      providerId: 'openai',
      systemPrompt: 's',
      messages: [],
      modelId: 'gpt-4o'
    })

    expect(submitMock).toHaveBeenCalledWith(
      'ai-chat',
      expect.objectContaining({ modelId: 'gpt-4o' })
    )
  })

  it('omits modelId from the payload when not provided', async () => {
    const submitMock = jest.fn().mockResolvedValue({ success: true, data: { taskId: 't' } })
    Object.defineProperty(window, 'task', {
      value: { ...window.task, submit: submitMock },
      writable: true, configurable: true
    })

    const service = createService()

    await service.submitTask({
      prompt: 'p',
      providerId: 'openai',
      systemPrompt: 's',
      messages: []
    })

    const payload = submitMock.mock.calls[0][1]
    expect(payload).not.toHaveProperty('modelId')
  })

  it('includes temperature in the payload when provided', async () => {
    const submitMock = jest.fn().mockResolvedValue({ success: true, data: { taskId: 't' } })
    Object.defineProperty(window, 'task', {
      value: { ...window.task, submit: submitMock },
      writable: true, configurable: true
    })

    const service = createService()

    await service.submitTask({
      prompt: 'p',
      providerId: 'openai',
      systemPrompt: 's',
      messages: [],
      temperature: 0.7
    })

    expect(submitMock).toHaveBeenCalledWith(
      'ai-chat',
      expect.objectContaining({ temperature: 0.7 })
    )
  })

  it('omits temperature from the payload when undefined', async () => {
    const submitMock = jest.fn().mockResolvedValue({ success: true, data: { taskId: 't' } })
    Object.defineProperty(window, 'task', {
      value: { ...window.task, submit: submitMock },
      writable: true, configurable: true
    })

    const service = createService()

    await service.submitTask({
      prompt: 'p',
      providerId: 'openai',
      systemPrompt: 's',
      messages: [],
      temperature: undefined
    })

    const payload = submitMock.mock.calls[0][1]
    expect(payload).not.toHaveProperty('temperature')
  })

  it('includes maxTokens in the payload when provided', async () => {
    const submitMock = jest.fn().mockResolvedValue({ success: true, data: { taskId: 't' } })
    Object.defineProperty(window, 'task', {
      value: { ...window.task, submit: submitMock },
      writable: true, configurable: true
    })

    const service = createService()

    await service.submitTask({
      prompt: 'p',
      providerId: 'openai',
      systemPrompt: 's',
      messages: [],
      maxTokens: 2048
    })

    expect(submitMock).toHaveBeenCalledWith(
      'ai-chat',
      expect.objectContaining({ maxTokens: 2048 })
    )
  })

  it('returns the result envelope from window.task.submit', async () => {
    ;(window.task.submit as jest.Mock).mockResolvedValue({
      success: true,
      data: { taskId: 'new-task' }
    })

    const service = createService()

    const result = await service.submitTask({
      prompt: 'p',
      providerId: 'openai',
      systemPrompt: 's',
      messages: []
    })

    expect(result).toEqual({ success: true, data: { taskId: 'new-task' } })
  })

  it('forwards a failure result from window.task.submit unchanged', async () => {
    ;(window.task.submit as jest.Mock).mockResolvedValue({
      success: false,
      error: { message: 'Provider not configured' }
    })

    const service = createService()

    const result = await service.submitTask({
      prompt: 'p',
      providerId: 'openai',
      systemPrompt: 's',
      messages: []
    })

    expect(result).toEqual({ success: false, error: { message: 'Provider not configured' } })
  })
})

// ---------------------------------------------------------------------------
// Suite 3: cancelTask
// ---------------------------------------------------------------------------

describe('ElectronPersonalityTaskService — cancelTask', () => {
  it('calls window.task.cancel with the task ID', () => {
    const service = createService()
    service.cancelTask('task-xyz')

    expect(window.task.cancel).toHaveBeenCalledWith('task-xyz')
  })
})

// ---------------------------------------------------------------------------
// Suite 4: getModelSettings
// ---------------------------------------------------------------------------

describe('ElectronPersonalityTaskService — getModelSettings', () => {
  it('returns the model settings from window.app.getModelSettings', async () => {
    ;(window.app.getModelSettings as jest.Mock).mockResolvedValue({
      selectedModel: 'gpt-4o'
    })

    const service = createService()
    const result = await service.getModelSettings('openai')

    expect(result).toEqual({ selectedModel: 'gpt-4o' })
    expect(window.app.getModelSettings).toHaveBeenCalledWith('openai')
  })

  it('returns null when window.app.getModelSettings throws', async () => {
    ;(window.app.getModelSettings as jest.Mock).mockRejectedValue(
      new Error('Store unavailable')
    )

    const service = createService()
    const result = await service.getModelSettings('openai')

    expect(result).toBeNull()
  })

  it('returns null when window.app.getModelSettings returns null', async () => {
    ;(window.app.getModelSettings as jest.Mock).mockResolvedValue(null)

    const service = createService()
    const result = await service.getModelSettings('openai')

    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Suite 5: savePersonality
// ---------------------------------------------------------------------------

describe('ElectronPersonalityTaskService — savePersonality', () => {
  it('delegates to window.workspace.personality.save with the provided options', async () => {
    const savedResult = { id: 'saved-123' }
    ;(window.workspace.personality.save as jest.Mock).mockResolvedValue(savedResult)

    const service = createService()

    const result = await service.savePersonality({
      sectionId: 'consciousness',
      content: 'Deep thoughts',
      metadata: {
        title: 'consciousness',
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.7
      }
    })

    expect(window.workspace.personality.save).toHaveBeenCalledWith({
      sectionId: 'consciousness',
      content: 'Deep thoughts',
      metadata: {
        title: 'consciousness',
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.7
      }
    })
    expect(result).toEqual(savedResult)
  })

  it('returns the id from the save result', async () => {
    ;(window.workspace.personality.save as jest.Mock).mockResolvedValue({ id: 'file-abc' })

    const service = createService()
    const result = await service.savePersonality({
      sectionId: 'motivation',
      content: 'Driven by purpose',
      metadata: { title: 'motivation', provider: 'openai', model: 'gpt-4o' }
    })

    expect(result.id).toBe('file-abc')
  })
})
