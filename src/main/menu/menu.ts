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
import { buildCriterionMacMenu } from "./items/criterion-mac-menu";
import { buildSettingsMenu } from "./items/settings-menu";
import { setIsNewDocument, setMenuViewMode } from "../shared/constants";
import { MenuViewMode } from "../shared/types";


const buildMenu = (
  onClick: (menuItem: MenuItem) => void,
): Menu => {
  const taskId = mainLogger.startTask("BuildElectronMenu", "Building the Electron menu.");
  const isMacOS = platform.isMacOS;
  const menuTemplate: MenuItemConstructorOptions[] = [];

  let helpMenu = buildHelpMenu(onClick);

  // Menu speciale per macOS
  if (isMacOS) {
    menuTemplate.push(buildCriterionMacMenu(onClick));

    if (Array.isArray(helpMenu?.submenu)) {
      const submenuCopy = [...helpMenu.submenu];
      submenuCopy.pop(); // Remove the last item
      helpMenu = { ...helpMenu, submenu: submenuCopy };
    }
  }

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
  if (helpMenu) {
    menuTemplate.push(helpMenu);
  }

  if (!isMacOS) {
    menuTemplate.push(buildSettingsMenu(onClick));
  }
  if (is.dev) {
    menuTemplate.push(buildDeveloperMenu(onClick))
    menuTemplate.push(buildLanguageMenu(onClick))
  }

  const menu = Menu.buildFromTemplate(menuTemplate);

  mainLogger.endTask(taskId, "BuildElectronMenu", "Electron menu built successfully.");

  return menu;
}

export class ApplicationMenu {
  static #instance: ApplicationMenu | null = null

  private static get instance(): ApplicationMenu {
    if (!ApplicationMenu.#instance)
      ApplicationMenu.#instance = new ApplicationMenu();

    return ApplicationMenu.#instance;
  }

  setMenuViewMode(mode: MenuViewMode): ApplicationMenu {
    setMenuViewMode(mode)
    return ApplicationMenu.instance
  }

  setIsNewDocument(isNew: boolean): ApplicationMenu {
    setIsNewDocument(isNew)
    return ApplicationMenu.instance
  }
  
  build(onClick: (menuItem: MenuItem) => void): ApplicationMenu {
    const menu = buildMenu(onClick)
    Menu.setApplicationMenu(menu)
    return ApplicationMenu.instance
  }

  static setMenuViewMode(mode: MenuViewMode): ApplicationMenu {
    const instance = ApplicationMenu.instance.setMenuViewMode(mode)
    return instance
  }

  static setIsNewDocument(isNew: boolean): ApplicationMenu {
    const instance = ApplicationMenu.instance.setIsNewDocument(isNew)
    return instance
  }

  static build(onClick: (menuItem: MenuItem) => void): ApplicationMenu {
    const instance = ApplicationMenu.instance.build(onClick)
    return instance
  }
}
