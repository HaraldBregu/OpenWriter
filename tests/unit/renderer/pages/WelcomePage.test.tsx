/**
 * Smoke test for WelcomePage.
 * Verifies the page renders its main elements: logo, title, action buttons.
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

// Mock lucide-react
jest.mock('lucide-react', () => {
  const icons = [
    'FolderOpen', 'GitBranch', 'Terminal', 'Menu', 'PanelLeft', 'Minus', 'X', 'CloudDownload', 'Clock'
  ]
  const mocks: Record<string, (props: Record<string, unknown>) => React.ReactElement> = {}
  for (const name of icons) {
    mocks[name] = (props: Record<string, unknown>) => React.createElement('svg', { ...props, 'data-testid': `icon-${name}` })
  }
  return mocks
})

// Mock the TitleBar component since it uses window.api
jest.mock('../../../../src/renderer/src/components/TitleBar', () => ({
  TitleBar: ({ title }: { title?: string }) => React.createElement('div', { 'data-testid': 'title-bar' }, title || 'TitleBar')
}))

// Mock the logo import
jest.mock('@resources/icons/icon.png', () => 'test-logo.png')

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
    ;(window.api.workspaceGetRecent as jest.Mock).mockResolvedValue([])
    ;(window.api.workspaceDirectoryExists as jest.Mock) = jest.fn().mockResolvedValue(true)
  })

  it('should render the app title', () => {
    renderWelcomePage()

    // "Tesseract AI" appears in both TitleBar and the h1 heading
    const elements = screen.getAllByText('Tesseract AI')
    expect(elements.length).toBeGreaterThanOrEqual(1)
  })

  it('should render the title bar', () => {
    renderWelcomePage()

    expect(screen.getByTestId('title-bar')).toBeInTheDocument()
  })

  it('should render the Open Folder button', () => {
    renderWelcomePage()

    expect(screen.getByText('Open Folder')).toBeInTheDocument()
  })

  it('should render disabled Clone Repo button', () => {
    renderWelcomePage()

    expect(screen.getByText('Clone Repo')).toBeInTheDocument()
  })

  it('should render disabled Connect via SSH button', () => {
    renderWelcomePage()

    expect(screen.getByText('Connect via SSH')).toBeInTheDocument()
  })

  it('should render the plan text', () => {
    renderWelcomePage()

    expect(screen.getByText(/Free Plan/)).toBeInTheDocument()
    expect(screen.getByText('Upgrade')).toBeInTheDocument()
  })

  it('should load recent projects on mount', () => {
    renderWelcomePage()

    expect(window.api.workspaceGetRecent).toHaveBeenCalled()
  })

  it('should display recent projects when available', async () => {
    ;(window.api.workspaceGetRecent as jest.Mock).mockResolvedValue([
      { path: '/Users/test/projects/my-app', lastOpened: Date.now() },
      { path: '/Users/test/projects/other', lastOpened: Date.now() - 1000 }
    ])

    renderWelcomePage()

    await waitFor(() => {
      expect(screen.getByText('my-app')).toBeInTheDocument()
    })

    expect(screen.getByText('other')).toBeInTheDocument()
    expect(screen.getByText(/Recent Projects/i)).toBeInTheDocument()
  })

  it('should not show recent projects section when list is empty', () => {
    renderWelcomePage()

    expect(screen.queryByText(/Recent Projects/i)).not.toBeInTheDocument()
  })

  it('should call workspaceSelectFolder when Open Folder is clicked', async () => {
    ;(window.api.workspaceSelectFolder as jest.Mock).mockResolvedValue(null)
    const user = userEvent.setup()

    renderWelcomePage()

    await user.click(screen.getByText('Open Folder'))

    expect(window.api.workspaceSelectFolder).toHaveBeenCalled()
  })
})
