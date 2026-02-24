/**
 * Tests for HomePage.
 *
 * The page shows:
 *  - A time-based greeting heading
 *  - Subtitle text
 *  - Category cards (Posts, Writing)
 *  - A Recent section with placeholder items (Q1 Strategy Brief, Release Announcement, Design Assets)
 *  - A "View all" link
 *  - Documents and Integrations navigation cards
 *  - A Tip section
 *
 * Strategy: render with a minimal Redux store and assert on visible text/roles.
 * The component does not call any window.* APIs directly.
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
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

  // ---- Tip section --------------------------------------------------------

  it('should render the tip section', () => {
    renderHomePage()

    expect(screen.getByText('Tip')).toBeInTheDocument()
    expect(screen.getByText(/Use the sidebar to navigate/)).toBeInTheDocument()
  })
})
