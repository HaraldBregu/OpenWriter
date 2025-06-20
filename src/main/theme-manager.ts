import { ipcMain, nativeTheme } from 'electron'
import { mainLogger } from './shared/logger'
import { toolbarWebContentsViewSend, childWindowSend } from './main-window'
import { getWebContentsViews } from './content'

type Theme = 'light' | 'dark' | 'system'

let currentTheme: Theme = 'system'

/**
 * Initialize theme management in the main process
 */
export function initializeThemeManager(): void {
    // Load theme from storage or default to system
    currentTheme = 'system' // You can load from store here if needed
    applyTheme(currentTheme)

    // Register IPC handlers
    registerThemeHandlers()

    mainLogger.info('ThemeManager', 'Theme manager initialized')
}

/**
 * Apply theme to Electron's native theme
 */
function applyTheme(theme: Theme): void {
    const taskId = mainLogger.startTask('ThemeManager', `Applying theme: ${theme}`)

    try {
        switch (theme) {
            case 'light':
                nativeTheme.themeSource = 'light'
                break
            case 'dark':
                nativeTheme.themeSource = 'dark'
                break
            case 'system':
                nativeTheme.themeSource = 'system'
                break
        }

        currentTheme = theme

        // Notify toolbar about theme change
        toolbarWebContentsViewSend('theme-changed', theme)

        // Notify child windows (like preferences modal) about theme change
        childWindowSend('theme-changed', theme)

        // Notify all other WebContentsViews about theme change
        const webContentsViews = getWebContentsViews()
        webContentsViews.forEach(webContentsView => {
            webContentsView.webContents.send('theme-changed', theme)
        })

        mainLogger.endTask(taskId, 'ThemeManager', `Theme applied: ${theme}`)
    } catch (error) {
        mainLogger.error('ThemeManager', 'Error applying theme', error as Error)
    }
}

/**
 * Register IPC handlers for theme operations
 */
function registerThemeHandlers(): void {
    ipcMain.handle('theme:setTheme', async (_, theme: Theme) => {
        mainLogger.info('ThemeManager', `Theme change requested: ${theme}`)
        applyTheme(theme)
        return
    })

    ipcMain.handle('theme:getTheme', async () => {
        return currentTheme
    })
}

/**
 * Get current theme
 */
export function getCurrentTheme(): Theme {
    return currentTheme
} 