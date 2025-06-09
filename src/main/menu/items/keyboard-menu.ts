import { MenuItem, MenuItemConstructorOptions } from "electron";
import i18next from "i18next";
import { MenuItemId } from '../../shared/types';

export function buildKeyboardMenu(onClick: (menuItem: MenuItem) => void): MenuItemConstructorOptions {
    return {
        label: i18next.t("menu.keyboard.label"),
        submenu: [
            {
                id: MenuItemId.SHOW_MAP,
                label: i18next.t("menu.keyboard.showMap"),
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
                id: MenuItemId.CUSTOMIZE_SHORTCUTS,
                label: i18next.t("menu.keyboard.customizeShortcuts"),
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
                id: MenuItemId.NONE,
                label: i18next.t("menu.keyboard.none"),
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
                id: MenuItemId.ARABIC,
                label: i18next.t("menu.keyboard.arabic"),
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
                id: MenuItemId.ARMENIAN,
                label: i18next.t("menu.keyboard.armenian"),
                // accelerator: "CmdOrCtrl+S",
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
                id: MenuItemId.CYRILLIC,
                label: i18next.t("menu.keyboard.cyrillic"),
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
                id: MenuItemId.LATIN,
                label: i18next.t("menu.keyboard.latin"),
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
        ],
    };
}
