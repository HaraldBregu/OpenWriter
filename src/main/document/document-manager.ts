import path from "path";
import { getBaseWindow } from "../main-window";
import { mainLogger } from "../shared/logger";
import { promises as fs } from 'fs'
import { app, dialog } from "electron";
import * as fsSync from 'fs';
import {
    createDocumentObject,
    getCurrentAnnotations,
    getCurrentApparatuses,
    getCurrentMainText,
    getCurrentTemplate,
    getLastFolderPath,
    setLastFolderPath,
    updateRecentDocuments,
} from "./document";
import { getSelectedTab, setFilePathForSelectedTab } from "../toolbar";
import assert from "assert";


/**
 * Opens a file dialog to select a file and loads the document at the selected path
 * @returns void
 */
export const openDocument = async (filePath: string | null | undefined, onDone?: (filePath: string) => void): Promise<void> => {
    if (filePath) {
        onDone?.(filePath)
        return;
    }

    const taskId = mainLogger.startTask("Electron", "Opening file dialog");

    const window = getBaseWindow();
    if (!window) return

    const docsFolderPath = app.getPath('documents')
    const folderPath = getLastFolderPath() ?? docsFolderPath

    const result = await dialog.showOpenDialog(window, {
        title: 'Open file', // To be translated
        defaultPath: path.join(folderPath, ''),
        filters: [
            {
                name: 'Criterion',
                extensions: [
                    'critx',
                ]
            },
            {
                name: 'Images',
                extensions: [
                    'jpeg',
                    'jpg',
                    'png',
                    'gif',
                    'bmp',
                    'tiff',
                    'tif',
                ]
            },
            {
                name: 'PDF',
                extensions: [
                    'pdf',
                ]
            }
        ],
        properties: ['openFile']
    });

    mainLogger.endTask(taskId, "Electron", "File dialog closed");

    if (result.canceled || !result.filePaths[0]) return;
    const selectedFilePath = result.filePaths[0]
    setLastFolderPath(path.dirname(selectedFilePath))
    onDone?.(selectedFilePath)
}

/**
 * Saves the current document
 * @param onDone - The callback to call when the document is saved
 * @returns void
 */
export const saveDocument = async (onDone?: ((filePath: string) => void)): Promise<void> => {
    const currentTab = getSelectedTab()
    const filePath = currentTab?.filePath
    const isNewDocument = !filePath

    if (isNewDocument)
        await createNewDocument(onDone)
    else
        await updateCurrentDocument(onDone)
}

/**
 * Saves current document as a new document by showing a save dialog
 * @returns void
 */
export const saveDocumentAs = async (onDone?: (filePath: string) => void): Promise<void> => {
    createNewDocument(onDone)
}

/**
 * Renames a document by showing a save dialog
 * @param onDone - The callback to call when the document is renamed
 * @returns void
 */
export const renameDocument = async (onDone?: (filename: string) => void): Promise<void> => {
    const dialogTaskId = mainLogger.startTask("Electron", "Show rename dialog");

    const currentTab = getSelectedTab()
    const baseWindow = getBaseWindow()
    if (!baseWindow || !currentTab) return

    const filePath = currentTab.filePath
    if (!filePath) return

    const currentDirectory = path.dirname(filePath);
    const currentFileName = path.basename(filePath);

    const result = await dialog.showSaveDialog(baseWindow, {
        title: 'Rename...', // To be translated
        defaultPath: path.join(currentDirectory, currentFileName),
        filters: [{ name: 'Criterion', extensions: ['critx'] }],
        properties: ['createDirectory']
    });

    mainLogger.endTask(dialogTaskId, "Electron", "Rename dialog closed");

    if (!result.canceled && result.filePath && result.filePath !== filePath) {
        if (result.filePath === filePath) return;

        if (fsSync.existsSync(result.filePath)) {
            const { response } = await dialog.showMessageBox(
                baseWindow,
                {
                    type: 'warning',
                    buttons: [ // To be translated
                        'Cancel',
                        'No',
                        'Yes',
                    ],
                    defaultId: 2, // Yes
                    cancelId: 0,  // Cancel
                    message: 'File already exists! Do you want to overwrite it?'
                });

            if (response === 0) return;
            if (response === 1) return await renameDocument();
        }

        try {
            await fs.rename(filePath, result.filePath);
        } catch (err) {
            await dialog.showMessageBox(baseWindow, {
                type: 'error',
                message: 'Error while renaming file: ' + err
            });
            return;
        }

        setFilePathForSelectedTab(result.filePath);
        updateRecentDocuments(result.filePath);

        const basename = path.parse(result.filePath).base
        onDone?.(basename)

        await dialog.showMessageBox(baseWindow, {
            type: 'info',
            message: 'File renamed successfully!'
        });
    }
}

/**
 * Moves a document to a new folder by showing a save dialog
 * @returns void
 */
export const moveDocument = async (): Promise<void> => {
    const currentTab = getSelectedTab()
    const baseWindow = getBaseWindow()
    if (!baseWindow || !currentTab) return

    const filePath = currentTab.filePath
    if (!filePath) return

    const fileName = path.basename(filePath)

    const { canceled, filePaths } = await dialog.showOpenDialog(baseWindow, {
        properties: ['openDirectory'],
        title: 'Choose destination folder', // To be translated
    });

    if (canceled || filePaths.length === 0) return;

    const destFolder = filePaths[0];
    const destPath = path.join(destFolder, fileName);

    if (fsSync.existsSync(destPath)) {
        const { response } = await dialog.showMessageBox(baseWindow, {
            type: 'warning',
            buttons: [
                'Yes', // To be translated
                'No', // To be translated
            ],
            defaultId: 1, // No
            title: 'Confirm Overwrite', // To be translated
            message: `${fileName} already exists. Please replace the file?`,
        });

        if (response === 1) return;
    }

    // 3. Try to move the file (using rename first, fallback to copy + delete)
    try {
        await fs.rename(filePath, destPath);
    } catch (err: unknown) {
        if (err && typeof err === 'object' && 'code' in err && err.code === 'EXDEV') {
            // Cross-device move not permitted, fallback to copy + delete
            await fs.copyFile(filePath, destPath);
            await fs.unlink(filePath);
        } else {
            throw err;
        }
    }

    setFilePathForSelectedTab(destPath);
    updateRecentDocuments(destPath);

    await dialog.showMessageBox(baseWindow, {
        type: 'info',
        message: 'File moved successfully.',
    });
}

/**
 * Closes the application
 * @returns void
 */
export const closeApplication = async (): Promise<void> => {
    const taskId = mainLogger.startTask("Electron", "Exiting application");

    app.exit();

    mainLogger.endTask(taskId, "Electron", "Application exited");
}

const updateCurrentDocument = async (onDone?: ((filePath: string) => void)): Promise<void> => {
    const taskId = mainLogger.startTask("Electron", "Updating current document");

    const baseWindow = getBaseWindow()
    if (!baseWindow) return

    const currentTab = getSelectedTab()
    const filePath = currentTab?.filePath
    assert(filePath, "Current tab has no file path");

    const fileContent = await fs.readFile(filePath, 'utf8');
    const document = JSON.parse(fileContent);

    const updatedDocument = await createDocumentObject({
        version: document.version,
        createdAt: document.createdAt,
        updatedAt: new Date().toISOString(),
        mainText: getCurrentMainText(),
        apparatuses: getCurrentApparatuses(),
        annotations: getCurrentAnnotations(),
        template: getCurrentTemplate(),
    });

    await fs.writeFile(filePath, JSON.stringify(updatedDocument, null, 2));
    onDone?.(filePath)
    await dialog.showMessageBox(baseWindow, { message: 'Document updated!' });

    mainLogger.endTask(taskId, "Electron", "Document updated");
}

const createNewDocument = async (onDone?: ((filePath: string) => void)): Promise<void> => {
    const taskId = mainLogger.startTask("Electron", "Creating new document");

    const baseWindow = getBaseWindow()
    if (!baseWindow) return

    // New document
    const newDocument = await createDocumentObject({
        version: "1.0",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        mainText: getCurrentMainText(),
        apparatuses: getCurrentApparatuses(),
        annotations: getCurrentAnnotations(),
        template: getCurrentTemplate(),
        metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }
    });

    const result = await dialog.showSaveDialog(baseWindow, {
        title: 'Save Document As...', // Translate this
        defaultPath: path.join(app.getPath('downloads'), 'CRIT_Document.critx'),
        filters: [{ name: 'Criterion', extensions: ['critx'] }]
    });

    if (result.canceled || !result.filePath) return

    await fs.writeFile(result.filePath, JSON.stringify(newDocument, null, 2));
    onDone?.(result.filePath)
    await dialog.showMessageBox(baseWindow, { message: 'Document saved!' });

    mainLogger.endTask(taskId, "Electron", "New document created");
}
