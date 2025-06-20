import { MenuItem, MenuItemConstructorOptions } from "electron";
import { MenuItemId } from "../../shared/types";
import i18next from "i18next";

export const buildCriterionMacMenu = (
    onClick: (menuItem: MenuItem) => void
): MenuItemConstructorOptions => {
    return {
        label: 'Criterion',
        submenu: [
            {
                id: MenuItemId.ABOUT,
                label: i18next.t("menu.help.about"),
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
                id: MenuItemId.CHECK_UPDATES,
                label: 'Check for Updates',
                click: (item) => onClick(item)
            },
            { type: 'separator' },
            {
                id: MenuItemId.PREFERENCES,
                label: 'Preferences',
                accelerator: 'CmdOrCtrl+Shift+O',
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            { type: 'separator' },
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
                id: MenuItemId.CRITERION_FEEDBACK,
                label: 'Provide Criterion Feedback',
                click: (item) => onClick(item)
            },
            { type: 'separator' },
            {
                role: 'hide',
                label: 'Hide Criterion'
            },
            { role: 'hideOthers' },
            {
                role: 'unhide',
                label: 'Show All'
            },
            { type: 'separator' },
            {
                role: 'quit',
                label: 'Quit Criterion'
            }
        ]
    };
};