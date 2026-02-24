/**
 * Tests for CopyButton component.
 * One-shot copy-to-clipboard button with visual feedback.
 * The component calls window.clipboard.writeText.
 */
import React from 'react'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CopyButton } from '../../../../src/renderer/src/components/CopyButton'

// Mock lucide-react
jest.mock('lucide-react', () => ({
  Copy: (props: Record<string, unknown>) => React.createElement('svg', { ...props, 'data-testid': 'copy-icon' }),
  Check: (props: Record<string, unknown>) => React.createElement('svg', { ...props, 'data-testid': 'check-icon' })
}))

describe('CopyButton', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should render with Copy text initially', () => {
    render(<CopyButton text="hello" />)

    expect(screen.getByText('Copy')).toBeInTheDocument()
    expect(screen.getByTitle('Copy code')).toBeInTheDocument()
  })

  it('should call window.clipboard.writeText when clicked', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    render(<CopyButton text="hello world" />)

    await user.click(screen.getByTitle('Copy code'))

    expect(window.clipboard.writeText).toHaveBeenCalledWith('hello world')
  })

  it('should show Copied text after click', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    render(<CopyButton text="test" />)

    await user.click(screen.getByTitle('Copy code'))

    expect(screen.getByText('Copied')).toBeInTheDocument()
  })

  it('should revert to Copy text after timeout', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    render(<CopyButton text="test" />)

    await user.click(screen.getByTitle('Copy code'))

    expect(screen.getByText('Copied')).toBeInTheDocument()

    // Advance past the 1500ms timeout and flush React state updates
    await act(async () => {
      jest.advanceTimersByTime(2000)
    })

    expect(screen.getByText('Copy')).toBeInTheDocument()
  })
})
