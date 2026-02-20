/**
 * Tests for Button UI component (shadcn/ui).
 * Renders a styled button with variant and size props.
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../../../../src/renderer/src/components/ui/button'

describe('Button', () => {
  it('should render with children text', () => {
    render(<Button>Click me</Button>)

    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('should apply default variant classes', () => {
    render(<Button>Default</Button>)

    const button = screen.getByRole('button')
    expect(button.className).toContain('bg-primary')
  })

  it('should apply destructive variant classes', () => {
    render(<Button variant="destructive">Delete</Button>)

    const button = screen.getByRole('button')
    expect(button.className).toContain('bg-destructive')
  })

  it('should apply outline variant classes', () => {
    render(<Button variant="outline">Outline</Button>)

    const button = screen.getByRole('button')
    expect(button.className).toContain('border')
  })

  it('should apply ghost variant classes', () => {
    render(<Button variant="ghost">Ghost</Button>)

    const button = screen.getByRole('button')
    expect(button.className).toContain('hover:bg-accent')
  })

  it('should apply size classes', () => {
    render(<Button size="sm">Small</Button>)

    const button = screen.getByRole('button')
    expect(button.className).toContain('h-9')
  })

  it('should apply icon size classes', () => {
    render(<Button size="icon">I</Button>)

    const button = screen.getByRole('button')
    expect(button.className).toContain('w-10')
  })

  it('should forward click handler', async () => {
    const onClick = jest.fn()
    const user = userEvent.setup()

    render(<Button onClick={onClick}>Click</Button>)

    await user.click(screen.getByRole('button'))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('should be disabled when disabled prop is set', () => {
    render(<Button disabled>Disabled</Button>)

    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('should merge custom className', () => {
    render(<Button className="custom-class">Custom</Button>)

    expect(screen.getByRole('button').className).toContain('custom-class')
  })

  it('should render as child element when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    )

    const link = screen.getByRole('link', { name: 'Link Button' })
    expect(link).toBeInTheDocument()
    expect(link.tagName).toBe('A')
  })

  it('should forward ref', () => {
    const ref = React.createRef<HTMLButtonElement>()

    render(<Button ref={ref}>Ref</Button>)

    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })
})
