import path from "path";
import { getBaseWindow, getToolbarWebContentsView } from "../main-window";
import { mainLogger } from "../shared/logger";
import { promises as fs } from 'fs'
import { app, dialog } from "electron";
import * as fsSync from 'fs';
import { closeWebContentsViewWithId, getSelectedWebContentsView } from "../content";
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
                    'pdf',
                    'jpeg',
                    'jpg',
                    'png',
                    'gif',
                    'bmp',
                    'tiff',
                    'tif',
                  
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
 * Saves a new document by showing a save dialog or updates the current document automatically
 * @returns void
 */
export const saveDocument = async (onDone?: (filePath: string) => void): Promise<void> => {
    const taskId = mainLogger.startTask("Electron", "Saving document");

    const currentTab = getSelectedTab()
    const baseWindow = getBaseWindow()

    if (!baseWindow || !currentTab) return

    const filePath = currentTab.filePath

    if (filePath) {
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
        return;
    }

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
        title: 'Save Document', // Translate this
        defaultPath: path.join(app.getPath('downloads'), 'CRIT_Document.critx'),
        filters: [{ name: 'Criterion', extensions: ['critx'] }]
    });

    if (!result.canceled && result.filePath) {
        await fs.writeFile(result.filePath, JSON.stringify(newDocument, null, 2));
        onDone?.(result.filePath)
        await dialog.showMessageBox(baseWindow, { message: 'Document saved!' });
        mainLogger.endTask(taskId, "Electron", "New document saved");
    }
}

/**
 * Saves current document as a new document by showing a save dialog
 * @returns void
 */
export const saveDocumentAs = async (): Promise<void> => {
    const taskId = mainLogger.startTask("Electron", "Saving document as");

    const baseWindow = getBaseWindow();
    if (!baseWindow) return;

    const result = await dialog.showSaveDialog(baseWindow, {
        title: 'Save Document As...',
        defaultPath: path.join(app.getPath('downloads'), 'CRIT_Document.critx'),
        filters: [{ name: 'Criterion', extensions: ['critx'] }]
    });

    if (!result.canceled && result.filePath) {
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

        await fs.writeFile(result.filePath, JSON.stringify(newDocument, null, 2));
        await dialog.showMessageBox(baseWindow, { message: 'Document saved successfully!' });
        updateRecentDocuments(result.filePath);

        mainLogger.endTask(taskId, "Electron", "New document saved as");
    }
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

// TODO: Implement this
export const closeDocument = async (): Promise<void> => {
    const taskId = mainLogger.startTask("Electron", "Closing document");

    const toolbarWebContentsView = getToolbarWebContentsView()
    const currentWebContentsView = getSelectedWebContentsView()

    const tabId = currentWebContentsView?.webContents.id ?? -1

    toolbarWebContentsView?.webContents.send("close-current-document", tabId);
    closeWebContentsViewWithId(tabId)

    // const extractedFileContent = currentDocument
    // const isNewEmpty = extractedFileContent === null && !isFileContentPopulated(currentFileContent?.mainText) && !isFileContentPopulated(currentFileContent?.apparatusText)
    // const isNewWithChanges = extractedFileContent === null && isFileContentPopulated(currentFileContent?.mainText) && !isFileContentPopulated(currentFileContent?.apparatusText)
    // const isLoadedWithChanges = extractedFileContent !== null && JSON.stringify(currentFileContent) !== JSON.stringify(extractedFileContent);

    // let hasUnsavedChanges = false;

    // if (isNewWithChanges || isLoadedWithChanges) {
    //     hasUnsavedChanges = true;
    // }

    // if (isNewEmpty) {
    //     mainLogger.info("Electron", "New empty document closed without prompt.");
    //     mainLogger.endTask(taskId, "Electron", "File closed");
    //     app.exit();
    //     return;
    // }

    // if (hasUnsavedChanges) {
    //     const { response } = await dialog.showMessageBox(baseWindow, {
    //         type: 'warning',
    //         buttons: ['Save', 'Don\'t Save', 'Cancel'],
    //         defaultId: 0,
    //         cancelId: 2,
    //         title: 'Unsaved Document',
    //         message: 'The document contains unsaved changes.',
    //         detail: 'Do you want to save the changes before closing the application?',
    //         noLink: true
    //     });

    //     if (response === 0) { // Save
    //         if (!currentDocumentPath) {
    //             await saveFile(baseWindow);
    //         } else {
    //             await saveCurrentDocument(baseWindow);
    //         }
    //         app.exit();
    //     } else if (response === 1) { // Don't save
    //         app.exit();
    //     }
    // }

    // const isLoadedWithNoChanges = extractedFileContent !== null && !hasUnsavedChanges;

    // if (isLoadedWithNoChanges) {
    //     mainLogger.info("Electron", "Document loaded and unchanged. Closing without prompt.");
    //     mainLogger.endTask(taskId, "Electron", "File closed");
    //     app.exit();
    //     return;
    // }

    mainLogger.endTask(taskId, "Electron", "File closed");
};

/**
 * Closes the application
 * @returns void
 */
export const closeApplication = async (): Promise<void> => {
    const taskId = mainLogger.startTask("Electron", "Exiting application");

    app.exit();

    mainLogger.endTask(taskId, "Electron", "Application exited");
}

/**
 * Clears the storage data
 * @returns void
 */
// export const clearStorageData = async (): Promise<void> => {
//     const taskId = mainLogger.startTask("Electron", "Clearing storage");
//     const baseWindow = getBaseWindow()
//     if (!baseWindow) return

//     // await Promise.all([
//     //     webContentsView.webContents.session.clearStorageData({
//     //         storages: [
//     //             'cookies',
//     //             'localstorage',
//     //             'indexdb'
//     //         ]
//     //     }),
//     //     webContentsView.webContents.session.clearCache(),
//     //     store.clear(), // Also clears electron-store
//     //     webContentsView.webContents.reload()
//     // ]);

//     await dialog.showMessageBox(baseWindow, {
//         type: 'info',
//         message: 'Stored data cleared successfully!',
//         detail: 'Refresh the application to apply changes.',
//         buttons: ['OK']
//     });
//     mainLogger.endTask(taskId, "Electron", "Storage cleared successfully");
// }


// export const isFileContentPopulated = (node: any): boolean => {
//     const hasContentPropertyWithContent = (node: any): boolean => {
//         if (!node || typeof node !== "object") return false;

//         if (Array.isArray(node.content)) {
//             // Se il nodo stesso ha un content valorizzato
//             if (node.content.length > 0) {
//                 return node.content.some(child => hasContentPropertyWithContent(child));
//             }
//             return false;
//         }

//         return false;
//     };
//     if (!node || typeof node !== "object") return false;

//     // Se ha una proprietà 'content' non vuota
//     if (Array.isArray(node.content) && node.content.length > 0) {
//         for (const child of node.content) {
//             // Se un figlio ha un content non vuoto, ritorna true
//             if (Array.isArray(child.content) && child.content.length > 0) {
//                 return true;
//             }

//             // Ricorsione
//             if (hasContentPropertyWithContent(child)) {
//                 return true;
//             }
//         }
//     }

//     return false;
// };  