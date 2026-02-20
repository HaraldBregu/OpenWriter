/**
 * Tests for the cn() utility function.
 *
 * cn() combines clsx (conditional class names) with tailwind-merge
 * (deduplicates conflicting Tailwind classes).
 */

import { cn } from '../../../../src/renderer/src/lib/utils'

describe('cn', () => {
  it('should combine class names', () => {
    const result = cn('text-red-500', 'font-bold')
    expect(result).toBe('text-red-500 font-bold')
  })

  it('should handle conditional classes', () => {
    const isActive = true
    const isDisabled = false
    const result = cn('base', isActive && 'active', isDisabled && 'disabled')
    expect(result).toBe('base active')
  })

  it('should merge conflicting Tailwind classes (last wins)', () => {
    // tailwind-merge should resolve p-4 vs p-2 to the last one
    const result = cn('p-4', 'p-2')
    expect(result).toBe('p-2')
  })

  it('should handle arrays of class names', () => {
    const result = cn(['text-sm', 'font-bold'])
    expect(result).toContain('text-sm')
    expect(result).toContain('font-bold')
  })

  it('should handle undefined and null gracefully', () => {
    const result = cn('base', undefined, null, 'extra')
    expect(result).toBe('base extra')
  })

  it('should return empty string for no input', () => {
    const result = cn()
    expect(result).toBe('')
  })
})
