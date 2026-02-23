/**
 * Tests for HomePage.
 *
 * The page shows:
 *  - A time-based greeting heading
 *  - Category cards (Posts, Writing)
 *  - A Recent section with placeholder items
 *  - Documents and Integrations navigation cards
 *  - A PipelineTestSection (requires window.ai)
 *  - A tip section
 *
 * Strategy: render with a minimal Redux store and assert on visible text/roles.
 * We mock lucide-react and window.ai to avoid real IPC calls.
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HashRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import chatReducer from '../../../../src/renderer/src/store/chatSlice'
import postsReducer from '../../../../src/renderer/src/store/postsSlice'
import directoriesReducer from '../../../../src/renderer/src/store/directoriesSlice'

// Mock lucide-react to avoid SVG rendering complexity
jest.mock('lucide-react', () => {
  const icons = [
    'Newspaper', 'PenLine', 'FolderOpen', 'Puzzle',
    'ArrowRight', 'Clock', 'Star', 'Loader2', 'Square'
  ]
  const mocks: Record<string, (props: Record<string, unknown>) => React.ReactElement> = {}
  for (const name of icons) {
    mocks[name] = (props: Record<string, unknown>) =>
      React.createElement('svg', { ...props, 'data-testid': `icon-${name}` })
  }
  return mocks
})

// Install a minimal window.ai mock so PipelineTestSection initialises cleanly
beforeEach(() => {
  Object.defineProperty(window, 'ai', {
    value: {
      inference: jest.fn().mockResolvedValue({ success: true, data: { runId: 'r1' } }),
      cancel: jest.fn(),
      onEvent: jest.fn().mockReturnValue(jest.fn()),
      listAgents: jest.fn().mockResolvedValue({ success: true, data: [] }),
      listRuns: jest.fn().mockResolvedValue({ success: true, data: [] })
    },
    writable: true,
    configurable: true
  })
})

import HomePage from '../../../../src/renderer/src/pages/HomePage'

function renderHomePage() {
  const store = configureStore({
    reducer: {
      chat: chatReducer,
      posts: postsReducer,
      directories: directoriesReducer
    }
  })

  return render(
    <Provider store={store}>
      <HashRouter>
        <HomePage />
      </HashRouter>
    </Provider>
  )
}

describe('HomePage', () => {
  // ---- Greeting section ---------------------------------------------------

  it('should render a time-based greeting heading', () => {
    renderHomePage()

    const greetings = ['Good morning', 'Good afternoon', 'Good evening']
    const found = greetings.some((g) => screen.queryByText(g) !== null)
    expect(found).toBe(true)
  })

  it('should render the subtitle', () => {
    renderHomePage()

    expect(screen.getByText('What would you like to work on today?')).toBeInTheDocument()
  })

  // ---- Category cards -----------------------------------------------------

  it('should render the Posts category card', () => {
    renderHomePage()

    expect(screen.getByText('Posts')).toBeInTheDocument()
    expect(screen.getByText('Publish to your audience')).toBeInTheDocument()
  })

  it('should render the Writing category card', () => {
    renderHomePage()

    expect(screen.getByText('Writing')).toBeInTheDocument()
    expect(screen.getByText('Start a blank document')).toBeInTheDocument()
  })

  // ---- Recent items section -----------------------------------------------

  it('should render the Recent section label', () => {
    renderHomePage()

    expect(screen.getByText('Recent')).toBeInTheDocument()
  })

  it('should render placeholder recent items', () => {
    renderHomePage()

    // Titles from the static recentItems array in HomePage
    expect(screen.getByText('Q1 Strategy Brief')).toBeInTheDocument()
    expect(screen.getByText('Release Announcement')).toBeInTheDocument()
    expect(screen.getByText('Design Assets')).toBeInTheDocument()
  })

  it('should render "View all" link in the Recent section', () => {
    renderHomePage()

    expect(screen.getByText('View all')).toBeInTheDocument()
  })

  // ---- Documents & Integrations section -----------------------------------

  it('should render the Documents navigation card', () => {
    renderHomePage()

    expect(screen.getByText('Documents')).toBeInTheDocument()
    expect(screen.getByText('Browse your files')).toBeInTheDocument()
  })

  it('should render the Integrations navigation card', () => {
    renderHomePage()

    expect(screen.getByText('Integrations')).toBeInTheDocument()
    expect(screen.getByText('Connect your tools')).toBeInTheDocument()
  })

  // ---- Pipeline test section ----------------------------------------------

  it('should render the Pipeline test section', () => {
    renderHomePage()

    expect(screen.getByText('Pipeline test')).toBeInTheDocument()
    expect(screen.getByText('Run')).toBeInTheDocument()
  })

  it('should render the agent selector with Echo and Chat options', () => {
    renderHomePage()

    const select = screen.getByRole('combobox')
    expect(select).toBeInTheDocument()
    expect(screen.getByText('Echo (test)')).toBeInTheDocument()
    expect(screen.getByText('Chat (OpenAI)')).toBeInTheDocument()
  })

  // ---- Tip section --------------------------------------------------------

  it('should render the tip section', () => {
    renderHomePage()

    expect(screen.getByText('Tip')).toBeInTheDocument()
    expect(screen.getByText(/Use the sidebar to navigate/)).toBeInTheDocument()
  })
})
