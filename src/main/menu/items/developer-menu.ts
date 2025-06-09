import { MenuItem, MenuItemConstructorOptions } from "electron";
import i18next from "i18next";
import { MenuItemId } from '../../shared/types';

export function buildDeveloperMenu(onClick: (menuItem: MenuItem) => void): MenuItemConstructorOptions {
    return {
        label: "Developer",
        submenu: [
            {
                id: MenuItemId.RELOAD,
                label: i18next.t("menu.reload"),
                accelerator: "CmdOrCtrl+R",
                click: (menuItem: MenuItem): void => onClick(menuItem)
            },
            {
                id: MenuItemId.TOGGLE_DEV_TOOLS,
                label: i18next.t("menu.toggleDevTools"),
                accelerator: "Alt+CmdOrCtrl+I",
                click: (menuItem: MenuItem): void => onClick(menuItem)
            }
        ]
    };
}
