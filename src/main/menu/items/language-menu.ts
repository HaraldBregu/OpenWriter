import { MenuItem, MenuItemConstructorOptions } from "electron";
import i18next from "i18next";
import { MenuItemId } from '../../shared/types';

export function buildLanguageMenu(onClick: (menuItem: MenuItem) => void): MenuItemConstructorOptions {
    return {
        label: i18next.t("menu.language.label"),
        submenu: [
            {
                id: MenuItemId.CHANGE_LANGUAGE_EN,
                label: i18next.t("menu.language.en"),
                //accelerator: "CmdOrCtrl+shift+4",
                click: (menuItem: MenuItem): void => onClick(menuItem)
            },
            {
                id: MenuItemId.CHANGE_LANGUAGE_IT,
                label: i18next.t("menu.language.it"),
                //accelerator: "CmdOrCtrl+shift+3",
                click: (menuItem: MenuItem): void => onClick(menuItem)
            },
            {
                id: MenuItemId.CHANGE_LANGUAGE_DE,
                label: i18next.t("menu.language.de"),
                //accelerator: "CmdOrCtrl+shift+2",
                click: (menuItem: MenuItem): void => onClick(menuItem)
            },
            {
                id: MenuItemId.CHANGE_LANGUAGE_ES,
                label: i18next.t("menu.language.es"),
                //accelerator: "CmdOrCtrl+shift+1",
                click: (menuItem: MenuItem): void => onClick(menuItem)
            },
            {
                id: MenuItemId.CHANGE_LANGUAGE_FR,
                label: i18next.t("menu.language.fr"),
                //accelerator: "CmdOrCtrl+shift+0",
                click: (menuItem: MenuItem): void => onClick(menuItem)
            }
        ]
    };
}
