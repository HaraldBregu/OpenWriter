/**
 * Tests for Badge UI component (shadcn/ui).
 * Renders a styled badge with variant support.
 */
import { render, screen } from '@testing-library/react'
import { Badge } from '../../../../src/renderer/src/components/ui/badge'

describe('Badge', () => {
  it('should render with children text', () => {
    render(<Badge>New</Badge>)

    expect(screen.getByText('New')).toBeInTheDocument()
  })

  it('should apply default variant classes', () => {
    render(<Badge>Default</Badge>)

    const badge = screen.getByText('Default')
    expect(badge.className).toContain('bg-primary')
  })

  it('should apply secondary variant classes', () => {
    render(<Badge variant="secondary">Secondary</Badge>)

    const badge = screen.getByText('Secondary')
    expect(badge.className).toContain('bg-secondary')
  })

  it('should apply destructive variant classes', () => {
    render(<Badge variant="destructive">Error</Badge>)

    const badge = screen.getByText('Error')
    expect(badge.className).toContain('bg-destructive')
  })

  it('should apply outline variant classes', () => {
    render(<Badge variant="outline">Outline</Badge>)

    const badge = screen.getByText('Outline')
    expect(badge.className).toContain('text-foreground')
  })

  it('should merge custom className', () => {
    render(<Badge className="custom-badge">Custom</Badge>)

    expect(screen.getByText('Custom').className).toContain('custom-badge')
  })

  it('should forward additional HTML attributes', () => {
    render(<Badge data-testid="my-badge">Test</Badge>)

    expect(screen.getByTestId('my-badge')).toBeInTheDocument()
  })
})
