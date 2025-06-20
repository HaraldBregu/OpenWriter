import { useTheme as useThemeOriginal } from '../providers/theme-provider'

export const useTheme = () => {
    const { theme, setTheme } = useThemeOriginal()

    const isDark = theme === 'dark' || (theme === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)

    const isLight = theme === 'light' || (theme === 'system' &&
        !window.matchMedia('(prefers-color-scheme: dark)').matches)

    const toggleTheme = () => {
        setTheme(isDark ? 'light' : 'dark')
    }

    return {
        theme,
        setTheme,
        isDark,
        isLight,
        toggleTheme,
    }
} 