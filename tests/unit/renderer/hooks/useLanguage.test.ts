/**
 * Tests for useLanguage hook.
 * Syncs language changes from the main process with i18n.
 * The hook calls window.app.onLanguageChange.
 */
import { renderHook } from '@testing-library/react'

// Mock react-i18next before importing the hook
const mockChangeLanguage = jest.fn()
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: {
      changeLanguage: mockChangeLanguage,
      language: 'en'
    },
    t: (key: string) => key
  })
}))

import { useLanguage } from '../../../../src/renderer/src/hooks/useLanguage'

describe('useLanguage', () => {
  beforeEach(() => {
    mockChangeLanguage.mockClear()
  })

  it('should subscribe to language changes on mount', () => {
    renderHook(() => useLanguage())

    expect(window.app.onLanguageChange).toHaveBeenCalledWith(expect.any(Function))
  })

  it('should call i18n.changeLanguage when language changes', () => {
    ;(window.app.onLanguageChange as jest.Mock).mockImplementation((callback: (lng: string) => void) => {
      callback('fr')
      return jest.fn()
    })

    renderHook(() => useLanguage())

    expect(mockChangeLanguage).toHaveBeenCalledWith('fr')
  })

  it('should clean up listener on unmount', () => {
    const unsubscribe = jest.fn()
    ;(window.app.onLanguageChange as jest.Mock).mockReturnValue(unsubscribe)

    const { unmount } = renderHook(() => useLanguage())

    unmount()
    expect(unsubscribe).toHaveBeenCalled()
  })
})
