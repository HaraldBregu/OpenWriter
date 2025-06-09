import { MenuItem, MenuItemConstructorOptions } from "electron";
import i18next from "i18next";
import { MenuItemId } from "../../shared/types";

export function buildWindowMenu(onClick: (menuItem: MenuItem) => void): MenuItemConstructorOptions {
    return {
        label: i18next.t("menu.window.label"),
        submenu: [
            {
                id: MenuItemId.MINIMIZE,
                label: i18next.t("menu.window.minimise"),
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
                id: MenuItemId.ZOOM_WINDOW,
                label: i18next.t("menu.window.zoom"),
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
                id: MenuItemId.ZOOM_ALL,
                label: i18next.t("menu.window.zoomAll"),
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
                id: MenuItemId.FILL,
                label: i18next.t("menu.window.fill"),
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
                id: MenuItemId.CENTRE,
                label: i18next.t("menu.window.centre"),
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
                id: MenuItemId.MOVE_RESIZE,
                label: i18next.t("menu.window.moveResize"),
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
                id: MenuItemId.FULL_SCREEN_TILE,
                label: i18next.t("menu.window.fullScreenTile"),
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
                id: MenuItemId.REMOVE_WINDOW_FROM_SET,
                label: i18next.t("menu.window.removeWindowFromSet"),
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
                id: MenuItemId.MOVE_TO,
                label: i18next.t("menu.window.moveTo"),
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
                id: MenuItemId.BRING_ALL_TO_FRONT,
                label: i18next.t("menu.window.bringAllToFront"),
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
                id: MenuItemId.SHOW_PREVIOUS_TAB,
                label: i18next.t("menu.window.showPreviousTab"),
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
                id: MenuItemId.SHOW_NEXT_TAB,
                label: i18next.t("menu.window.showNextTab"),
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
                id: MenuItemId.MOVE_TAB_TO_NEW_WINDOW,
                label: i18next.t("menu.window.moveTabToNewWindow"),
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
                id: MenuItemId.MERGE_ALL_WINDOWS,
                label: i18next.t("menu.window.mergeAllWindows"),
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
                id: MenuItemId.UNTITLED,
                label: i18next.t("menu.window.untitled"),
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
        ],
    };
}
