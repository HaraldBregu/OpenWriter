/**
 * Tests for LoadingSkeleton component.
 *
 * A simple loading indicator used as Suspense fallback throughout the app.
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { LoadingSkeleton } from '../../../../src/renderer/src/components/LoadingSkeleton'

describe('LoadingSkeleton', () => {
  it('should render the loading text', () => {
    // Act
    render(<LoadingSkeleton />)

    // Assert
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('should render the spinner element', () => {
    // Act
    const { container } = render(<LoadingSkeleton />)

    // Assert - look for the animated spinner div
    const spinner = container.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })
})
