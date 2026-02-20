/**
 * Tests for chatSlice - the Redux store for chat/agent state.
 *
 * Tests cover:
 *   - All reducers (createThread, addUserMessage, appendToken, etc.)
 *   - Selectors (selectActiveThread, selectThreadById, etc.)
 *   - Edge cases (missing thread IDs, empty state)
 */

import chatReducer, {
  createThread,
  setActiveThread,
  addUserMessage,
  addAssistantMessage,
  appendToken,
  deleteThread,
  updateThreadProvider,
  setAgentRunning,
  selectThreads,
  selectActiveThreadId,
  selectActiveThread,
  selectActiveThreadMessages,
  selectIsAgentRunning,
  selectRunningThreadId,
  type ChatThread
} from '../../../../src/renderer/src/store/chatSlice'

// Helper to create a well-known initial state
function createInitialState() {
  return {
    threads: [] as ChatThread[],
    activeThreadId: null as string | null,
    isAgentRunning: false,
    runningThreadId: null as string | null
  }
}

describe('chatSlice', () => {
  describe('reducers', () => {
    describe('createThread', () => {
      it('should add a new thread and set it as active', () => {
        // Arrange
        const state = createInitialState()

        // Act
        const result = chatReducer(state, createThread('openai'))

        // Assert
        expect(result.threads).toHaveLength(1)
        expect(result.threads[0].providerId).toBe('openai')
        expect(result.threads[0].title).toBe('New Thread')
        expect(result.threads[0].messages).toEqual([])
        expect(result.activeThreadId).toBe(result.threads[0].id)
      })

      it('should prepend new threads (most recent first)', () => {
        // Arrange
        let state = createInitialState()
        state = chatReducer(state, createThread('openai'))
        const firstThreadId = state.threads[0].id

        // Act
        state = chatReducer(state, createThread('anthropic'))

        // Assert
        expect(state.threads).toHaveLength(2)
        expect(state.threads[0].providerId).toBe('anthropic') // newest first
        expect(state.threads[1].id).toBe(firstThreadId)
      })
    })

    describe('setActiveThread', () => {
      it('should set the active thread ID', () => {
        // Arrange
        const state = createInitialState()

        // Act
        const result = chatReducer(state, setActiveThread('thread-xyz'))

        // Assert
        expect(result.activeThreadId).toBe('thread-xyz')
      })
    })

    describe('addUserMessage', () => {
      it('should add a user message to the specified thread', () => {
        // Arrange
        let state = createInitialState()
        state = chatReducer(state, createThread('openai'))
        const threadId = state.threads[0].id

        // Act
        state = chatReducer(state, addUserMessage({ threadId, content: 'Hello!' }))

        // Assert
        const thread = state.threads.find((t) => t.id === threadId)
        expect(thread?.messages).toHaveLength(1)
        expect(thread?.messages[0].role).toBe('user')
        expect(thread?.messages[0].content).toBe('Hello!')
      })

      it('should auto-title the thread from the first user message', () => {
        // Arrange
        let state = createInitialState()
        state = chatReducer(state, createThread('openai'))
        const threadId = state.threads[0].id

        // Act
        state = chatReducer(
          state,
          addUserMessage({ threadId, content: 'Explain quantum computing in detail' })
        )

        // Assert
        const thread = state.threads.find((t) => t.id === threadId)
        expect(thread?.title).toBe('Explain quantum computing in detail')
      })

      it('should truncate auto-title to 50 characters', () => {
        // Arrange
        let state = createInitialState()
        state = chatReducer(state, createThread('openai'))
        const threadId = state.threads[0].id
        const longMessage = 'A'.repeat(100)

        // Act
        state = chatReducer(state, addUserMessage({ threadId, content: longMessage }))

        // Assert
        const thread = state.threads.find((t) => t.id === threadId)
        expect(thread?.title).toHaveLength(50)
      })

      it('should not modify state for a non-existent thread', () => {
        // Arrange
        const state = createInitialState()

        // Act
        const result = chatReducer(
          state,
          addUserMessage({ threadId: 'nonexistent', content: 'test' })
        )

        // Assert
        expect(result).toEqual(state)
      })
    })

    describe('addAssistantMessage', () => {
      it('should add an empty assistant message placeholder', () => {
        // Arrange
        let state = createInitialState()
        state = chatReducer(state, createThread('openai'))
        const threadId = state.threads[0].id

        // Act
        state = chatReducer(state, addAssistantMessage({ threadId }))

        // Assert
        const thread = state.threads.find((t) => t.id === threadId)
        expect(thread?.messages).toHaveLength(1)
        expect(thread?.messages[0].role).toBe('assistant')
        expect(thread?.messages[0].content).toBe('')
      })
    })

    describe('appendToken', () => {
      it('should append a token to the last assistant message', () => {
        // Arrange
        let state = createInitialState()
        state = chatReducer(state, createThread('openai'))
        const threadId = state.threads[0].id
        state = chatReducer(state, addAssistantMessage({ threadId }))

        // Act
        state = chatReducer(state, appendToken({ threadId, token: 'Hello' }))
        state = chatReducer(state, appendToken({ threadId, token: ' world' }))

        // Assert
        const thread = state.threads.find((t) => t.id === threadId)
        expect(thread?.messages[0].content).toBe('Hello world')
      })

      it('should not append if the last message is not from assistant', () => {
        // Arrange
        let state = createInitialState()
        state = chatReducer(state, createThread('openai'))
        const threadId = state.threads[0].id
        state = chatReducer(state, addUserMessage({ threadId, content: 'user msg' }))

        // Act
        const before = state.threads.find((t) => t.id === threadId)
        state = chatReducer(state, appendToken({ threadId, token: 'should-not-append' }))
        const after = state.threads.find((t) => t.id === threadId)

        // Assert
        expect(after?.messages[0].content).toBe('user msg')
        expect(after?.messages).toHaveLength(before?.messages.length ?? 0)
      })
    })

    describe('deleteThread', () => {
      it('should remove the thread by ID', () => {
        // Arrange
        let state = createInitialState()
        state = chatReducer(state, createThread('openai'))
        const threadId = state.threads[0].id

        // Act
        state = chatReducer(state, deleteThread(threadId))

        // Assert
        expect(state.threads).toHaveLength(0)
      })

      it('should set activeThreadId to the first remaining thread', () => {
        // Arrange
        let state = createInitialState()
        state = chatReducer(state, createThread('openai'))
        const firstId = state.threads[0].id
        state = chatReducer(state, createThread('anthropic'))
        const secondId = state.threads[0].id
        state = chatReducer(state, setActiveThread(secondId))

        // Act
        state = chatReducer(state, deleteThread(secondId))

        // Assert
        expect(state.activeThreadId).toBe(firstId)
      })

      it('should set activeThreadId to null when the last thread is deleted', () => {
        // Arrange
        let state = createInitialState()
        state = chatReducer(state, createThread('openai'))
        const threadId = state.threads[0].id

        // Act
        state = chatReducer(state, deleteThread(threadId))

        // Assert
        expect(state.activeThreadId).toBeNull()
      })
    })

    describe('updateThreadProvider', () => {
      it('should update the provider of a thread', () => {
        // Arrange
        let state = createInitialState()
        state = chatReducer(state, createThread('openai'))
        const threadId = state.threads[0].id

        // Act
        state = chatReducer(
          state,
          updateThreadProvider({ threadId, providerId: 'anthropic' })
        )

        // Assert
        expect(state.threads[0].providerId).toBe('anthropic')
      })
    })

    describe('setAgentRunning', () => {
      it('should set isAgentRunning and runningThreadId', () => {
        // Arrange
        const state = createInitialState()

        // Act
        const result = chatReducer(
          state,
          setAgentRunning({ running: true, threadId: 'thread-1' })
        )

        // Assert
        expect(result.isAgentRunning).toBe(true)
        expect(result.runningThreadId).toBe('thread-1')
      })

      it('should clear runningThreadId when stopped', () => {
        // Arrange
        const state = {
          ...createInitialState(),
          isAgentRunning: true,
          runningThreadId: 'thread-1'
        }

        // Act
        const result = chatReducer(state, setAgentRunning({ running: false }))

        // Assert
        expect(result.isAgentRunning).toBe(false)
        expect(result.runningThreadId).toBeNull()
      })
    })
  })

  describe('selectors', () => {
    it('selectThreads should return the threads array', () => {
      const state = { chat: createInitialState() }
      expect(selectThreads(state)).toEqual([])
    })

    it('selectActiveThreadId should return the active thread ID', () => {
      const state = { chat: { ...createInitialState(), activeThreadId: 'abc' } }
      expect(selectActiveThreadId(state)).toBe('abc')
    })

    it('selectActiveThread should return the active thread or null', () => {
      // No active thread
      const emptyState = { chat: createInitialState() }
      expect(selectActiveThread(emptyState)).toBeNull()

      // With active thread
      let chatState = createInitialState()
      chatState = chatReducer(chatState, createThread('openai'))
      const state = { chat: chatState }
      expect(selectActiveThread(state)).toBeTruthy()
      expect(selectActiveThread(state)?.providerId).toBe('openai')
    })

    it('selectActiveThreadMessages should return messages or empty array', () => {
      const emptyState = { chat: createInitialState() }
      expect(selectActiveThreadMessages(emptyState)).toEqual([])
    })

    it('selectIsAgentRunning should return the running state', () => {
      const state = { chat: { ...createInitialState(), isAgentRunning: true } }
      expect(selectIsAgentRunning(state)).toBe(true)
    })

    it('selectRunningThreadId should return the running thread ID', () => {
      const state = { chat: { ...createInitialState(), runningThreadId: 'thread-x' } }
      expect(selectRunningThreadId(state)).toBe('thread-x')
    })
  })
})
