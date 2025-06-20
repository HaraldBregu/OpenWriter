import { app, BaseWindow, WebContentsView } from "electron";
import path from 'path'
import fs from 'fs'
import { is } from "@electron-toolkit/utils";
import { mainLogger } from "./shared/logger";
import { OnBaseWindowReady } from "./shared/types";
import { BrowserWindow, BrowserWindowConstructorOptions } from "electron";
import { createToolbarWebContentsView } from "./toolbar";
import { resetTabs } from "./store";

let baseWindow: BaseWindow | null = null
let childWindow: BrowserWindow | null = null
let toolbarWebContentsView: WebContentsView | null = null

export const getBaseWindow = (): BaseWindow | null => baseWindow
export const getToolbarWebContentsView = (): WebContentsView | null => toolbarWebContentsView
export const getChildWindow = (): BrowserWindow | null => childWindow

export async function initializeMainWindow(onDone: OnBaseWindowReady): Promise<void> {

    resetTabs()

    let iconPath = is.dev
        ? path.join(app.getAppPath(), 'buildResources', 'appIcons', 'icon.ico')
        : path.join(process.resourcesPath, 'buildResources', 'appIcons', 'app.ico');

    if (fs.existsSync(iconPath) === false) {
        mainLogger.error('------', '----------------------------------------------------------')
        mainLogger.error('DEBUG', `Icon path does not exist: ${iconPath}`)
        // Prova un percorso alternativo se il primo non esiste
        const altIconPath = path.join(app.getAppPath(), 'buildResources', 'build', 'icon.ico');
        if (fs.existsSync(altIconPath)) {
            mainLogger.info('DEBUG', `Using alternative icon path: ${altIconPath}`)
            iconPath = altIconPath;
        } else {
            mainLogger.error('DEBUG', `Alternative icon path also does not exist: ${altIconPath}`)
        }
        mainLogger.error('------', '----------------------------------------------------------')
    } else {
        mainLogger.info('DEBUG', `Icon found at: ${iconPath}`)
    }

    baseWindow = new BaseWindow({
        width: 1500,
        height: 1000,
        icon: iconPath,
        show: false,
        trafficLightPosition: {
            x: 9,
            y: 9
        },
        backgroundColor: '#FFFFFF',
    })

    app.on('activate', () => {
        showWindow()
    })

    app.on('before-quit', () => {
    })

    toolbarWebContentsView = await createToolbarWebContentsView(baseWindow)
    if (!toolbarWebContentsView)
        return

    baseWindow.contentView.addChildView(toolbarWebContentsView)

    showWindow()
    onDone(baseWindow)
}

export function toolbarWebContentsViewSend(message: string, ...args: unknown[]): void {
    toolbarWebContentsView?.webContents.send(message, ...args)
}

export function childWindowSend(message: string, ...args: unknown[]): void {
    childWindow?.webContents.send(message, ...args)
}

export function closeChildWindow(): void {
    if (childWindow) {
        childWindow.close();
        childWindow = null;
    }
}

export function showWindow(): void {
    if (!baseWindow)
        return

    //? This is to prevent the window from gaining focus everytime we make a change in code.
    if (!is.dev && !process.env['ELECTRON_RENDERER_URL']) {
        baseWindow!.show()
        return
    }

    if (!baseWindow.isVisible()) {
        baseWindow!.show()
    }
}

/**
 * @param pageUrl - The URL of the page to open.
 * @param options - The options for the sub window.
 * @returns A promise that resolves when the sub window is created.
 */
export const openChildWindow = async (pageUrl: string, options: BrowserWindowConstructorOptions = {}): Promise<void> => {
    const taskId = mainLogger.startTask("Electron", "Creating sub window");

    if (!baseWindow)
        return;

    childWindow = new BrowserWindow({
        width: 850,
        height: 700,
        webPreferences: {
            preload: path.join(__dirname, '../preload/index.mjs'),
            sandbox: false,
            nodeIntegration: false,
            contextIsolation: true,
            devTools: false,
            webSecurity: true,
            allowRunningInsecureContent: false,
        },
        parent: baseWindow, // Set the parent window
        modal: false, // Makes the subwindow modal
        resizable: false,
        minimizable: false,
        maximizable: false,
        title: options.title || "Preferences", // Use title from options or default
        ...options
    });
    childWindow.setMenu(null);

    // Force the title after window is created and loaded
    childWindow.webContents.once('did-finish-load', () => {
        const finalTitle = options.title || "Criterion Preferences";
        childWindow?.setTitle(finalTitle);
    });

    childWindow.loadURL(pageUrl);
    childWindow.on('close', () => {
        childWindow?.destroy();
    });

    childWindow.webContents.toggleDevTools()

    mainLogger.endTask(taskId, "Electron", "Sub window created");
};
