import { MenuItem, MenuItemConstructorOptions } from "electron";
import i18next from "i18next";
import { MenuItemId } from "../../shared/types";

export function buildToolsMenu(onClick: (menuItem: MenuItem) => void): MenuItemConstructorOptions {
    return {
        label: i18next.t("menu.tools.label"),
        submenu: [
            {
                label: i18next.t("menu.tools.macros.label"),
                submenu: [
                    {
                        id: MenuItemId.MACROS,
                        label: i18next.t("menu.tools.macros.label"),
                        click: (menuItem: MenuItem): void => onClick(menuItem),
                    },
                    {
                        id: MenuItemId.MACROS_RECORD,
                        label: i18next.t("menu.tools.macros.record"),
                        click: (menuItem: MenuItem): void => onClick(menuItem),
                    },
                ],
            },
            {
                id: MenuItemId.DOCUMENT_STATISTICS,
                label: i18next.t("menu.tools.documentStatistics"),
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
                id: MenuItemId.HYPHENATION,
                label: i18next.t("menu.tools.hyphenation"),
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
                id: MenuItemId.COMPARE_DOCUMENTS,
                label: i18next.t("menu.tools.compareDocuments"),
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
                id: MenuItemId.REVIEW,
                label: i18next.t("menu.tools.review"),
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
                id: MenuItemId.ACCEPT_ALL_CHANGES,
                label: i18next.t("menu.tools.acceptAllChanges"),
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
                id: MenuItemId.REJECT_ALL_CHANGES,
                label: i18next.t("menu.tools.rejectAllChanges"),
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
                id: MenuItemId.ADD_ONS,
                label: i18next.t("menu.tools.addOns"),
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
        ],
    };
}
