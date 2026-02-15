import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Hook to handle language changes from the main process
 * Syncs language changes with i18n
 */
export function useLanguage(): void {
  const { i18n } = useTranslation()

  useEffect(() => {
    const cleanup = window.api.onLanguageChange((lng: string) => {
      i18n.changeLanguage(lng)
    })
    return cleanup
  }, [i18n])
}
