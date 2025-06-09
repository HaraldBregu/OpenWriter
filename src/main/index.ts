import path from "path";
import { app, BaseWindow, dialog, ipcMain, MenuItem, net, protocol, shell } from "electron";
import { setApplicationMenu } from "./menu/menu";
import { MenuItemId } from "./shared/types";
import i18next from "i18next";
import Backend from "i18next-fs-backend";
import { mainLogger } from "./shared/logger.js";
import fontList from "font-list";
import os from "os";
import {
  getBaseWindow,
  getToolbarWebContentsView,
  initializeMainWindow,
  toolbarWebContentsViewSend,
} from "./main-window";
import * as fsSync from "fs";
import { getLocalesPath, getTemplatesPath } from "./shared/util.js";
import {
  closeWebContentsViewWithId,
  getWebContentsViewsIds,
  getSelectedWebContentsView,
  getSelectedWebContentsViewId,
  getWebContentsViews,
  reorderTabs,
  selectedWebContentsViewSend,
  setSelectedWebContentsViewWithId,
  createWebContentsView,
  showWebContentsView,
} from "./content";
import {
  closeApplication,
  closeDocument,
  moveDocument,
  openDocument,
  renameDocument,
  saveDocument,
  saveDocumentAs,
} from "./document/document-manager";
import { promises as fs } from "fs";
import {
  createDocument,
  getCurrentDocument,
  setCurrentAnnotations,
  setCurrentApparatuses,
  setCurrentMainText,
  setCurrentDocument,
  setCurrentLayoutTemplate,
  setCurrentPageSetup,
  setCurrentParatextual,
  setCurrentSort,
  setCurrentStyles,
  setRecentDocuments,
  updateRecentDocuments,
} from "./document/document";
import * as _ from "lodash-es";
import { setDisabledReferencesMenuItemsIds } from "./menu/items/references-menu";
import { setApparatusSubMenuObjectItems, setToolbarVisible } from "./menu/items/view-menu";
import { fileTypeToRouteMapping, Route, routeToMenuMapping, setMenuViewMode, typeTypeToRouteMapping } from "./shared/constants";
import { setFilePathForSelectedTab } from "./toolbar";
import { readAppLanguage, readToolbarAdditionalItems, readToolbarIsVisible, storeAppLanguage, storeToolbarAdditionalItems, storeToolbarIsVisible } from "./store";


// .critx protocol configuration
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("critx", process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient("critx");
}

const protocolName = "local-resource";

protocol.registerSchemesAsPrivileged([
  {
    scheme: protocolName,
    privileges: {
      secure: true,
      supportFetchAPI: true, // impotant
      standard: true,
      bypassCSP: true, // impotant
      stream: true
    }
  }
])

const handleAppClose = (closeFileFn: () => Promise<void>) =>
  async (event: Electron.Event): Promise<void> => {
    event.preventDefault();
    await closeFileFn();
  };

const updateElectronLocale = async (lang: string): Promise<void> => {
  const taskId = mainLogger.startTask("Electron", "Changing language");
  try {
    const baseWindow = getBaseWindow();
    if (!baseWindow) return;

    storeAppLanguage(lang);

    await i18next.changeLanguage(lang);

    setApplicationMenu(onClickMenuItem);

    mainLogger.endTask(taskId, "Electron", "Language changed");
  } catch (err) {
    mainLogger.error("Electron", "Error while changing language", err as Error);
  }
};

const registerIpcListeners = (): void => {
  ipcMain.on("update-critical-text", async (_event, data: object | null) => {
    setCurrentMainText(data);
    const mainText = getCurrentDocument()?.mainText;
    if (!data || !mainText) return;
    const isEqual = await _.isEqual(data, mainText);
    const changed = !isEqual;
    toolbarWebContentsViewSend("main-text-changed", changed);
  });
  ipcMain.on("update-annotations", (_event, data: object | null) => {
    setCurrentAnnotations(data);
  });
  ipcMain.on("set-electron-language", (_event, language: string) => {
    updateElectronLocale(language);
  });
  ipcMain.on("request-system-fonts", async (event) => {
    try {
      const fonts = await fontList.getFonts();
      const cleanedFonts = fonts.map((font: string) => font.replace(/"/g, ""));
      event.reply("receive-system-fonts", cleanedFonts);
    } catch (error) {
      console.error("Error fetching system fonts:", error);
      event.reply("receive-system-fonts", []);
    }
  });
  ipcMain.on("open-external-file", async (_, filePath: string) => {
    const taskId = mainLogger.startTask("Electron", "Opening external link");
    try {
      await shell.openExternal(filePath);
      mainLogger.endTask(taskId, "Electron", "External link opened");
    } catch (err) {
      mainLogger.error(
        "Electron",
        "Error while opening external link",
        err as Error
      );
    }
  });
  ipcMain.on("open-choose-layout-modal", async () => {
    selectedWebContentsViewSend("receive-open-choose-layout-modal");
  });

  // When a new tab from FrontEnd is created it sends the filepath to the main process
  // The main process reads the file and sends the document to the FrontEnd
  ipcMain.on("document-opened-at-path", async (_, filepath: string, fileType: FileType) => {
    switch (fileType) {
      case "critx": {
        const fileContent = await fs.readFile(filepath, "utf8");
        const documentObject = JSON.parse(fileContent);
        const document = await createDocument(documentObject);
        setCurrentDocument(document);
        selectedWebContentsViewSend("load-document", documentObject);
        selectedWebContentsViewSend("load-document-apparatuses", documentObject.apparatuses);
        setFilePathForSelectedTab(filepath);
      } break;
      case 'pdf':
      case 'png':
      case 'jpg':
      case 'jpeg':
        selectedWebContentsViewSend("load-file-at-path", filepath);
        setFilePathForSelectedTab(filepath);
        updateRecentDocuments(filepath);
        setApplicationMenu(onClickMenuItem);
        break;
    }

  });

  ipcMain.on('application:updateToolbarAdditionalItems', (_, items) => {
    storeToolbarAdditionalItems(items);
    getWebContentsViews().forEach((webContentView) =>
        webContentView.webContents.send(
          "toolbar-additional-items",
          readToolbarAdditionalItems()
        )
      );
  });
};

export function changeLanguageGlobal(lang: string): void {
  updateElectronLocale(lang);
  const webContentsView = getSelectedWebContentsView();
  webContentsView?.webContents.send("language-changed", lang);
}

async function onDocumentOpened(filePath: string): Promise<void> {
  const fileNameParsed = path.parse(filePath);
  const fileNameBase = fileNameParsed.base;
  const fileNameExt = fileNameParsed.ext as FileNameExt;
  const fileType = fileNameExt.slice(1) as FileType;

  getToolbarWebContentsView()?.webContents.send(
    "document-opened",
    filePath,
    fileNameBase,
    fileType,
  );
  updateRecentDocuments(filePath);
  setApplicationMenu(onClickMenuItem);
}

function onDocumentSaved(filePath: string): void {
  const fileNameParsed = path.parse(filePath);
  const fileNameBase = fileNameParsed.base;
  toolbarWebContentsViewSend("document-saved", fileNameBase);
  toolbarWebContentsViewSend("main-text-changed", false);
  updateRecentDocuments(filePath);
  setApplicationMenu(onClickMenuItem);
}

function onDocumentRenamed(filename: string): void {
  const toolbarContentView = getToolbarWebContentsView();
  toolbarContentView?.webContents.send("document-renamed", filename);
}

function onClickMenuItem(menuItem: MenuItem, data?: string): void {
  const typeId: MenuItemId = menuItem.id as MenuItemId;

  switch (typeId) {

    // File menu
    case MenuItemId.NEW_FILE:
      toolbarWebContentsViewSend("create-new-document");
      setCurrentDocument(null)
      break;
    case MenuItemId.OPEN_FILE:
      openDocument(null, onDocumentOpened);
      break;
    case MenuItemId.OPEN_RECENT_FILE:
      openDocument(data, onDocumentOpened);
      break;
    case MenuItemId.IMPORT_FILE:
      break;
    case MenuItemId.CLOSE_FILE:
      closeDocument();
      break;
    case MenuItemId.SAVE_FILE:
      saveDocument(onDocumentSaved);
      break;
    case MenuItemId.SAVE_FILE_AS:
      saveDocumentAs();
      break;
    case MenuItemId.RENAME_FILE:
      renameDocument(onDocumentRenamed);
      break;
    case MenuItemId.MOVE_FILE:
      moveDocument();
      break;
    case MenuItemId.REVERT_FILE_TO:
      break;
    case MenuItemId.SHARE_FOR_REVIEW:
      break;
    case MenuItemId.LOCK_FILE:
      break;
    case MenuItemId.UNLOCK_FILE:
      break;
    case MenuItemId.EXPORT_TO:
      break;
    case MenuItemId.EXPORT_TO_PDF:
      break;
    case MenuItemId.EXPORT_TO_ODT:
      break;
    case MenuItemId.EXPORT_TO_XML:
      break;
    case MenuItemId.LANGUAGE_AND_REGION:
      break;
    case MenuItemId.SAVE_AS_TEMPLATE:
      selectedWebContentsViewSend('save-as-template');
      break
    case MenuItemId.METADATA:
      break;
    case MenuItemId.PAGE_SETUP:
      break;
    case MenuItemId.PRINT:
      break;

    // Edit menu
    case MenuItemId.FIND_AND_REPLACE:
      break;
    case MenuItemId.FIND_NEXT:
      break;
    case MenuItemId.FIND_PREVIOUS:
      break;
    case MenuItemId.JUMP_TO_SELECTION:
      break;
    case MenuItemId.UNDO:
      selectedWebContentsViewSend('trigger-undo');
      break
    case MenuItemId.REDO:
      selectedWebContentsViewSend('trigger-redo');
      break
    case MenuItemId.CUT:
      // NO IMPPLEMENTATION REQUIRED
      break;
    case MenuItemId.COPY:
      // NO IMPPLEMENTATION REQUIRED
      break;
    case MenuItemId.COPY_STYLE:
      // NO IMPPLEMENTATION REQUIRED
      break;
    case MenuItemId.PASTE:
      // NO IMPPLEMENTATION REQUIRED
      break;
    case MenuItemId.PASTE_STYLE:
      // NO IMPPLEMENTATION REQUIRED
      break;
    case MenuItemId.PASTE_AND_MATCH_STYLE:
      // NO IMPPLEMENTATION REQUIRED
      break;
    case MenuItemId.PASTE_WITH_NOTES:
      break;
    case MenuItemId.DELETE:
      break;
    case MenuItemId.DUPLICATE_SELECTION:
      break;
    case MenuItemId.SELECT_ALL:
      break;
    case MenuItemId.DESELECT_ALL:
      break;

    // Insert menu
    case MenuItemId.INSERT_SECTION:
      selectedWebContentsViewSend("insert-section");
      break
    case MenuItemId.INSERT_COMMENT:
      selectedWebContentsViewSend('insert-comment');
      break
    case MenuItemId.INSERT_BOOKMARK:
      selectedWebContentsViewSend('insert-bookmark');
      break
    case MenuItemId.INSERT_HIGHLIGHT:
      selectedWebContentsViewSend("insert-highlight");
      break
    case MenuItemId.INSERT_LINK:
      selectedWebContentsViewSend("insert-link");
      break
    case MenuItemId.INSERT_IMAGE:
      selectedWebContentsViewSend("insert-image");
      break
    case MenuItemId.INSERT_SYMBOL:
      selectedWebContentsViewSend("insert-symbol");
      break
    case MenuItemId.INSERT_OBJECT:
      selectedWebContentsViewSend("insert-object");
      break
    case MenuItemId.INSERT_TABLE:
      selectedWebContentsViewSend("insert-table");
      break
    case MenuItemId.INSERT_SHAPES_AND_LINES:
      selectedWebContentsViewSend("insert-shapes-and-lines");
      break
    case MenuItemId.INSERT_PAGE_BREAK:
      selectedWebContentsViewSend("insert-page-break");
      break
    case MenuItemId.INSERT_SECTION_BREAK:
      selectedWebContentsViewSend("insert-section-break");
      break
    case MenuItemId.INSERT_LINE_NUMBER_NONE:
      selectedWebContentsViewSend("insert-line-number");
      break
    case MenuItemId.INSERT_LINE_NUMBER_EACH_5_LINE:
      selectedWebContentsViewSend("insert-line-number");
      break
    case MenuItemId.INSERT_LINE_NUMBER_EACH_10_LINE:
      selectedWebContentsViewSend("insert-line-number");
      break
    case MenuItemId.INSERT_LINE_NUMBER_EACH_15_LINE:
      selectedWebContentsViewSend("insert-line-number");
      break
    case MenuItemId.INSERT_PAGE_NUMBER:
      selectedWebContentsViewSend("insert-page-number");
      break
    case MenuItemId.INSERT_DATE:
      selectedWebContentsViewSend("insert-date");
      break
    case MenuItemId.INSERT_DATE_AND_TIME:
      selectedWebContentsViewSend("insert-date-and-time");
      break
    case MenuItemId.INSERT_AUTHOR:
      selectedWebContentsViewSend("insert-author");
      break
    case MenuItemId.INSERT_TITLE:
      selectedWebContentsViewSend("insert-title");
      break

    // References menu
    case MenuItemId.INSERT_NOTE:
      selectedWebContentsViewSend("add-note");
      break
    case MenuItemId.INSERT_NOTE_IN_INNER_MARGIN:
      selectedWebContentsViewSend("add-note-in-inner-margin");
      break
    case MenuItemId.INSERT_NOTE_IN_OUTER_MARGIN:
      selectedWebContentsViewSend("add-note-in-outer-margin");
      break
    case MenuItemId.SWAP_MARGIN:
      selectedWebContentsViewSend("swap-margin");
      break
    case MenuItemId.ADD_READING_SEPARATOR:
      selectedWebContentsViewSend("add-reading-separator");
      break
    case MenuItemId.ADD_SIGLUM:
      selectedWebContentsViewSend("add-siglum");
      break
    case MenuItemId.SIGLA_SETUP:
      selectedWebContentsViewSend("sigla-setup");
      break
    case MenuItemId.ADD_CITATION:
      selectedWebContentsViewSend("add-citation");
      break
    case MenuItemId.ADD_BIBLIOGRAPHY:
      selectedWebContentsViewSend("bibliography");
      break
    case MenuItemId.REFERENCES_FORMAT:
      selectedWebContentsViewSend("references-format");
      break
    case MenuItemId.ADD_APPARATUS_CRITICAL:
      selectedWebContentsViewSend("add-apparatus", "CRITICAL");
      break
    case MenuItemId.ADD_APPARATUS_PAGE_NOTES:
      selectedWebContentsViewSend("add-apparatus", "PAGE_NOTES");
      break
    case MenuItemId.ADD_APPARATUS_SECTION_NOTES:
      selectedWebContentsViewSend("add-apparatus", "SECTION_NOTES");
      break
    case MenuItemId.ADD_APPARATUS_INNER_MARGIN:
      selectedWebContentsViewSend("add-apparatus", "INNER_MARGIN");
      break
    case MenuItemId.ADD_APPARATUS_OUTER_MARGIN:
      selectedWebContentsViewSend("add-apparatus", "OUTER_MARGIN");
      break

    // Format menu
    case MenuItemId.FONT_BOLD:
      selectedWebContentsViewSend("change-character-style", 'bold');
      break
    case MenuItemId.FONT_ITALIC:
      selectedWebContentsViewSend("change-character-style", 'italic');
      break
    case MenuItemId.FONT_UNDERLINE:
      selectedWebContentsViewSend("change-character-style", 'underline');
      break
    case MenuItemId.FONT_STRIKETHROUGH:
      selectedWebContentsViewSend("change-character-style", 'strikethrough');
      break
    case MenuItemId.FONT_SUPERSCRIPT:
      selectedWebContentsViewSend("change-character-style", 'superscript');
      break
    case MenuItemId.FONT_SUBSCRIPT:
      selectedWebContentsViewSend("change-character-style", 'subscript');
      break
    case MenuItemId.FONT_NPC:
      selectedWebContentsViewSend("toggle-npc", 'npc');
      break
    case MenuItemId.FONT_CAPTALIZATION_ALL_CAPS:
      selectedWebContentsViewSend("change-character-style", 'all-caps');
      break
    case MenuItemId.FONT_CAPTALIZATION_SMALL_CAPS:
      selectedWebContentsViewSend("change-character-style", 'small-caps');
      break
    case MenuItemId.FONT_CAPTALIZATION_TITLE_CASE:
      selectedWebContentsViewSend("change-character-style", 'title-case');
      break
    case MenuItemId.FONT_CAPTALIZATION_START_CASE:
      selectedWebContentsViewSend("change-character-style", 'start-case');
      break
    case MenuItemId.FONT_CAPTALIZATION_NONE:
      selectedWebContentsViewSend("change-character-style", 'none-case');
      break
    case MenuItemId.FONT_LIGATURE_DEFAULT:
      selectedWebContentsViewSend("set-font-ligature", "standard");
      break
    case MenuItemId.FONT_LIGATURE_NONE:
      selectedWebContentsViewSend("set-font-ligature", "none");
      break
    case MenuItemId.FONT_LIGATURE_ALL:
      selectedWebContentsViewSend("set-font-ligature", "all");
      break
    case MenuItemId.FONT_CHARACTER_SPACING_NORMAL:
      selectedWebContentsViewSend("change-character-spacing", "normal");
      break
    case MenuItemId.FONT_CHARACTER_SPACING_TIGHTEN:
      selectedWebContentsViewSend("change-character-spacing", "decrease");
      break
    case MenuItemId.FONT_CHARACTER_SPACING_LOOSEN:
      selectedWebContentsViewSend("change-character-spacing", "increase");
      break
    case MenuItemId.TEXT_ALIGN_LEFT:
      selectedWebContentsViewSend("change-alignment", "left");
      break
    case MenuItemId.TEXT_ALIGN_CENTER:
      selectedWebContentsViewSend("change-alignment", "center");
      break
    case MenuItemId.TEXT_ALIGN_RIGHT:
      selectedWebContentsViewSend("change-alignment", "right");
      break
    case MenuItemId.TEXT_ALIGN_JUSTIFY:
      selectedWebContentsViewSend("change-alignment", "justify");
      break
    case MenuItemId.TEXT_INCREASE_INDENT:
      selectedWebContentsViewSend("change-indent-level", "increase");
      break
    case MenuItemId.TEXT_DECREASE_INDENT:
      selectedWebContentsViewSend("change-indent-level", "decrease");
      break
    case MenuItemId.TEXT_SPACING_SINGLE:
      selectedWebContentsViewSend("set-line-spacing", "1");
      break
    case MenuItemId.TEXT_SPACING_1_15:
      selectedWebContentsViewSend("set-line-spacing", "1.15");
      break
    case MenuItemId.TEXT_SPACING_ONE_AND_HALF:
      selectedWebContentsViewSend("set-line-spacing", "1.5");
      break
    case MenuItemId.TEXT_SPACING_DOUBLE:
      selectedWebContentsViewSend("set-line-spacing", "2");
      break
    case MenuItemId.CUSTOM_SPACING:
      selectedWebContentsViewSend("show-spacing-settings");
      break
    case MenuItemId.LAYOUT_PAGE_SETUP:
      selectedWebContentsViewSend('show-page-setup');
      break
    case MenuItemId.CHANGE_TEMPLATE:
      selectedWebContentsViewSend('receive-open-choose-layout-modal');
      break
    case MenuItemId.PAGE_NUMBER:
      selectedWebContentsViewSend('page-number-settings');
      break
    case MenuItemId.OPEN_LINE_NUMBER_SETTINGS:
      selectedWebContentsViewSend('line-numbers-settings');
      break
    case MenuItemId.OPEN_HEADER_SETTINGS:
      selectedWebContentsViewSend('header-settings');
      break
    case MenuItemId.OPEN_FOOTER_SETTINGS:
      selectedWebContentsViewSend('footer-settings');
      break
    case MenuItemId.OPEN_TOC_SETTINGS:
      selectedWebContentsViewSend('toc-settings');
      break
    case MenuItemId.NUMBER_BULLET:
      selectedWebContentsViewSend("number-bullet");
      break;
    case MenuItemId.UPPER_LETTER_BULLET:
      selectedWebContentsViewSend("upper-letter-bullet");
      break;
    case MenuItemId.LOW_LETTER_BULLET:
      selectedWebContentsViewSend("low-letter-bullet");
      break;
    case MenuItemId.POINT_BULLET:
      selectedWebContentsViewSend("point-bullet");
      break;
    case MenuItemId.CIRCLE_BULLET:
      selectedWebContentsViewSend("circle-bullet");
      break;
    case MenuItemId.SQUARE_BULLET:
      selectedWebContentsViewSend("square-bullet");
      break;
    case MenuItemId.PREVIOUS_NUMBERING:
      selectedWebContentsViewSend("previous-numbering");
      break;
    case MenuItemId.RESUME_NUMBERING:
      selectedWebContentsViewSend("resume-numbering");
      break;
    case MenuItemId.SECTIONS_STYLE:
      selectedWebContentsViewSend("show-sections-style-modal");
      break;

    // Tools menu
    case MenuItemId.MACROS:
      selectedWebContentsViewSend("record");
      break
    case MenuItemId.MACROS_RECORD:
      selectedWebContentsViewSend("record");
      break
    case MenuItemId.DOCUMENT_STATISTICS:
      selectedWebContentsViewSend("document-statistics");
      break
    case MenuItemId.HYPHENATION:
      selectedWebContentsViewSend("hyphenation");
      break
    case MenuItemId.COMPARE_DOCUMENTS:
      selectedWebContentsViewSend("compare-documents");
      break
    case MenuItemId.REVIEW:
      selectedWebContentsViewSend("review");
      break
    case MenuItemId.ACCEPT_ALL_CHANGES:
      selectedWebContentsViewSend("accept-all-changes");
      break
    case MenuItemId.REJECT_ALL_CHANGES:
      selectedWebContentsViewSend("reject-all-changes");
      break
    case MenuItemId.ADD_ONS:
      selectedWebContentsViewSend("addOns");
      break

    // Keyboard menu
    case MenuItemId.SHOW_MAP:
      selectedWebContentsViewSend("show-map");
      break
    case MenuItemId.CUSTOMIZE_SHORTCUTS:
      selectedWebContentsViewSend("customize-shortcuts");
      break
    case MenuItemId.NONE:
      selectedWebContentsViewSend("none");
      break
    case MenuItemId.ARABIC:
      selectedWebContentsViewSend("language");
      break
    case MenuItemId.ARMENIAN:
      selectedWebContentsViewSend("language");
      break
    case MenuItemId.CYRILLIC:
      selectedWebContentsViewSend("language");
      break
    case MenuItemId.LATIN:
      selectedWebContentsViewSend("language");
      break

    // View menu
    case MenuItemId.VIEW_APPARATUS:
      selectedWebContentsViewSend("view-apparatus", data);
      break
    case MenuItemId.HEADER_FOOTER:
      selectedWebContentsViewSend("header-footer");
      break
    case MenuItemId.TABLE_OF_CONTENTS:
      selectedWebContentsViewSend("table-of-contents");
      break
    case MenuItemId.TOOLBAR:
      storeToolbarIsVisible(!readToolbarIsVisible())
      setToolbarVisible(readToolbarIsVisible());
      setApplicationMenu(onClickMenuItem);
      getWebContentsViews().forEach((webContentView) =>
        webContentView.webContents.send(
          "toggle-toolbar",
          readToolbarIsVisible()
        )
      );
      break;
    case MenuItemId.CUSTOMIZE_TOOLBAR:
      selectedWebContentsViewSend("customize-toolbar");
      break
    case MenuItemId.STATUS_BAR:
      selectedWebContentsViewSend("status-bar");
      break
    case MenuItemId.CUSTOMIZE_STATUS_BAR:
      selectedWebContentsViewSend("customize-status-bar");
      break
    case MenuItemId.PRINT_PREVIEW:
      selectedWebContentsViewSend("toggle-print-preview");
      break
    case MenuItemId.SHOW_TABS_ALIGNED_HORIZONTALLY:
      selectedWebContentsViewSend("show-tabs-aligned-horizontally");
      break
    case MenuItemId.SHOW_TABS_ALIGNED_VERTICALLY:
      selectedWebContentsViewSend("show-tabs-aligned-vertically");
      break
    case MenuItemId.ZOOM:
      selectedWebContentsViewSend("zoom");
      break
    case MenuItemId.ENTER_FULL_SCREEN:
      // getBaseWindow()?.maximize()
      // getBaseWindow()?.show()
      // getBaseWindow()?.setFullScreen(true)
      // getBaseWindow()?.setFullScreen(true)
      break
    case MenuItemId.GO_TO_NEXT_PAGE:
      selectedWebContentsViewSend("go-to-next-page");
      break
    case MenuItemId.GO_TO_PREVIOUS_PAGE:
      selectedWebContentsViewSend("go-to-previous-page");
      break
    case MenuItemId.GO_TO_FIRST_PAGE:
      selectedWebContentsViewSend("go-to-first-page");
      break
    case MenuItemId.GO_TO_LAST_PAGE:
      selectedWebContentsViewSend("go-to-last-page");
      break
    case MenuItemId.GO_TO_PAGE:
      selectedWebContentsViewSend("go-to-page");
      break
    case MenuItemId.SYNCHRONIZE_VIEWS:
      selectedWebContentsViewSend("synchronize-views");
      break
    case MenuItemId.SYNCHRONIZE_DOCUMENTS:
      selectedWebContentsViewSend("synchronize-documents");
      break
    case MenuItemId.NON_PRINTING_CHARACTERS:
      selectedWebContentsViewSend("non-printing-characters");
      break
    case MenuItemId.EXPAND_COLLAPSE:
      selectedWebContentsViewSend("expand-collapse");
      break
    case MenuItemId.THESAURUS:
      selectedWebContentsViewSend("thesaurus");
      break

    // Window menu
    case MenuItemId.MINIMIZE:
      selectedWebContentsViewSend("minimize");
      break
    case MenuItemId.ZOOM_WINDOW:
      selectedWebContentsViewSend("zoom-window");
      break
    case MenuItemId.ZOOM_ALL:
      selectedWebContentsViewSend("zoom-all");
      break
    case MenuItemId.FILL:
      selectedWebContentsViewSend("fill");
      break
    case MenuItemId.CENTRE:
      selectedWebContentsViewSend("centre");
      break
    case MenuItemId.MOVE_RESIZE:
      selectedWebContentsViewSend("move-resize");
      break
    case MenuItemId.FULL_SCREEN_TILE:
      selectedWebContentsViewSend("full-screen-tile");
      break
    case MenuItemId.REMOVE_WINDOW_FROM_SET:
      selectedWebContentsViewSend("remove-window-from-set");
      break
    case MenuItemId.MOVE_TO:
      selectedWebContentsViewSend("move-to");
      break
    case MenuItemId.BRING_ALL_TO_FRONT:
      selectedWebContentsViewSend("bring-all-to-front");
      break
    case MenuItemId.SHOW_PREVIOUS_TAB:
      selectedWebContentsViewSend("show-previous-tab");
      break
    case MenuItemId.SHOW_NEXT_TAB:
      selectedWebContentsViewSend("show-next-tab");
      break
    case MenuItemId.MOVE_TAB_TO_NEW_WINDOW:
      selectedWebContentsViewSend("move-tab-to-new-window");
      break
    case MenuItemId.MERGE_ALL_WINDOWS:
      selectedWebContentsViewSend("merge-all-windows");
      break
    case MenuItemId.UNTITLED:
      selectedWebContentsViewSend("untitled");
      break

    // Help menu
    case MenuItemId.HELP:
      selectedWebContentsViewSend("help");
      break
    case MenuItemId.FAQS:
      selectedWebContentsViewSend("faqs");
      break
    case MenuItemId.FORUM:
      selectedWebContentsViewSend("forum");
      break
    case MenuItemId.WHAT_IS_NEW:
      selectedWebContentsViewSend("what-is-new");
      break
    case MenuItemId.REPORT_AN_ISSUE:
      selectedWebContentsViewSend("report-an-issue");
      break
    case MenuItemId.ABOUT:
      // openChildWindow(getRootUrl() + "/about");
      selectedWebContentsViewSend("show-about");
      break

    // Developer menu
    case MenuItemId.RELOAD:
      getSelectedWebContentsView()?.webContents.reload()
      break
    case MenuItemId.TOGGLE_DEV_TOOLS:
      getSelectedWebContentsView()?.webContents.toggleDevTools()
      break

    // Language menu
    case MenuItemId.CHANGE_LANGUAGE_EN:
      changeLanguageGlobal("en");
      break;
    case MenuItemId.CHANGE_LANGUAGE_IT:
      changeLanguageGlobal("it");
      break;
    case MenuItemId.CHANGE_LANGUAGE_DE:
      changeLanguageGlobal("de");
      break;
    case MenuItemId.CHANGE_LANGUAGE_FR:
      changeLanguageGlobal("fr");
      break;
    case MenuItemId.CHANGE_LANGUAGE_ES:
      changeLanguageGlobal("es");
      break;
    default:
      break;
  }
}

const getAppLanguage = (): string => {
  const configPath = path.join(
    app.getPath("appData"),
    "Criterion",
    "config-store",
    "app-settings.json"
  );
  try {
    if (fsSync.existsSync(configPath)) {
      const configData = JSON.parse(fsSync.readFileSync(configPath, "utf8"));
      return configData.language || "en"; // Return language or default to 'en'
    }
  } catch (err) {
    mainLogger.error("Electron", "Error reading app settings", err as Error);
  }
  return "en"; // Default language if file doesn't exist or has errors
};

const initializei18next = async (): Promise<void> => {
  const langTaskId = mainLogger.startTask("Electron", "Starting i18next");
  const appLanguage = getAppLanguage();

  // Store in electron-store for the main process
  storeAppLanguage(appLanguage);

  mainLogger.info("Electron", "App language: " + appLanguage);
  await i18next.use(Backend).init({
    lng: appLanguage, // Use the language from settings
    fallbackLng: "en",
    backend: {
      loadPath: path.join(getLocalesPath(), "{{lng}}/translations.json"),
    },
  });

  mainLogger.endTask(langTaskId, "Electron", "i18next configured");
};

const onBaseWindowReady = async (baseWindow: BaseWindow): Promise<void> => {
  const route = Route.root
  const menuViewMode = routeToMenuMapping[route]
  setMenuViewMode(menuViewMode)

  const selectedContentView = await createWebContentsView(route)
  if (!selectedContentView)
    return

  baseWindow.contentView.addChildView(selectedContentView)
  showWebContentsView(selectedContentView)
  selectedContentView.webContents.focus()
  selectedWebContentsViewSend("receive-open-choose-layout-modal");
}

const initializeApp = async (): Promise<void> => {
  const appTaskId = mainLogger.startTask("Electron", "Starting application");

  await initializei18next();

  await app.whenReady();

  function convertPath(originalPath): string {
    const match = originalPath.match(/^\/([a-zA-Z])\/(.*)$/)
    if (match) {
      return `${match[1]}:/${match[2]}`
    } else {
      return originalPath
    }
  }

  // PROTOCOL API (for local resources)
  protocol.handle('local-resource', async (request) => {
    const decodedUrl = decodeURIComponent(
      request.url.replace(new RegExp(`^local-resource://`, 'i'), '/')
    )
    const fullPath = process.platform === 'win32' ? convertPath(decodedUrl) : decodedUrl
    return net.fetch(`file://${fullPath}`)
  })

  // TABS API
  ipcMain.handle('tabs:new', async (_, fileType: FileType) => {
    const route = fileTypeToRouteMapping[fileType]
    const webContentsView = await createWebContentsView(route)
    const menuViewMode = routeToMenuMapping[route]
    setMenuViewMode(menuViewMode)
    setApplicationMenu(onClickMenuItem);
    return webContentsView?.webContents.id
  })
  ipcMain.handle('tabs:close', (_, id: number) => {
    const tabs = closeWebContentsViewWithId(id)
    const route = tabs.find((tab) => tab.selected)?.route
    const menuViewMode = routeToMenuMapping[route]
    setMenuViewMode(menuViewMode)
    setApplicationMenu(onClickMenuItem);
  })
  ipcMain.handle('tabs:select', (_, id: number, tabType: TabType) => {
    const route = typeTypeToRouteMapping[tabType]
    const menuViewMode = routeToMenuMapping[route]
    setMenuViewMode(menuViewMode)
    setApplicationMenu(onClickMenuItem);
    setSelectedWebContentsViewWithId(id)
  })
  ipcMain.handle('tabs:reorder', (_, tabIds: number[]) => reorderTabs(tabIds))
  ipcMain.handle('tabs:getAllContentViewsIds', () => getWebContentsViewsIds())
  ipcMain.handle('tabs:getSelectedTabId', () => getSelectedWebContentsViewId())

  // MENU API
  ipcMain.handle('menu:disableReferencesMenuItems', (_, data) => {
    setDisabledReferencesMenuItemsIds(data)
    setApplicationMenu(onClickMenuItem)
  })
  ipcMain.handle('menu:updateViewApparatusesMenuItems', (_, data) => {
    setApparatusSubMenuObjectItems(data)
    setApplicationMenu(onClickMenuItem)
  })

  // SYSTEM API
  ipcMain.handle('system:getUserInfo', () => os.userInfo())

  // APPLICATION API
  ipcMain.handle('application:toolbarIsVisible', () => {
    return readToolbarIsVisible();
  })

  ipcMain.handle('application:toolbarAdditionalItems', () => {
    return readToolbarAdditionalItems();
  })

  // DOCUMENT API
  ipcMain.handle('document:openDocument', () => {
    openDocument(null, onDocumentOpened);
  })
  ipcMain.handle('document:getTemplates', () => {
    const templatesFolderPath = getTemplatesPath();
    const templatesFilenames = fsSync.readdirSync(templatesFolderPath);
    const templates = templatesFilenames
      .filter((filename) => filename.endsWith(".tml"))
      .map(async (filename) => {
        const filePath = path.join(templatesFolderPath, filename);
        const content = await fs.readFile(filePath, "utf8");
        return content
      });

    return Promise.all(templates);
  });
  ipcMain.handle('document:importTemplate', async () => {
    const baseWindow = getBaseWindow();
    if (!baseWindow) return;

    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      defaultPath: path.join(app.getPath("downloads")),
      filters: [{ name: "Files", extensions: ["tml"] }],
    });

    if (result.canceled || result.filePaths.length === 0) return;

    // Selected template file path
    const selectedFilePath = result.filePaths[0];
    const fileNameParsed = path.parse(selectedFilePath);
    const fileName = fileNameParsed.name;
    const fileNameWithExt = fileNameParsed.base;

    // Templates folder path
    const templatesFolderPath = getTemplatesPath();
    const templatesFilenames = fsSync.readdirSync(templatesFolderPath);
    const matchFilenames = templatesFilenames.filter((filename) => filename.includes(fileName));
    const matchFilename = matchFilenames.length > 0

    if (matchFilename) {
      const confirmation = await dialog.showMessageBox(baseWindow, {
        type: "warning",
        buttons: ["Replace", "Cancel"],
        defaultId: 1,
        noLink: true,
        title: "Confirm Replacement",
        message: `A template named "${fileName}" already exists. Do you want to overwrite it?`,
      });

      if (confirmation.response === 1) return
    }

    // Copy the new file to the templates folder
    const destinationPath = path.join(templatesFolderPath, fileNameWithExt);
    await fs.copyFile(selectedFilePath, destinationPath);
  })
  ipcMain.handle('document:createTemplate', async (_, template: unknown, name: string) => {
    const baseWindow = getBaseWindow();
    if (!baseWindow) return

    const templatesFolderPath = getTemplatesPath();
    const fileNameWithExt = name + ".tml";

    // Templates folder path
    const templatesFilenames = fsSync.readdirSync(templatesFolderPath);
    const matchFilenames = templatesFilenames.filter((filename) => filename.includes(name));
    const matchFilename = matchFilenames.length > 0

    if (matchFilename) {
      const confirmation = await dialog.showMessageBox({
        type: "warning",
        buttons: [
          "Replace", // to be translated
          "Cancel", // to be translated
        ],
        defaultId: 1,
        noLink: true,
        title: "Confirm Replacement", // to be translated
        message: `A template named "${fileNameWithExt}" already exists. Do you want to overwrite it?`, // to be translated
      });

      if (confirmation.response === 1) return;
    }

    const newTemplate = {
      name: name,
      type: "PROPRIETARY",
      createdDate: new Date(),
      updatedDate: new Date(),
      ...(template as object),
    }

    const stringifiedTemplate = JSON.stringify(newTemplate, null, 2);

    const destinationPath = path.join(templatesFolderPath, fileNameWithExt);
    await fs.writeFile(destinationPath, stringifiedTemplate);
  })
  ipcMain.handle('document:getApparatuses', () => {
    const document = getCurrentDocument();
    return document?.apparatuses;
  });
  ipcMain.handle('document:setApparatuses', (_, apparatuses) => {
    setCurrentApparatuses(apparatuses)
  });
  ipcMain.handle('document:setLayoutTemplate', (_, layoutTemplate) => {
    setCurrentLayoutTemplate(layoutTemplate)
  });
  ipcMain.handle('document:setPageSetup', (_, pageSetup) => {
    setCurrentPageSetup(pageSetup)
  });
  ipcMain.handle('document:setSort', (_, sort) => {
    setCurrentSort(sort)
  });
  ipcMain.handle('document:setStyles', (_, style) => {
    setCurrentStyles(style)
  });
  ipcMain.handle('document:setParatextual', (_, paratextual) => {
    setCurrentParatextual(paratextual)
  });

  const taskId = mainLogger.startTask("Electron", "Initializing main window");
  initializeMainWindow(onBaseWindowReady);
  mainLogger.endTask(taskId, "Electron", "Main window created");

  const baseWindow = getBaseWindow();

  baseWindow?.on("close", handleAppClose(() => closeApplication()));

  const language = readAppLanguage()
  await i18next.changeLanguage(language);

  await setRecentDocuments();

  setApplicationMenu(onClickMenuItem);

  registerIpcListeners();

  const webContentsView = getSelectedWebContentsView();
  const toolbarContentView = getToolbarWebContentsView();

  toolbarContentView?.webContents.send("language-changed", language);
  webContentsView?.webContents.send("language-changed", language);

  mainLogger.endTask(appTaskId, "Electron", "Application started");
};

// Application start
initializeApp().catch((err) => {
  mainLogger.error("Electron", "Fatal error during startup", err as Error);
});
