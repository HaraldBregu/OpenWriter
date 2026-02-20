/**
 * Tests for Input UI component (shadcn/ui).
 * Renders a styled input element.
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '../../../../src/renderer/src/components/ui/input'

describe('Input', () => {
  it('should render an input element', () => {
    render(<Input placeholder="Enter text" />)

    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
  })

  it('should apply the correct type', () => {
    render(<Input type="email" placeholder="Email" />)

    expect(screen.getByPlaceholderText('Email')).toHaveAttribute('type', 'email')
  })

  it('should default to text type when no type specified', () => {
    render(<Input placeholder="Default" />)

    // Input without explicit type renders as text
    const input = screen.getByPlaceholderText('Default')
    expect(input.getAttribute('type')).toBeNull()
  })

  it('should handle value changes', async () => {
    const onChange = jest.fn()
    const user = userEvent.setup()

    render(<Input placeholder="Type here" onChange={onChange} />)

    await user.type(screen.getByPlaceholderText('Type here'), 'hello')

    expect(onChange).toHaveBeenCalled()
  })

  it('should be disabled when disabled prop is set', () => {
    render(<Input disabled placeholder="Disabled" />)

    expect(screen.getByPlaceholderText('Disabled')).toBeDisabled()
  })

  it('should merge custom className', () => {
    render(<Input className="custom-input" placeholder="Custom" />)

    expect(screen.getByPlaceholderText('Custom').className).toContain('custom-input')
  })

  it('should forward ref', () => {
    const ref = React.createRef<HTMLInputElement>()

    render(<Input ref={ref} placeholder="Ref" />)

    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })
})
