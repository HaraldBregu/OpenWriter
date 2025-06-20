import i18next from 'i18next';
import { MenuItem, MenuItemConstructorOptions } from "electron";
import { MenuItemId } from '../../shared/types';
import { getMenuViewMode } from '../../shared/constants';


export function buildInsertMenu(onClick: (menuItem: MenuItem) => void): MenuItemConstructorOptions {

    const viewMode = getMenuViewMode()

    const menu: MenuItemConstructorOptions = {}
    menu.label = i18next.t("menu.insert.label")
    menu.submenu = [
       /*  {
            id: MenuItemId.INSERT_SECTION,
            label: i18next.t("menu.insert.section"),
            click: (menuItem: MenuItem): void => onClick(menuItem),
            enabled: viewMode === 'critix_editor',
        }, */
        {
            id: MenuItemId.INSERT_COMMENT,
            label: i18next.t("menu.insert.comment"),
            accelerator: "Alt+K",
            click: (menuItem: MenuItem): void => onClick(menuItem),
            enabled: viewMode === 'critix_editor',
        },
        {
            id: MenuItemId.INSERT_BOOKMARK,
            label: i18next.t("menu.insert.bookmark"),
            accelerator: "Alt+B",
            click: (menuItem: MenuItem): void => onClick(menuItem),
            enabled: viewMode === 'critix_editor',
        },
        {
            id: MenuItemId.INSERT_HIGHLIGHT,
            label: i18next.t("menu.insert.highlight"),
            accelerator: "CmdOrCtrl+Shift+H",
            click: (menuItem: MenuItem): void => onClick(menuItem),
            enabled: viewMode === 'critix_editor',
        },
        { type: "separator" },
        {
            id: MenuItemId.INSERT_LINK,
            label: i18next.t("menu.insert.link"),
            accelerator: "CmdOrCtrl+K",
            click: (menuItem: MenuItem): void => onClick(menuItem),
            enabled: viewMode === 'critix_editor',
        },
        {
            id: MenuItemId.INSERT_IMAGE,
            label: i18next.t("menu.insert.image"),
            click: (menuItem: MenuItem): void => onClick(menuItem),
            enabled: viewMode === 'critix_editor',
        },
        {
            id: MenuItemId.INSERT_SYMBOL,
            label: i18next.t("menu.insert.symbol"),
            accelerator: "Alt+Shift+S",
            click: (menuItem: MenuItem): void => onClick(menuItem),
            enabled: viewMode === 'critix_editor',
        },
        // {
        //   id: MenuItemId.INSERT_OBJECT,
        //   label: i18next.t("menu.insert.object"),
        //   click: (menuItem: MenuItem): void => onClick(menuItem),
        // },
        // { type: "separator" },
        // {
        //   id: MenuItemId.INSERT_TABLE,
        //   label: i18next.t("menu.insert.table"),
        //   click: (menuItem: MenuItem): void => onClick(menuItem),
        // },
        // {
        //   id: MenuItemId.INSERT_SHAPES_AND_LINES,
        //   label: i18next.t("menu.insert.shapesAndLines"),
        //   click: (menuItem: MenuItem): void => onClick(menuItem),
        // },
        { type: "separator" },
        {
            id: MenuItemId.INSERT_PAGE_BREAK,
            label: i18next.t("menu.insert.pageBreak"),
            accelerator: "CmdOrCtrl+Enter",
            click: (menuItem: MenuItem): void => onClick(menuItem),
            enabled: viewMode === 'critix_editor',
        },
        {
           id: MenuItemId.INSERT_SECTION_BREAK,
           label: i18next.t("menu.insert.sectionBreak"),
           click: (menuItem: MenuItem): void => onClick(menuItem),
        },
        {
            id: MenuItemId.INSERT_LINE_NUMBER,
            label: i18next.t("menu.insert.lineNumber.label"),
            enabled: viewMode === 'critix_editor',
            // accelerator: "Alt+CmdOrCtrl+N",
            // sublabel: getShortcutLabel("Alt+CmdOrCtrl+N"),
            // click: (menuItem: MenuItem): void => onClick(menuItem),
            type: "submenu",
            submenu: [
                {
                    id: MenuItemId.INSERT_LINE_NUMBER_NONE,
                    label: i18next.t("menu.insert.lineNumber.none"),
                    click: (menuItem: MenuItem): void => onClick(menuItem),
                },
                {
                    id: MenuItemId.INSERT_LINE_NUMBER_EACH_5_LINE,
                    label: i18next.t("menu.insert.lineNumber.each5Line"),
                    click: (menuItem: MenuItem): void => onClick(menuItem),
                },
                {
                    id: MenuItemId.INSERT_LINE_NUMBER_EACH_10_LINE,
                    label: i18next.t("menu.insert.lineNumber.every10Lines"),
                    click: (menuItem: MenuItem): void => onClick(menuItem),
                },
                // {
                //   id: MenuItemId.INSERT_LINE_NUMBER_EACH_15_LINE,
                //   label: i18next.t("menu.insert.lineNumber.every15Lines"),
                //   click: (menuItem: MenuItem): void => onClick(menuItem),
                // },
            ],
        },

        // { type: "separator" },
         {
             id: MenuItemId.INSERT_PAGE_NUMBER,
             label: i18next.t("menu.insert.pageNumber"),
             accelerator: "CmdOrCtrl+Shift+P",
             click: (menuItem: MenuItem): void => onClick(menuItem),
             enabled: true,
         },
        // {
        //   id: MenuItemId.INSERT_DATE,
        //   label: i18next.t("menu.insert.date"),
        //   click: (menuItem: MenuItem): void => onClick(menuItem),
        //   enabled: false,
        // },
        // {
        //   id: MenuItemId.INSERT_DATE_AND_TIME,
        //   label: i18next.t("menu.insert.dateAndTime"),
        //   click: (menuItem: MenuItem): void => onClick(menuItem),
        //   enabled: false,
        // },
        // {
        //   id: MenuItemId.INSERT_AUTHOR,
        //   label: i18next.t("menu.insert.author"),
        //   click: (menuItem: MenuItem): void => onClick(menuItem),
        //   enabled: false,
        // },
        // {
        //   id: MenuItemId.INSERT_TITLE,
        //   label: i18next.t("menu.insert.title"),
        //   click: (menuItem: MenuItem): void => onClick(menuItem),
        //   enabled: false,
        // },
    ]

    return menu
}