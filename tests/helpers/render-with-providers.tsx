/**
 * Helper to render React components with all required providers.
 *
 * Wraps the component under test with:
 *   - Redux Provider (with configurable initial state)
 *   - HashRouter (for React Router)
 *
 * Usage:
 *   const { getByText } = renderWithProviders(<MyComponent />, {
 *     preloadedState: { chat: { threads: [], activeThreadId: null, isAgentRunning: false, runningThreadId: null } }
 *   })
 */
import React from 'react'
import { render, type RenderOptions, type RenderResult } from '@testing-library/react'
import { configureStore, type EnhancedStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { HashRouter } from 'react-router-dom'
import chatReducer from '../../src/renderer/src/store/chatSlice'
import type { RootState } from '../../src/renderer/src/store'

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  preloadedState?: Partial<RootState>
  store?: EnhancedStore
  withRouter?: boolean
}

/**
 * Creates a Redux store with optional pre-loaded state.
 * Useful for tests that need to assert on store state directly.
 */
export function createTestStore(preloadedState?: Partial<RootState>): EnhancedStore {
  return configureStore({
    reducer: {
      chat: chatReducer
    },
    preloadedState
  })
}

/**
 * Renders a React component with Redux and Router providers.
 * Returns the standard RTL render result plus the store instance
 * for direct state assertions.
 */
export function renderWithProviders(
  ui: React.ReactElement,
  {
    preloadedState,
    store = createTestStore(preloadedState),
    withRouter = true,
    ...renderOptions
  }: ExtendedRenderOptions = {}
): RenderResult & { store: EnhancedStore } {
  function Wrapper({ children }: { children: React.ReactNode }): React.ReactElement {
    const content = <Provider store={store}>{children}</Provider>
    if (withRouter) {
      return <HashRouter>{content}</HashRouter>
    }
    return content
  }

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions })
  }
}
