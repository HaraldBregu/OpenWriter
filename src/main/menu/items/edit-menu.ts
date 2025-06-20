import i18next from 'i18next';
import { MenuItem, MenuItemConstructorOptions } from "electron";
import { MenuItemId } from '../../shared/types';
import { getMenuViewMode } from '../../shared/constants';


export function buildEditMenu(onClick: (menuItem: MenuItem) => void): MenuItemConstructorOptions {

    const viewMode = getMenuViewMode()

    const menu: MenuItemConstructorOptions = {}
    menu.label = i18next.t("menu.edit.label")
    menu.submenu = [
        {
            label: i18next.t("menu.edit.find.label"),
            enabled: viewMode === 'critix_editor',
            submenu: [
                {
                    id: MenuItemId.FIND_AND_REPLACE,
                    label: i18next.t("menu.edit.find.findAndReplace"),
                    accelerator: "CmdOrCtrl+F",
                    click: (menuItem: MenuItem): void => onClick(menuItem),
                },
                {
                    id: MenuItemId.FIND_NEXT,
                    label: i18next.t("menu.edit.find.findNext"),
                    accelerator: "CmdOrCtrl+G",
                    click: (menuItem: MenuItem): void => onClick(menuItem),
                },
                {
                    id: MenuItemId.FIND_PREVIOUS,
                    label: i18next.t("menu.edit.find.findPrevious"),
                    accelerator: "Shift+CmdOrCtrl+G",
                    click: (menuItem: MenuItem): void => onClick(menuItem),
                },
                { type: 'separator' },
                {
                    id: MenuItemId.JUMP_TO_SELECTION,
                    label: i18next.t("menu.edit.find.jumpToSelection"),
                    accelerator: "CmdOrCtrl+J",
                    click: (menuItem: MenuItem): void => onClick(menuItem),
                },
            ],
        },
        {
            id: MenuItemId.UNDO,
            label: i18next.t("menu.edit.undo"),
            submenu: [],
            accelerator: "CmdOrCtrl+Z",
            enabled: viewMode === 'critix_editor',
            click: (menuItem: MenuItem): void => onClick(menuItem),
        },
        {
            id: MenuItemId.REDO,
            label: i18next.t("menu.edit.redo"),
            submenu: [],
            accelerator: "Shift+CmdOrCtrl+Z",
            enabled: viewMode === 'critix_editor',
            click: (menuItem: MenuItem): void => onClick(menuItem),
        },
        { type: 'separator' },
        {
            id: MenuItemId.CUT,
            label: i18next.t("menu.edit.cut"),
            accelerator: "CmdOrCtrl+X",
            enabled: viewMode === 'critix_editor',
        },
        {
            id: MenuItemId.COPY,
            label: i18next.t("menu.edit.copy"),
            accelerator: "CmdOrCtrl+C",
            enabled: viewMode === 'critix_editor',
        },
        {
            id: MenuItemId.COPY_STYLE,
            label: i18next.t("menu.edit.copyStyle"),
            accelerator: "CmdOrCtrl+Alt+C",
            click: (menuItem: MenuItem): void => onClick(menuItem),
            enabled: viewMode === 'critix_editor',
        },
        {
            id: MenuItemId.PASTE,
            label: i18next.t("menu.edit.paste"),
            accelerator: "CmdOrCtrl+V",
            click: (menuItem: MenuItem): void => onClick(menuItem),
            enabled: viewMode === 'critix_editor',
        },
        //DEPRECATED
        // {
        //     id: MenuItemId.PASTE_STYLE,
        //     label: i18next.t("menu.edit.pasteStyle"),
        //     accelerator: "Alt+CmdOrCtrl+V",
        //     click: (menuItem: MenuItem): void => onClick(menuItem),
        // },
        // {
        //     id: MenuItemId.PASTE_AND_MATCH_STYLE,
        //     label: i18next.t("menu.edit.pasteAndMatchStyle"),
        //     accelerator: "Shift+CmdOrCtrl+V",
        //     click: (menuItem: MenuItem): void => onClick(menuItem),
        // },
        {
            id: MenuItemId.PASTE_TEXT_WITHOUT_FORMATTING,
            label: i18next.t("menu.edit.pasteTextWithoutFormatting"),
            accelerator: "CmdOrCtrl+Del",
            click: (menuItem: MenuItem): void => onClick(menuItem),
            enabled: viewMode === 'critix_editor',
        },
        {
            id: MenuItemId.DELETE,
            label: i18next.t("menu.edit.delete"),
            accelerator: "CmdOrCtrl+Del",
            click: (menuItem: MenuItem): void => onClick(menuItem),
            enabled: viewMode === 'critix_editor',
        },
        { type: 'separator' },
        {
            id: MenuItemId.DUPLICATE_SELECTION,
            label: i18next.t("menu.edit.duplicateSelection"),
            accelerator: "CmdOrCtrl+D",
            click: (menuItem: MenuItem): void => onClick(menuItem),
            enabled: viewMode === 'critix_editor',
        },
        {
            id: MenuItemId.SELECT_ALL,
            label: i18next.t("menu.edit.selectAll"),
            accelerator: "CmdOrCtrl+A",
            click: (menuItem: MenuItem): void => onClick(menuItem),
            enabled: viewMode === 'critix_editor',
        },
        {
            id: MenuItemId.DESELECT_ALL,
            label: i18next.t("menu.edit.deSelectAll"),
            accelerator: "Shift+CmdOrCtrl+A",
            click: (menuItem: MenuItem): void => onClick(menuItem),
            enabled: viewMode === 'critix_editor',
        },
    ]

    return menu;
}
