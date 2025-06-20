import { MenuItem, MenuItemConstructorOptions } from "electron";
import i18next from "i18next";
import { MenuItemId } from '../../shared/types';

export function buildHelpMenu(onClick: (menuItem: MenuItem) => void): MenuItemConstructorOptions {
    return {
        label: i18next.t("menu.help.label"),
        submenu: [
            {
                id: MenuItemId.HELP,
                label: i18next.t("menu.help.criterionHelp"),
                accelerator: "CmdOrCtrl+H",
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            { type: 'separator' },
            {
                id: MenuItemId.FAQS,
                label: i18next.t("menu.help.faqs"),
                accelerator: "CmdOrCtrl+H",
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
                id: MenuItemId.FORUM,
                label: i18next.t("menu.help.forum"),
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
                id: MenuItemId.WHAT_IS_NEW,
                label: i18next.t("menu.help.whatsNewInCriterion"),
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
                id: MenuItemId.REPORT_AN_ISSUE,
                label: i18next.t("menu.help.reportAnIssue"),
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
             {
                id: MenuItemId.CRITERION_FEEDBACK,
                label: i18next.t("menu.help.criterionFeedback"),
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
             {
                id: MenuItemId.CHECK_UPDATES,
                label: i18next.t("menu.help.checkUpdates"),
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
                id: MenuItemId.ABOUT,
                label: i18next.t("menu.help.about"),
                click: (menuItem: MenuItem): void => onClick(menuItem),
            }
        ],
    };
}
