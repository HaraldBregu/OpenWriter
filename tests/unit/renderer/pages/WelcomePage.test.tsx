/**
 * Tests for WelcomePage.
 *
 * The page shows:
 *  - A TitleBar with the app title
 *  - A hero section (logo, app name, plan info)
 *  - An "Open Workspace" card with a Browse button
 *  - A Recent Projects section (conditionally shown when projects exist)
 *
 * Strategy: render with a minimal Redux store and mock all window.workspace calls
 * so tests are pure React/DOM assertions without real IPC.
 * The component uses window.workspace.* namespace.
 */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HashRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import chatReducer from '../../../../src/renderer/src/store/chatSlice'
import postsReducer from '../../../../src/renderer/src/store/postsSlice'
import directoriesReducer from '../../../../src/renderer/src/store/directoriesSlice'

// Mock lucide-react icons used in this page
jest.mock('lucide-react', () => {
  const icons = ['FolderOpen', 'Clock', 'X']
  const mocks: Record<string, (props: Record<string, unknown>) => React.ReactElement> = {}
  for (const name of icons) {
    mocks[name] = (props: Record<string, unknown>) =>
      React.createElement('svg', { ...props, 'data-testid': `icon-${name}` })
  }
  return mocks
})

// Mock TitleBar — it calls window.win internally
jest.mock('../../../../src/renderer/src/components/TitleBar', () => ({
  TitleBar: ({ title }: { title?: string }) =>
    React.createElement('div', { 'data-testid': 'title-bar' }, title || 'TitleBar')
}))

// Mock logo import (handled as a static asset)
jest.mock('@resources/icons/icon.png', () => 'test-logo.png')

// Mock usePostsLoader so the page doesn't try to load real posts
jest.mock('../../../../src/renderer/src/hooks/usePostsLoader', () => ({
  reloadPostsFromWorkspace: jest.fn().mockResolvedValue(undefined)
}))

import WelcomePage from '../../../../src/renderer/src/pages/WelcomePage'

function renderWelcomePage() {
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
        <WelcomePage />
      </HashRouter>
    </Provider>
  )
}

describe('WelcomePage', () => {
  beforeEach(() => {
    // Default: no recent projects, directory exists
    ;(window.workspace.getRecent as jest.Mock).mockResolvedValue([])
    ;(window.workspace.directoryExists as jest.Mock).mockResolvedValue(true)
    ;(window.workspace.selectFolder as jest.Mock).mockResolvedValue(null)
    ;(window.workspace.setCurrent as jest.Mock).mockResolvedValue(undefined)
  })

  // ---- Hero section --------------------------------------------------------

  it('should render the app title in the heading', () => {
    renderWelcomePage()

    // h1 heading
    expect(screen.getByRole('heading', { name: /OpenWriter/i })).toBeInTheDocument()
  })

  it('should render the title bar', () => {
    renderWelcomePage()

    expect(screen.getByTestId('title-bar')).toBeInTheDocument()
  })

  it('should render the app logo', () => {
    renderWelcomePage()

    const img = screen.getByAltText('Tesseract AI')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'test-logo.png')
  })

  it('should show Free Plan indicator', () => {
    renderWelcomePage()

    expect(screen.getByText(/Free Plan/)).toBeInTheDocument()
    expect(screen.getByText(/Upgrade to Pro/)).toBeInTheDocument()
  })

  // ---- Open Workspace card -------------------------------------------------

  it('should render the Open Workspace heading', () => {
    renderWelcomePage()

    expect(screen.getByRole('heading', { name: /Open Workspace/i })).toBeInTheDocument()
  })

  it('should render the Browse button', () => {
    renderWelcomePage()

    expect(screen.getByText('Browse...')).toBeInTheDocument()
  })

  it('should call window.workspace.getRecent on mount', () => {
    renderWelcomePage()

    expect(window.workspace.getRecent).toHaveBeenCalled()
  })

  it('should NOT show Recent Projects section when the list is empty', () => {
    renderWelcomePage()

    expect(screen.queryByText(/Recent Projects/i)).not.toBeInTheDocument()
  })

  // ---- Recent projects section (async) ------------------------------------

  it('should display recent projects when available', async () => {
    ;(window.workspace.getRecent as jest.Mock).mockResolvedValue([
      { path: '/Users/test/projects/my-app', lastOpened: Date.now() },
      { path: '/Users/test/projects/other', lastOpened: Date.now() - 60_000 }
    ])

    renderWelcomePage()

    await waitFor(() => {
      expect(screen.getByText('my-app')).toBeInTheDocument()
    })

    expect(screen.getByText('other')).toBeInTheDocument()
    expect(screen.getByText(/Recent Projects/i)).toBeInTheDocument()
  })

  it('should show (Not Found) for projects whose directory no longer exists', async () => {
    ;(window.workspace.getRecent as jest.Mock).mockResolvedValue([
      { path: '/Users/test/projects/gone', lastOpened: Date.now() }
    ])
    ;(window.workspace.directoryExists as jest.Mock).mockResolvedValue(false)

    renderWelcomePage()

    await waitFor(() => {
      expect(screen.getByText(/Not Found/i)).toBeInTheDocument()
    })
  })

  // ---- Browse button interaction -------------------------------------------

  it('should call window.workspace.selectFolder when Browse button is clicked', async () => {
    const user = userEvent.setup()
    renderWelcomePage()

    await user.click(screen.getByText('Browse...'))

    expect(window.workspace.selectFolder).toHaveBeenCalled()
  })
})
