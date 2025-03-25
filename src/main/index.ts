import path, { join } from 'path'
import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron'
import { promises as fs } from 'fs'
import Store from 'electron-store'
import { isDev } from './utils/util.js'
import { getOpenedDocumentContent, startNewDocument } from './webContentsHandler.js'
import { BuildElectronMenu } from './components/menu.js'
import i18next from 'i18next'
import Backend from 'i18next-fs-backend'
import { mainLogger } from './utils/logger.js'
import fontList from 'font-list'
import { is } from '@electron-toolkit/utils'

// Interfaces
interface DocumentMetadata {
  title?: string;
  author?: string;
  createdAt: string;
}

interface DocumentData {
  version: string;
  lastModified: string;
  content: JsonObject | null;
  metadata?: DocumentMetadata;
}

let mainWindow: BrowserWindow;
let fileToOpen: string | null = null;
let currentDocumentPath: string | null = null;
let currentFileContent: JsonObject | null = null;
let extractedFileContent: JsonObject | null = null;

export const store = new Store();
let recentDocuments: string[] = store.get('recentDocuments', []) as string[];

// .critx protocol configuration
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('critx', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('critx');
}

// Recent documents management
const updateRecentDocuments = (filePath: string): void => {
  // upload the recent documents list from the store
  recentDocuments = store.get('recentDocuments', []) as string[];

  // Remove the file from the list if it's already there
  recentDocuments = recentDocuments.filter(doc => doc !== filePath);

  // add the new file to the list
  recentDocuments.unshift(filePath);

  // limits the list to 4 elements
  recentDocuments = recentDocuments.slice(0, 4);

  // save the updated list to the store
  store.set('recentDocuments', recentDocuments);

  // update the menu
  const newMenu = BuildElectronMenu(
    mainWindow,
    openRecentFile,
    newFile,
    openFile,
    clearStorageData,
    saveCurrentDocument,
    recentDocuments
  );
  Menu.setApplicationMenu(newMenu);
};

// Document management functions
const createDocumentData = (): DocumentData => ({
  version: "1.0",
  lastModified: new Date().toISOString(),
  content: currentFileContent,
  metadata: {
    createdAt: new Date().toISOString()
  }
});


const saveFile = async (mainWindow: BrowserWindow): Promise<void> => {
  const dialogTaskId = mainLogger.startTask("Electron", "Show save dialog");
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save file',
      defaultPath: path.join(app.getPath('downloads'), 'CRIT_Document.critx'),
      filters: [{ name: 'Criterion', extensions: ['critx'] }]
    });

    mainLogger.endTask(dialogTaskId, "Electron", "Save dialog closed");

    if (!result.canceled && result.filePath) {
      const taskId = mainLogger.startTask("Electron", "Saving file");
      const documentData = createDocumentData();

      await fs.writeFile(result.filePath, JSON.stringify(documentData, null, 2));
      currentDocumentPath = result.filePath;
      updateRecentDocuments(result.filePath);

      mainLogger.endTask(taskId, "Electron", "File saved");
      await dialog.showMessageBox(mainWindow, {
        message: 'Document saved successfully!'
      });
    }
  } catch (err) {
    mainLogger.error("Electron", "Error while saving", err as Error);
    await dialog.showMessageBox(mainWindow, {
      type: 'error',
      message: 'Error while saving file: ' + err
    });
  }
};

const saveCurrentDocument = async (mainWindow: BrowserWindow): Promise<void> => {
  if (!currentDocumentPath) {
    await saveFile(mainWindow);
    return;
  }

  const taskId = mainLogger.startTask("Electron", "Saving current document");
  try {
    const documentData = createDocumentData();
    await fs.writeFile(currentDocumentPath, JSON.stringify(documentData, null, 2));
    mainLogger.endTask(taskId, "Electron", "Document saved");
    await dialog.showMessageBox(mainWindow, { message: 'Document saved!' });
  } catch (err) {
    mainLogger.error("Electron", "Error while saving", err as Error);
    await dialog.showMessageBox(mainWindow, {
      type: 'error',
      message: 'Error while saving: ' + err
    });
  }
};


/*
const processFile = async (mainWindow: BrowserWindow, filePath: string): Promise<void> => {
  const taskId = mainLogger.startTask('Electron', 'Processing file')
  try {
    currentDocumentPath = filePath
    updateRecentDocuments(filePath)

    const fileContent = await fs.readFile(filePath, 'utf8')
    let content: JsonObject

    try {
      const jsonData: DocumentData = JSON.parse(fileContent)
      if (!Object.hasOwn(jsonData, 'content')) {
        mainLogger.error('Electron', 'Invalid file format', new Error('missing content property'))
        throw new Error('Invalid file format: missing content property')
      }

      if (typeof jsonData.content !== 'string' && jsonData.content !== null) {
        mainLogger.error(
          'Electron',
          'Invalid content format',
          new Error('content must be string or null')
        )
        throw new Error('Invalid content format: content must be a string or null')
      }

      if (jsonData.content) {
        try {
          JSON.parse(jsonData.content)
        } catch (e) {
          mainLogger.error('Electron', 'Invalid JSON in content', e as Error)
          throw new Error('Invalid content format: content must be a valid JSON string')
        }
      }

      content = jsonData.content ?? ''
    } catch (error) {
      if ((error as Error).message.includes('Invalid')) {
        mainLogger.error('Electron', 'Validation error', error as Error)
        await dialog.showMessageBox(mainWindow, {
          type: 'error',
          message: `Error while opening file: ${(error as Error).message}`
        })
        resetGlobalState()
        return
      }

      mainLogger.error('Electron', 'Invalid file format', new Error('Invalid file format'))
      await dialog.showMessageBox(mainWindow, {
        type: 'error',
        message: "Invalid file format: The file may be corrupted or it's not in the correct format"
      })
      resetGlobalState()
      return
    }

    extractedFileContent = content
    mainLogger.endTask(taskId, 'Electron', 'File processed')
    getOpenedDocumentContent(mainWindow, content)
  } catch (err) {
    mainLogger.error('Electron', 'Error while processing', err as Error)
    await dialog.showMessageBox(mainWindow, {
      type: 'error',
      message: `Error while opening file: ${err instanceof Error ? err.message : err}`
    })
    resetGlobalState()
    return
  }
}
*/

const processFile = async (mainWindow: BrowserWindow, filePath: string): Promise<void> => {
  const taskId = mainLogger.startTask("Electron", "Processing file");
  try {
    currentDocumentPath = filePath;
    updateRecentDocuments(filePath);

    const fileContent = await fs.readFile(filePath, 'utf8');
    let content: JsonObject;

    try {
      const jsonData: DocumentData = JSON.parse(fileContent);


      if (!Object.hasOwn(jsonData, 'content')) {
        mainLogger.error("Electron", "Invalid file format", new Error('missing content property'));
        throw new Error('Invalid file format: missing content property');
      }

      if (typeof jsonData.content !== 'object' && jsonData.content !== null) {
        mainLogger.error("Electron", "Invalid content format", new Error('content must be string or null'));
        throw new Error('Invalid content format: content must be a string or null');
      }

      if (jsonData.content) {
        try {
          JSON.parse(JSON.stringify(jsonData.content));
        } catch (e) {
          mainLogger.error("Electron", "Invalid JSON in content", e as Error);
          throw new Error('Invalid content format: content must be a valid JSON string');
        }
      }

      content = jsonData.content ?? {};

    } catch (error) {
      if ((error as Error).message.includes('Invalid')) {
        mainLogger.error("Electron", "Validation error", error as Error);
        await dialog.showMessageBox(mainWindow, {
          type: 'error',
          message: `Error while opening file: ${(error as Error).message}`
        });
        resetGlobalState();
        return;
      }

      mainLogger.error("Electron", "Invalid file format", new Error('Invalid file format'));
      await dialog.showMessageBox(mainWindow, {
        type: 'error',
        message: "Invalid file format: The file may be corrupted or it's not in the correct format"
      });
      resetGlobalState();
      return;
    }

    extractedFileContent = content;
    mainLogger.endTask(taskId, "Electron", "File processed");

    console.log("extractedFileContent = content: ", content)
    getOpenedDocumentContent(mainWindow, content);

  } catch (err) {
    mainLogger.error("Electron", "Error while processing", err as Error);
    await dialog.showMessageBox(mainWindow, {
      type: 'error',
      message: `Error while opening file: ${err instanceof Error ? err.message : err}`
    });
    resetGlobalState();
    return;
  }
};

const openFile = async (mainWindow: BrowserWindow, filePathFromArg?: string): Promise<void> => {
  const taskId = mainLogger.startTask("Electron", "Opening file");
  try {
    if (filePathFromArg) {
      await processFile(mainWindow, filePathFromArg);
    } else {
      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Open file',
        defaultPath: path.join(app.getPath('documents'), ''),
        filters: [{ name: 'Criterion', extensions: ['critx'] }],
        properties: ['openFile']
      });

      if (!result.canceled && result.filePaths[0]) {
        await processFile(mainWindow, result.filePaths[0]);
      }
    }
    mainLogger.endTask(taskId, "Electron", "File opened");
  } catch (err) {
    mainLogger.error("Electron", "Error while opening", err as Error);
    await dialog.showMessageBox(mainWindow, {
      type: 'error',
      message: "Error while opening file: ' + err"
    });
  }
};

const openRecentFile = async (mainWindow: BrowserWindow, filePath?: string): Promise<void> => {
  const taskId = mainLogger.startTask("Electron", "Opening recent file");
  try {
    const selectedPath = filePath ?? dialog.showOpenDialogSync(mainWindow, {
      properties: ['openFile']
    })?.[0];

    if (selectedPath) {
      await processFile(mainWindow, selectedPath);
    }
    mainLogger.endTask(taskId, "Electron", "Recent file opened");
  } catch (err) {
    mainLogger.error("Electron", "Error while opening recent file", err as Error);
  }
};

const newFile = (mainWindow: BrowserWindow): void => {
  const editorContent: JsonObject = ({
    mainText: '',
    apparatusText: '',
    comments: []
  });
  resetGlobalState();
  startNewDocument(mainWindow, editorContent);
};

const resetGlobalState = (): void => {
  const taskId = mainLogger.startTask("Electron", "Reset global state");
  try {
    currentDocumentPath = null;
    fileToOpen = null;
    currentFileContent = {};
    extractedFileContent = null;
    mainLogger.endTask(taskId, "Electron", "Global state reset");
  } catch (err) {
    mainLogger.error("Electron", "Error while resetting state", err as Error);
  }
};

const handleAppClose = async (event: Electron.Event): Promise<void> => {
  event.preventDefault();

  if (!currentFileContent) {
    app.exit();
    return;
  }

  const { response } = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    buttons: ['Save', 'Don\'t Save', 'Cancel'],
    defaultId: 0,
    cancelId: 2,
    title: 'Unsaved Document',
    message: 'The document contains unsaved changes.',
    detail: 'Do you want to save the changes before closing the application?',
    noLink: true
  });

  if (response === 0) { // Save
    if (!currentDocumentPath) {
      await saveFile(mainWindow);
    } else if (currentFileContent !== extractedFileContent) {
      await saveCurrentDocument(mainWindow);
    }
    app.exit();
  } else if (response === 1) { // Don't save
    app.exit();
  }
};

const clearStorageData = async (mainWindow: BrowserWindow) => {
  const taskId = mainLogger.startTask("Electron", "Clearing storage");
  try {
    await Promise.all([
      mainWindow.webContents.session.clearStorageData({
        storages: [
          'cookies',
          'localstorage',
          'indexdb'
        ]
      }),
      mainWindow.webContents.session.clearCache(),
      store.clear(), // Also clears electron-store
      mainWindow.reload()
    ]);

    await dialog.showMessageBox(mainWindow, {
      type: 'info',
      message: 'Stored data cleared successfully!',
      detail: 'Refresh the application to apply changes.',
      buttons: ['OK']
    });
    mainLogger.endTask(taskId, "Electron", "Storage cleared successfully");
  } catch (err) {
    mainLogger.error("Electron", "Error while clearing storage", err as Error);
  }
}

const updateElectronLocale = async (lang: string): Promise<void> => {
  const taskId = mainLogger.startTask("Electron", "Changing language");
  try {
    store.set("appLanguage", lang);
    await i18next.changeLanguage(lang);
    const newMenu = BuildElectronMenu(
      mainWindow,
      openRecentFile,
      newFile,
      openFile,
      clearStorageData,
      saveCurrentDocument,
      recentDocuments
    );
    Menu.setApplicationMenu(newMenu);
    mainLogger.endTask(taskId, "Electron", "Language changed");
  } catch (err) {
    mainLogger.error("Electron", "Error while changing language", err as Error);
  }
};

const createMainWindow = async (): Promise<void> => {
  const taskId = mainLogger.startTask('Electron', 'Creating main window')

  try {
    // Icon configuration
    const iconPath = isDev()
      ? path.join(app.getAppPath(), 'appIcon.png')
      : path.join(process.resourcesPath, 'appIcon.ico')

    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      icon: iconPath,
      webPreferences: {
        preload: join(__dirname, '../preload/index.mjs'),
        sandbox: false,
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    //mainWindow.webContents.openDevTools()
    /*
        mainWindow.on('ready-to-show', () => {
          mainWindow.show()
        })*/

    // Handle window close
    mainWindow.on('close', handleAppClose)

    // Load interface
    /* if (isDev()) {
            await mainWindow.loadURL('http://localhost:5123');
        } else {
            await mainWindow.loadFile(path.join(app.getAppPath(), 'dist-react/index.html'));
        }*/

    // HMR for renderer base on electron-vite cli.
    // Load the remote URL for development or the local html file for production.
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      store.set('appLanguage', 'en')
      mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }

    // Initialize language
    const language = (store.get('appLanguage') as string) || 'en'
    await i18next.changeLanguage(language)

    // Load recent documents from store
    recentDocuments = store.get('recentDocuments', []) as string[]

    // Check and clean non-existent recent files
    recentDocuments = await Promise.all(
      recentDocuments.map(async (filePath) => {
        try {
          await fs.access(filePath)
          return filePath
        } catch {
          return null
        }
      })
    ).then((files) => files.filter((file): file is string => file !== null))

    // Save cleaned list
    store.set('recentDocuments', recentDocuments)

    const hasLanguageBeenSet = store.has('appLanguage')

    console.log('hasLanguageBeenSet', hasLanguageBeenSet)



    if (hasLanguageBeenSet) {
      const newMenu = BuildElectronMenu(
        mainWindow,
        openRecentFile,
        newFile,
        openFile,
        clearStorageData,
        saveCurrentDocument,
        recentDocuments
      )
      console.log('newMenu: 526', newMenu)

      Menu.setApplicationMenu(newMenu)
    } else {

      console.log('newMenu: none')

      Menu.setApplicationMenu(null)
    }
    // Create and set menu

    mainLogger.endTask(taskId, 'Electron', 'Main window created')
  } catch (err) {
    mainLogger.error('Electron', 'Error while creating window', err as Error)
    throw err // Re-throw error to handle it in the caller
  }
}

// Event listeners
/*
const registerIpcListeners = (): void => {
  ipcMain.on('currentDocumentUpdate', (_event, data: EditorContent | null) => {
    try {
      if (data === null) {
        currentFileContent = ''
        return
      }
      // No need to JSON.stringify here as the data is already in the correct format
      currentFileContent = JSON.stringify(data)
    } catch (err) {
      mainLogger.error('Electron', 'Error while parsing data', err as Error)
      currentFileContent = ''
    }
  })

  ipcMain.on('set-electron-language', (_event, language: string) => {
    updateElectronLocale(language)
  })

  ipcMain.on('request-system-fonts', async (event) => {
    try {
      const fonts = await fontList.getFonts()
      const cleanedFonts = fonts.map((font: string) => font.replace(/"/g, ''))
      event.reply('receive-system-fonts', cleanedFonts)
    } catch (error) {
      console.error('Error fetching system fonts:', error)
      event.reply('receive-system-fonts', [])
    }
  })
}
  */

// Event listeners
const registerIpcListeners = (): void => {
  ipcMain.on('currentDocumentUpdate', (_event, data: JsonObject | null) => {
    try {
      if (data === null) {
        currentFileContent = {};
        return;
      }
      currentFileContent = data;

      // No need to JSON.stringify here as the data is already in the correct format
      // currentFileContent = JSON.stringify(data);
      console.log("electrondata: ", data.mainText)
      console.log("electrondata: ", currentFileContent)

    } catch (err) {
      mainLogger.error("Electron", "Error while parsing data", err as Error);
      currentFileContent = {};
    }
  });

  ipcMain.on("set-electron-language", (_event, language: string) => {
    updateElectronLocale(language);
  });

  ipcMain.on('request-system-fonts', async (event) => {
    try {
      const fonts = await fontList.getFonts();
      const cleanedFonts = fonts.map((font: string) => font.replace(/"/g, ''));
      event.reply('receive-system-fonts', cleanedFonts);
    } catch (error) {
      console.error('Error fetching system fonts:', error);
      event.reply('receive-system-fonts', []);
    }
  });
};

export function changeLanguageGlobal(lang: string): void {
  updateElectronLocale(lang);
  mainWindow.webContents.send('language-changed', lang);
}

// Application initialization
const initializeApp = async (): Promise<void> => {
  const langTaskId = mainLogger.startTask("Electron", "Starting i18next");
  try {
    await i18next.use(Backend).init({
      lng: store.get("appLanguage") as string || "en",
      fallbackLng: "en",
      backend: {
        loadPath: path.join(getLocalesPath(), "{{lng}}/translations.json")
      }
    });

    mainLogger.endTask(langTaskId, "Electron", "i18next configured");
    const appTaskId = mainLogger.startTask("Electron", "Starting application");

    await app.whenReady();
    await createMainWindow();
    registerIpcListeners();

    if (fileToOpen) {
      await openFile(mainWindow, fileToOpen);
      fileToOpen = null;
    }

    // Command line arguments handling
    const filePathFromArgs = process.argv.find(arg => arg.endsWith('.critx'));
    if (filePathFromArgs) {
      await openFile(mainWindow, filePathFromArgs);
    }

    mainLogger.endTask(appTaskId, "Electron", "Application started");
  } catch (err) {
    mainLogger.error("Electron", "Error during initialization", err as Error);
  }
};

// Helpers
const getLocalesPath = (): string => {
  return isDev()
    ? path.join(app.getAppPath(), "i18n")
    : path.join(process.resourcesPath, "i18n");
};

// Application start
initializeApp().catch(err => {
  mainLogger.error("Electron", "Fatal error during startup", err as Error);
});