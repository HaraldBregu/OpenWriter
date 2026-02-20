/**
 * Smoke test for HomePage.
 * Verifies the page renders its main sections: greeting, quick actions, recent items.
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { HashRouter } from 'react-router-dom'

// Mock lucide-react to avoid SVG rendering complexity
jest.mock('lucide-react', () => {
  const icons = [
    'Newspaper', 'PenLine', 'StickyNote', 'MessageSquare', 'FolderOpen',
    'Puzzle', 'ArrowRight', 'Clock', 'Star'
  ]
  const mocks: Record<string, (props: Record<string, unknown>) => React.ReactElement> = {}
  for (const name of icons) {
    mocks[name] = (props: Record<string, unknown>) => React.createElement('svg', { ...props, 'data-testid': `icon-${name}` })
  }
  return mocks
})

import HomePage from '../../../../src/renderer/src/pages/HomePage'

function renderHomePage() {
  return render(
    <HashRouter>
      <HomePage />
    </HashRouter>
  )
}

describe('HomePage', () => {
  it('should render a greeting message', () => {
    renderHomePage()

    // The greeting depends on the time of day
    const greetings = ['Good morning', 'Good afternoon', 'Good evening']
    const found = greetings.some(g => screen.queryByText(g) !== null)
    expect(found).toBe(true)
  })

  it('should render the subtitle text', () => {
    renderHomePage()

    expect(screen.getByText('What would you like to work on today?')).toBeInTheDocument()
  })

  it('should render quick action cards', () => {
    renderHomePage()

    expect(screen.getByText('New Writing')).toBeInTheDocument()
    expect(screen.getByText('New Note')).toBeInTheDocument()
    expect(screen.getByText('New Post')).toBeInTheDocument()
    expect(screen.getByText('Messages')).toBeInTheDocument()
  })

  it('should render recent items section', () => {
    renderHomePage()

    expect(screen.getByText('Q1 Strategy Brief')).toBeInTheDocument()
    expect(screen.getByText('Product Ideas')).toBeInTheDocument()
    expect(screen.getByText('Release Announcement')).toBeInTheDocument()
    expect(screen.getByText('Design Assets')).toBeInTheDocument()
  })

  it('should render explore section', () => {
    renderHomePage()

    expect(screen.getByText('Documents')).toBeInTheDocument()
    expect(screen.getByText('Integrations')).toBeInTheDocument()
  })

  it('should render the tip section', () => {
    renderHomePage()

    expect(screen.getByText('Tip')).toBeInTheDocument()
    expect(screen.getByText(/Use the sidebar to navigate/)).toBeInTheDocument()
  })

  it('should render View all link', () => {
    renderHomePage()

    expect(screen.getByText('View all')).toBeInTheDocument()
  })
})
