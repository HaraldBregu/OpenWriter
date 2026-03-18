/**
 * Language change syncing is now handled by the LanguageProvider in AppContext.
 * The LanguageProvider subscribes to window.app.onLanguageChange and calls
 * i18n.changeLanguage automatically. This hook is kept as a no-op for backward
 * compatibility with any existing call sites, but may be removed in a future cleanup.
 *
 * @deprecated Use useLanguageMode() and useAppActions().setLanguage() from contexts instead.
 */
export function useLanguage(): void {
	// Intentionally empty — language sync is managed by LanguageProvider.
}
