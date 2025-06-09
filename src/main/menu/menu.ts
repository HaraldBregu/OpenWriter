import { Menu, MenuItem, MenuItemConstructorOptions } from "electron";
import { mainLogger } from "../shared/logger";
import { is, platform } from "@electron-toolkit/utils";
import { buildFileMenu } from "./items/file-menu";
import { buildEditMenu } from "./items/edit-menu";
import { buildInsertMenu } from "./items/insert-menu";
import { buildReferencesMenu } from "./items/references-menu";
import { buildFormatMenu } from "./items/format-menu";
import { buildViewMenu } from "./items/view-menu";
import { buildHelpMenu } from "./items/help-menu";
import { buildDeveloperMenu } from "./items/developer-menu";
import { buildLanguageMenu } from "./items/language-menu";

export const getShortcutLabel = (shortcut: string): string => {
  const isMacOS = platform.isMacOS

  return shortcut
    .replace(/CmdOrCtrl/g, isMacOS ? '⌘' : 'Ctrl')
    .replace(/Alt/g, isMacOS ? '⌥' : 'Alt')
    .replace(/Shift/g, isMacOS ? '⇧' : 'Shift')
    .replace(/Del/g, isMacOS ? '⌫' : 'Del')
    .replace(/Enter/g, isMacOS ? '⏎' : 'Enter')
    .replace(/Fn/g, isMacOS ? 'fn' : 'Fn')
    .replace(/\+/g, '+'); // Keep "+" signs
};

const buildMenu = (
  onClick: (menuItem: MenuItem) => void,
): Menu => {
  const taskId = mainLogger.startTask("BuildElectronMenu", "Building the Electron menu.");

  const menuTemplate: MenuItemConstructorOptions[] = [];

  // FILE MENU
  menuTemplate.push(buildFileMenu(onClick))
  // EDIT MENU
  menuTemplate.push(buildEditMenu(onClick))
  // INSERT MENU
  menuTemplate.push(buildInsertMenu(onClick))
  // REFERENCES MENU
  menuTemplate.push(buildReferencesMenu(onClick))
  // FORMAT MENU
  menuTemplate.push(buildFormatMenu(onClick))
  // TOOLS MENU
  // menuTemplate.push(buildToolsMenu(onClick))
  // KEYBOARD MENU
  // menuTemplate.push(buildKeyboardMenu(onClick))
  // VIEW MENU
  menuTemplate.push(buildViewMenu(onClick))
  // WINDOW MENU
  // menuTemplate.push(buildWindowMenu(onClick))
  // HELP MENU
  menuTemplate.push(buildHelpMenu(onClick))

  if (is.dev) {
    menuTemplate.push(buildDeveloperMenu(onClick))
    menuTemplate.push(buildLanguageMenu(onClick))
  }

  const menu = Menu.buildFromTemplate(menuTemplate);

  mainLogger.endTask(taskId, "BuildElectronMenu", "Electron menu built successfully.");

  return menu;
}

export const setApplicationMenu = (
  onClick: (menuItem: MenuItem) => void
): Menu => {
  const menu = buildMenu(onClick)
  Menu.setApplicationMenu(menu)
  return menu
}
