import { globalShortcut, WebContentsView, app } from "electron";
import { MenuItemId } from "./types";

// Map of all shortcuts to their corresponding menu item IDs
interface ShortcutMapping {
  shortcut: string;
  menuItemId: string;
}

// Complete list of all shortcuts from menu files
const MENU_SHORTCUTS: ShortcutMapping[] = [
  // Format menu shortcuts
  { shortcut: 'CmdOrCtrl+B', menuItemId: MenuItemId.FONT_BOLD },
  { shortcut: 'CmdOrCtrl+I', menuItemId: MenuItemId.FONT_ITALIC },
  { shortcut: 'CmdOrCtrl+U', menuItemId: MenuItemId.FONT_UNDERLINE },
  { shortcut: 'CmdOrCtrl+T', menuItemId: MenuItemId.FONT_STRIKETHROUGH },
  { shortcut: 'CmdOrCtrl+,', menuItemId: MenuItemId.FONT_SUPERSCRIPT},
  { shortcut: 'CmdOrCtrl+.', menuItemId: MenuItemId.FONT_SUBSCRIPT },
  { shortcut: 'Fn+F7', menuItemId: MenuItemId.FONT_NPC },
  { shortcut: 'CmdOrCtrl+Shift+L', menuItemId: MenuItemId.TEXT_ALIGN_LEFT },
  { shortcut: 'CmdOrCtrl+Shift+E', menuItemId: MenuItemId.TEXT_ALIGN_CENTER },
  { shortcut: 'CmdOrCtrl+Shift+R', menuItemId: MenuItemId.TEXT_ALIGN_RIGHT },
  { shortcut: 'CmdOrCtrl+Shift+J', menuItemId: MenuItemId.TEXT_ALIGN_JUSTIFY },
  { shortcut: 'CmdOrCtrl+_', menuItemId: MenuItemId.TEXT_INCREASE_INDENT },
  { shortcut: 'CmdOrCtrl+-', menuItemId: MenuItemId.TEXT_DECREASE_INDENT },
  { shortcut: 'CmdOrCtrl+1', menuItemId: MenuItemId.TEXT_SPACING_SINGLE },
  { shortcut: 'CmdOrCtrl+2', menuItemId: MenuItemId.TEXT_SPACING_1_15 },
  { shortcut: 'CmdOrCtrl+3', menuItemId: MenuItemId.TEXT_SPACING_ONE_AND_HALF },
  { shortcut: 'CmdOrCtrl+4', menuItemId: MenuItemId.TEXT_SPACING_DOUBLE },
  { shortcut: 'CmdOrCtrl+5', menuItemId: MenuItemId.CUSTOM_SPACING },
  { shortcut: 'CmdOrCtrl+Shift+1', menuItemId: MenuItemId.NUMBER_BULLET },
  { shortcut: 'CmdOrCtrl+Shift+2', menuItemId: MenuItemId.UPPER_LETTER_BULLET },
  { shortcut: 'CmdOrCtrl+Shift+3', menuItemId: MenuItemId.LOW_LETTER_BULLET },
  { shortcut: 'CmdOrCtrl+Shift+4', menuItemId: MenuItemId.POINT_BULLET },
  { shortcut: 'CmdOrCtrl+Shift+5', menuItemId: MenuItemId.CIRCLE_BULLET },
  { shortcut: 'CmdOrCtrl+Shift+6', menuItemId: MenuItemId.RESUME_NUMBERING },
  { shortcut: 'CmdOrCtrl+Shift+7', menuItemId: MenuItemId.PREVIOUS_NUMBERING },
  { shortcut: 'CmdOrCtrl+Shift+K', menuItemId: MenuItemId.REMOVE_LINK },
  { shortcut: 'CmdOrCtrl+Shift+P', menuItemId: MenuItemId.LAYOUT_PAGE_SETUP },

  // View menu shortcuts
  { shortcut: 'CmdOrCtrl+Alt+T', menuItemId: MenuItemId.TABLE_OF_CONTENTS },
  { shortcut: 'CmdOrCtrl+Alt+R', menuItemId: MenuItemId.TOOLBAR },
  { shortcut: 'CmdOrCtrl++', menuItemId: MenuItemId.ZOOM },
  { shortcut: 'Fn+F11', menuItemId: MenuItemId.ENTER_FULL_SCREEN },
  { shortcut: 'CmdOrCtrl+E', menuItemId: MenuItemId.SYNCHRONIZE_VIEWS },
  { shortcut: 'CmdOrCtrl+Shift+Q', menuItemId: MenuItemId.SYNCHRONIZE_DOCUMENTS },
  { shortcut: 'Fn+F7', menuItemId: MenuItemId.NON_PRINTING_CHARACTERS },

  // References menu shortcuts
  { shortcut: 'Fn+F5', menuItemId: MenuItemId.INSERT_NOTE },
  { shortcut: 'Fn+F1', menuItemId: MenuItemId.INSERT_NOTE_IN_INNER_MARGIN },
  { shortcut: 'Fn+F2', menuItemId: MenuItemId.INSERT_NOTE_IN_OUTER_MARGIN },
  { shortcut: 'Fn+F4', menuItemId: MenuItemId.ADD_READING_SEPARATOR },
  { shortcut: 'Fn+F3', menuItemId: MenuItemId.ADD_SIGLUM },
  { shortcut: 'Fn+F6', menuItemId: MenuItemId.SIGLA_SETUP },
  { shortcut: 'CmdOrCtrl+Alt+C', menuItemId: MenuItemId.ADD_CITATION },

  // Edit menu shortcuts
  { shortcut: 'CmdOrCtrl+F', menuItemId: MenuItemId.FIND_AND_REPLACE },
  { shortcut: 'CmdOrCtrl+G', menuItemId: MenuItemId.FIND_NEXT },
  { shortcut: 'Shift+CmdOrCtrl+G', menuItemId: MenuItemId.FIND_PREVIOUS },
  { shortcut: 'CmdOrCtrl+J', menuItemId: MenuItemId.JUMP_TO_SELECTION },
  { shortcut: 'CmdOrCtrl+Z', menuItemId: MenuItemId.UNDO },
  { shortcut: 'Shift+CmdOrCtrl+Z', menuItemId: MenuItemId.REDO },
  { shortcut: 'CmdOrCtrl+X', menuItemId: MenuItemId.CUT },
  { shortcut: 'CmdOrCtrl+C', menuItemId: MenuItemId.COPY },
  { shortcut: 'CmdOrCtrl+V', menuItemId: MenuItemId.PASTE },
  { shortcut: 'CmdOrCtrl+Del', menuItemId: MenuItemId.DELETE },
  { shortcut: 'CmdOrCtrl+D', menuItemId: MenuItemId.DUPLICATE_SELECTION },
  { shortcut: 'CmdOrCtrl+A', menuItemId: MenuItemId.SELECT_ALL },
  { shortcut: 'Shift+CmdOrCtrl+A', menuItemId: MenuItemId.DESELECT_ALL },

  // File menu shortcuts
  { shortcut: 'CmdOrCtrl+N', menuItemId: MenuItemId.NEW_FILE },
  { shortcut: 'CmdOrCtrl+O', menuItemId: MenuItemId.OPEN_FILE },
  { shortcut: 'CmdOrCtrl+Alt+I', menuItemId: MenuItemId.IMPORT_FILE },
  { shortcut: 'CmdOrCtrl+W', menuItemId: MenuItemId.CLOSE_FILE },
  { shortcut: 'CmdOrCtrl+S', menuItemId: MenuItemId.SAVE_FILE },
  { shortcut: 'CmdOrCtrl+Alt+S', menuItemId: MenuItemId.SAVE_FILE_AS },
  { shortcut: 'CmdOrCtrl+Alt+L', menuItemId: MenuItemId.LANGUAGE_AND_REGION },
  { shortcut: 'CmdOrCtrl+Shift+S', menuItemId: MenuItemId.SAVE_AS_TEMPLATE },
  { shortcut: 'CmdOrCtrl+M', menuItemId: MenuItemId.METADATA },
  { shortcut: 'Alt+CmdOrCtrl+P', menuItemId: MenuItemId.LAYOUT_PAGE_SETUP },
  { shortcut: 'CmdOrCtrl+P', menuItemId: MenuItemId.PRINT },

  // Insert menu shortcuts
  { shortcut: 'CmdOrCtrl+K', menuItemId: MenuItemId.INSERT_COMMENT },
  { shortcut: 'CmdOrCtrl+B', menuItemId: MenuItemId.INSERT_BOOKMARK },
  { shortcut: 'CmdOrCtrl+Shift+H', menuItemId: MenuItemId.INSERT_HIGHLIGHT },
  { shortcut: 'CmdOrCtrl+K', menuItemId: MenuItemId.INSERT_LINK },
  { shortcut: 'Alt+Shift+S', menuItemId: MenuItemId.INSERT_SYMBOL },
  { shortcut: 'CmdOrCtrl+Enter', menuItemId: MenuItemId.INSERT_PAGE_BREAK },

  // Help menu shortcuts
  { shortcut: 'CmdOrCtrl+Alt+F', menuItemId: MenuItemId.HELP },
  { shortcut: 'CmdOrCtrl+H', menuItemId: MenuItemId.FAQS },

  // Developer menu shortcuts
  { shortcut: 'CmdOrCtrl+R', menuItemId: MenuItemId.RELOAD },
  { shortcut: 'Alt+CmdOrCtrl+I', menuItemId: MenuItemId.TOGGLE_DEV_TOOLS },
];

export function registerGlobalShortcut(webContentsView: WebContentsView): void {
  // Unregister any existing shortcuts first
  globalShortcut.unregisterAll();

  // Register dev tools shortcut
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    webContentsView?.webContents.toggleDevTools();
  });

  // Register all menu shortcuts
  MENU_SHORTCUTS.forEach(({ shortcut, menuItemId }) => {
    globalShortcut.register(shortcut, () => {
      webContentsView.webContents.send('shortcut-command', {
        shortcut: shortcut,
        menuItemId: menuItemId
      });
    });
  });

  // Clean up on app quit
  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
  });
}