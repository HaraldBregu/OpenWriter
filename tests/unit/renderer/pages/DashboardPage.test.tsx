/**
 * Smoke test for DashboardPage (Chat/AI page).
 * Tests both empty state (no active thread) and thread-with-messages state.
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import chatReducer, { createThread, addUserMessage, addAssistantMessage } from '../../../../src/renderer/src/store/chatSlice'

// Mock lucide-react
jest.mock('lucide-react', () => {
  const icons = [
    'Send', 'Square', 'Bot', 'User', 'AlertCircle', 'ChevronDown', 'Plus'
  ]
  const mocks: Record<string, (props: Record<string, unknown>) => React.ReactElement> = {}
  for (const name of icons) {
    mocks[name] = (props: Record<string, unknown>) => React.createElement('svg', { ...props, 'data-testid': `icon-${name}` })
  }
  return mocks
})

// Mock the MarkdownContent component
jest.mock('../../../../src/renderer/src/components/MarkdownContent', () => ({
  MarkdownContent: ({ content }: { content: string }) =>
    React.createElement('div', { 'data-testid': 'markdown-content' }, content)
}))

// Mock the useAgent hook
const mockRun = jest.fn()
const mockCancel = jest.fn()
jest.mock('../../../../src/renderer/src/hooks/useAgent', () => ({
  useAgent: () => ({
    isRunning: false,
    error: null,
    run: mockRun,
    cancel: mockCancel
  })
}))

import DashboardPage from '../../../../src/renderer/src/pages/DashboardPage'

function createStoreWithThread() {
  const store = configureStore({
    reducer: { chat: chatReducer }
  })
  store.dispatch(createThread('openai'))
  return store
}

function createStoreWithMessages() {
  const store = createStoreWithThread()
  const threadId = store.getState().chat.threads[0].id
  store.dispatch(addUserMessage({ threadId, content: 'Hello AI' }))
  store.dispatch(addAssistantMessage({ threadId }))
  return store
}

describe('DashboardPage', () => {
  beforeEach(() => {
    mockRun.mockClear()
    mockCancel.mockClear()
  })

  describe('empty state (no active thread)', () => {
    it('should show the empty state message', () => {
      const store = configureStore({
        reducer: { chat: chatReducer }
      })

      render(
        <Provider store={store}>
          <DashboardPage />
        </Provider>
      )

      expect(screen.getByText('No thread selected')).toBeInTheDocument()
      expect(screen.getByText(/Create a new thread/)).toBeInTheDocument()
    })

    it('should show New Thread button in empty state', () => {
      const store = configureStore({
        reducer: { chat: chatReducer }
      })

      render(
        <Provider store={store}>
          <DashboardPage />
        </Provider>
      )

      expect(screen.getByText('New Thread')).toBeInTheDocument()
    })

    it('should create a thread when New Thread is clicked', async () => {
      const store = configureStore({
        reducer: { chat: chatReducer }
      })
      const user = userEvent.setup()

      render(
        <Provider store={store}>
          <DashboardPage />
        </Provider>
      )

      await user.click(screen.getByText('New Thread'))

      expect(store.getState().chat.threads).toHaveLength(1)
    })
  })

  describe('with active thread', () => {
    it('should show the input textarea', () => {
      const store = createStoreWithThread()

      render(
        <Provider store={store}>
          <DashboardPage />
        </Provider>
      )

      expect(screen.getByPlaceholderText(/Message the AI/)).toBeInTheDocument()
    })

    it('should show AI disclaimer', () => {
      const store = createStoreWithThread()

      render(
        <Provider store={store}>
          <DashboardPage />
        </Provider>
      )

      expect(screen.getByText(/AI can make mistakes/)).toBeInTheDocument()
    })

    it('should show empty conversation prompt when no messages', () => {
      const store = createStoreWithThread()

      render(
        <Provider store={store}>
          <DashboardPage />
        </Provider>
      )

      // Use getAllByText since the text may appear in multiple elements
      const elements = screen.getAllByText(/Start the conversation/)
      expect(elements.length).toBeGreaterThanOrEqual(1)
    })

    it('should show the provider selector', () => {
      const store = createStoreWithThread()

      render(
        <Provider store={store}>
          <DashboardPage />
        </Provider>
      )

      // The default provider for the thread we created is 'openai'
      expect(screen.getByText('OpenAI')).toBeInTheDocument()
    })
  })

  describe('with messages', () => {
    it('should render user message content', () => {
      const store = createStoreWithMessages()

      render(
        <Provider store={store}>
          <DashboardPage />
        </Provider>
      )

      // "Hello AI" may appear in both the thread title and the message bubble
      const elements = screen.getAllByText('Hello AI')
      expect(elements.length).toBeGreaterThanOrEqual(1)
    })
  })
})
