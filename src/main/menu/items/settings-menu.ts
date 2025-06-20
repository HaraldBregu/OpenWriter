import { MenuItem, MenuItemConstructorOptions } from "electron";
import { MenuItemId } from "../../shared/types";

export const buildSettingsMenu = (
    onClick: (menuItem: MenuItem) => void
): MenuItemConstructorOptions => {
    return {
        label: 'Settings',
        submenu: [
            // {
            //     id: 'sign-in',
            //     label: 'Sign In',
            //     click: (item) => onClick(item)
            // },
            // {
            //     id: 'notifications',
            //     label: 'Notifications',
            //     enabled: false,
            //     click: (item) => onClick(item)
            // },
            // {
            //     id: 'shared-files',
            //     label: 'Shared Files',
            //     enabled: false,
            //     click: (item) => onClick(item)
            // },
            {
                id: MenuItemId.PREFERENCES,
                label: 'Preferences',
                accelerator: 'CmdOrCtrl+Shift+O',
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
        ]
    };
};