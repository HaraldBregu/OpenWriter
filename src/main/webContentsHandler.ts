import { BrowserWindow } from "electron";
import { mainLogger } from "./utils/logger.js";

export const sendAlertMessage = (mainWindow: BrowserWindow, message: Alert) => {
    mainWindow.webContents.send("alert", message);
}

export const getOpenedDocumentContent = (mainWindow: BrowserWindow, content: JsonObject) => {
    mainWindow.webContents.send("opened-doc", content);
}

export const startNewDocument = (mainWindow: BrowserWindow, content: JsonObject) => {
    mainWindow.webContents.send("new-doc", content);
}

export const changeCapitalization = (mainWindow: BrowserWindow, type: string) => {
    mainWindow.webContents.send("change-capitalization", type);
}

export const changeCharacterSpacing = (mainWindow: BrowserWindow, type: string) => {
    mainWindow.webContents.send("change-character-spacing", type);
}

export const changeCharacterStyle = (mainWindow: BrowserWindow, style: string) => {
    mainWindow.webContents.send("change-character-style", style);
}

export const changeListStyle = (mainWindow: BrowserWindow, style: string) => {
    mainWindow.webContents.send("change-list-style", style);
}

export const changeTextAlignment = (mainWindow: BrowserWindow, style: string) => {
    mainWindow.webContents.send("change-text-alignment-style", style);
}

export const changeIndentLevel = (mainWindow: BrowserWindow, increase: boolean) => {
    mainWindow.webContents.send("change-indent-level", increase);
}

export const changeSpacingSetting = (mainWindow: BrowserWindow) => {
    mainWindow.webContents.send("show-spacing-settings");
}

export const changeSpacing = (mainWindow: BrowserWindow, spaces: string) => {
    mainWindow.webContents.send("set-spacing-level", spaces);
}

export const setUndo = (window: BrowserWindow) => {
    try {
        window.webContents.send('trigger-undo');
    } catch (error) {
        mainLogger.error("setUndo", "Errore nell'invio del comando undo", error as Error);
    }
};

export const setRedo = (window: BrowserWindow) => {
    try {
        window.webContents.send('trigger-redo');
    } catch (error) {
        mainLogger.error("setRedo", "Errore nell'invio del comando redo", error as Error);
    }
};

export const changeLigature = (mainWindow: BrowserWindow, type: string) => {
    mainWindow.webContents.send("set-font-ligature", type);
}

export const insertComment = (mainWindow: BrowserWindow) => {
    try {
        mainWindow.webContents.send('insert-comment');
    } catch {
        mainLogger.error("insertComment", "Errore nell'invio del comando di inserimento commento");
    }
}