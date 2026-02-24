import { useTheme } from '../hooks/useTheme'

/**
 * Renders nothing. Exists purely to call useTheme() at the correct level in
 * the component tree — inside AppProvider (needs context) but outside the
 * router (must run for every route, including the standalone WelcomePage).
 *
 * DO NOT call useTheme() anywhere else (e.g. AppLayout). A single mounted
 * instance of this component owns all three theme side-effects:
 *  1. Applying the CSS class to <html> whenever the stored ThemeMode changes.
 *  2. Tracking OS colour-scheme changes when mode is "system".
 *  3. Subscribing to IPC theme-change events from the Electron main process.
 */
export function ThemeApplicator(): null {
  useTheme()
  return null
}
