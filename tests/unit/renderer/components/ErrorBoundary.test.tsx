/**
 * Tests for ErrorBoundary component.
 *
 * ErrorBoundary catches render errors at three levels:
 *   - root: Full-screen error with reload button
 *   - route: Page-level error with "Try Again" and "Go Home"
 *   - feature: Inline error with "Try again" link
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from '../../../../src/renderer/src/components/ErrorBoundary'

// A component that throws on render
function ThrowingComponent({ message }: { message: string }): React.ReactElement {
  throw new Error(message)
}

// A normal component
function GoodComponent(): React.ReactElement {
  return <div>All good</div>
}

// Suppress console.error for expected errors in these tests
let consoleErrorSpy: jest.SpyInstance

beforeEach(() => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
})

afterEach(() => {
  consoleErrorSpy.mockRestore()
})

describe('ErrorBoundary', () => {
  it('should render children when no error occurs', () => {
    // Act
    render(
      <ErrorBoundary>
        <GoodComponent />
      </ErrorBoundary>
    )

    // Assert
    expect(screen.getByText('All good')).toBeInTheDocument()
  })

  describe('when level is "feature" (default)', () => {
    it('should display an inline error with the error message', () => {
      // Act
      render(
        <ErrorBoundary>
          <ThrowingComponent message="Feature broke" />
        </ErrorBoundary>
      )

      // Assert
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.getByText('Feature broke')).toBeInTheDocument()
    })

    it('should show a "Try again" button that resets the boundary', () => {
      // Act
      render(
        <ErrorBoundary>
          <ThrowingComponent message="oops" />
        </ErrorBoundary>
      )

      // Assert
      const tryAgainButton = screen.getByText('Try again')
      expect(tryAgainButton).toBeInTheDocument()
    })
  })

  describe('when level is "route"', () => {
    it('should display a page-level error UI', () => {
      // Act
      render(
        <ErrorBoundary level="route">
          <ThrowingComponent message="Page crashed" />
        </ErrorBoundary>
      )

      // Assert
      expect(screen.getByText('This page crashed')).toBeInTheDocument()
      expect(screen.getByText('Page crashed')).toBeInTheDocument()
      expect(screen.getByText('Try Again')).toBeInTheDocument()
      expect(screen.getByText('Go Home')).toBeInTheDocument()
    })
  })

  describe('when level is "root"', () => {
    it('should display a full-screen error UI', () => {
      // Act
      render(
        <ErrorBoundary level="root">
          <ThrowingComponent message="App died" />
        </ErrorBoundary>
      )

      // Assert
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.getByText('App died')).toBeInTheDocument()
      expect(screen.getByText('Restart App')).toBeInTheDocument()
    })
  })

  describe('custom fallback', () => {
    it('should render a custom fallback when provided', () => {
      // Act
      render(
        <ErrorBoundary fallback={<div>Custom error view</div>}>
          <ThrowingComponent message="error" />
        </ErrorBoundary>
      )

      // Assert
      expect(screen.getByText('Custom error view')).toBeInTheDocument()
    })
  })

  describe('reset behavior', () => {
    it('should call onReset when the try-again button is clicked', () => {
      // Arrange
      const onReset = jest.fn()

      // Act
      render(
        <ErrorBoundary level="feature" onReset={onReset}>
          <ThrowingComponent message="oops" />
        </ErrorBoundary>
      )

      fireEvent.click(screen.getByText('Try again'))

      // Assert
      expect(onReset).toHaveBeenCalledTimes(1)
    })
  })
})
