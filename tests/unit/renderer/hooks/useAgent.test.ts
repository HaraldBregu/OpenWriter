/**
 * Tests for useAgent hook.
 * Manages AI agent run/cancel lifecycle with Redux integration.
 */
import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import chatReducer from '../../../../src/renderer/src/store/chatSlice'
import { createThread } from '../../../../src/renderer/src/store/chatSlice'
import { useAgent } from '../../../../src/renderer/src/hooks/useAgent'

function createWrapper() {
  const store = configureStore({
    reducer: { chat: chatReducer }
  })
  // Create a thread so there's an active thread
  store.dispatch(createThread('openai'))

  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(Provider, { store }, children)
  }

  return { store, Wrapper }
}

describe('useAgent', () => {
  it('should initialize with isRunning false and no error', () => {
    const { Wrapper } = createWrapper()

    const { result } = renderHook(() => useAgent(), { wrapper: Wrapper })

    expect(result.current.isRunning).toBe(false)
    expect(result.current.error).toBeNull()
    expect(typeof result.current.run).toBe('function')
    expect(typeof result.current.cancel).toBe('function')
  })

  describe('run', () => {
    it('should dispatch messages and call agentRun', async () => {
      const { Wrapper, store } = createWrapper()
      const activeThread = store.getState().chat.threads[0]

      const { result } = renderHook(() => useAgent(), { wrapper: Wrapper })

      await act(async () => {
        await result.current.run(
          'Hello',
          activeThread.id,
          [],
          'openai'
        )
      })

      expect(window.api.agentRun).toHaveBeenCalled()
      expect(window.api.onAgentEvent).toHaveBeenCalled()

      // Should have dispatched addUserMessage and addAssistantMessage
      const state = store.getState().chat
      const thread = state.threads.find(t => t.id === activeThread.id)
      expect(thread).toBeDefined()
      // At minimum there should be messages added
      expect(thread!.messages.length).toBeGreaterThanOrEqual(2)
    })

    it('should not run if already running (ref guard)', async () => {
      const { Wrapper, store } = createWrapper()
      const activeThread = store.getState().chat.threads[0]

      // Make agentRun hang so the first call doesn't complete
      ;(window.api.agentRun as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // never resolves
      )

      const { result } = renderHook(() => useAgent(), { wrapper: Wrapper })

      // Start first run (won't complete)
      act(() => {
        result.current.run('Hello', activeThread.id, [], 'openai')
      })

      // Attempt second run immediately - should be blocked by ref guard
      const callsBefore = (window.api.agentRun as jest.Mock).mock.calls.length

      await act(async () => {
        await result.current.run('Second', activeThread.id, [], 'openai')
      })

      // Should still have just the one call
      expect((window.api.agentRun as jest.Mock).mock.calls.length).toBe(callsBefore)
    })
  })

  describe('cancel', () => {
    it('should call agentCancel and reset running state', async () => {
      const { Wrapper, store } = createWrapper()
      const activeThread = store.getState().chat.threads[0]

      // Make agentRun hang
      ;(window.api.agentRun as jest.Mock).mockImplementation(
        () => new Promise(() => {})
      )

      const { result } = renderHook(() => useAgent(), { wrapper: Wrapper })

      // Start a run
      act(() => {
        result.current.run('Hello', activeThread.id, [], 'openai')
      })

      // Cancel it
      act(() => {
        result.current.cancel()
      })

      expect(window.api.agentCancel).toHaveBeenCalled()
      // After cancel, isRunning should be false
      expect(result.current.isRunning).toBe(false)
    })
  })
})
