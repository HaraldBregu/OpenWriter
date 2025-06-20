import { MenuItem, MenuItemConstructorOptions } from "electron";
import i18next from "i18next";
import { MenuItemId } from "../../shared/types";
import { getMenuViewMode } from "../../shared/constants";

let apparatusSubMenuObjectItems: { id: string, title: string, visible: boolean }[] = []
let toolbarVisible = true;
let tocVisible = true;
let enableTocVisibilityMenuItem = true;

export function setEnableTocVisibilityMenuItem(enable: boolean): void {
    enableTocVisibilityMenuItem = enable
}

export function setApparatusSubMenuObjectItems(items: { id: string, title: string, visible: boolean }[]): void {
    apparatusSubMenuObjectItems = items
}

export function setToolbarVisible(visible: boolean): void {
    toolbarVisible = visible
}

export function setTocVisible(visible: boolean): void {
    tocVisible = visible
}

export function buildViewMenu(onClick: (menuItem: MenuItem, data?: unknown) => void): MenuItemConstructorOptions {

    const viewMode = getMenuViewMode()

    const menu: MenuItemConstructorOptions = {}
    menu.label = i18next.t("menu.view.label")

    const apparatusSubMenuItems: MenuItemConstructorOptions[] = []

    apparatusSubMenuObjectItems.forEach((item) => {
        apparatusSubMenuItems.push({
            id: MenuItemId.VIEW_APPARATUS,
            label: item.title,
            type: item.visible ? 'checkbox' : 'normal',
            checked: item.visible,
            click: (menuItem: MenuItem): void => onClick(menuItem, item),
        })
    })

    const subMenuItems: MenuItemConstructorOptions[] = [
        {
            label: i18next.t("menu.view.apparatus.label"),
            enabled: viewMode === 'critix_editor',
            submenu: apparatusSubMenuItems
        },
        {
            id: MenuItemId.HEADER_FOOTER,
            label: i18next.t("menu.view.headerFooter"),
            type: 'normal',
            click: (menuItem: MenuItem): void => onClick(menuItem),
            enabled: viewMode === 'critix_editor',
        },
        {
            id: MenuItemId.TABLE_OF_CONTENTS,
            label: i18next.t("menu.view.tableOfContents"),
            type: 'checkbox',
            checked: tocVisible,
            accelerator: "CmdOrCtrl+Alt+T",
            click: (menuItem: MenuItem): void => onClick(menuItem),
            enabled: viewMode === 'critix_editor' && enableTocVisibilityMenuItem,
        },
        {
            id: MenuItemId.TOOLBAR,
            label: i18next.t("menu.view.toolbar"),
            type: 'checkbox',
            checked: toolbarVisible,
            accelerator: "CmdOrCtrl+Alt+R",
            click: (menuItem: MenuItem): void => onClick(menuItem),
            enabled: viewMode === 'critix_editor',
        },
        {
            id: MenuItemId.CUSTOMIZE_TOOLBAR,
            label: i18next.t("menu.view.customizeToolbar"),
            type: 'normal',
            click: (menuItem: MenuItem): void => onClick(menuItem),
            enabled: viewMode === 'critix_editor',
        },
        {
            id: MenuItemId.STATUS_BAR,
            label: i18next.t("menu.view.statusBar"),
            type: 'normal',
            click: (menuItem: MenuItem): void => onClick(menuItem),
            enabled: viewMode === 'critix_editor',
        },
        {
            id: MenuItemId.CUSTOMIZE_STATUS_BAR,
            label: i18next.t("menu.view.customizeStatusBar"),
            type: 'normal',
            click: (menuItem: MenuItem): void => onClick(menuItem),
            enabled: viewMode === 'critix_editor',
        },
        {
            id: MenuItemId.PRINT_PREVIEW,
            label: i18next.t("menu.view.printPreview"),
            type: 'normal',
            click: (menuItem: MenuItem): void => onClick(menuItem),
            enabled: viewMode === 'critix_editor',
        },
        {
            id: MenuItemId.SHOW_TABS_ALIGNED_HORIZONTALLY,
            label: i18next.t("menu.view.showTabsAlignedHorizontally"),
            type: 'normal',
            click: (menuItem: MenuItem): void => onClick(menuItem),
            enabled: viewMode === 'critix_editor',
        },
        {
            id: MenuItemId.SHOW_TABS_ALIGNED_VERTICALLY,
            label: i18next.t("menu.view.showTabsAlignedVertically"),
            type: 'normal',
            click: (menuItem: MenuItem): void => onClick(menuItem),
            enabled: viewMode === 'critix_editor',
        },
        {
            id: MenuItemId.ZOOM,
            label: i18next.t("menu.view.zoom"),
            accelerator: "CmdOrCtrl++",
            type: 'normal',
            click: (menuItem: MenuItem): void => onClick(menuItem),
            enabled: viewMode === 'critix_editor',
        },
        {
            id: MenuItemId.ENTER_FULL_SCREEN,
            label: i18next.t("menu.view.enterFullScreen"),
            accelerator: "Fn+F11",
            type: 'normal',
            click: (menuItem: MenuItem): void => onClick(menuItem),
            enabled: viewMode === 'critix_editor',
        },
        {
            label: i18next.t("menu.view.goTo.label"),
            enabled: viewMode === 'critix_editor',
            submenu: [
                {
                    id: MenuItemId.GO_TO_NEXT_PAGE,
                    label: i18next.t("menu.view.goTo.nextPage"),
                    type: 'normal',
                    click: (menuItem: MenuItem): void => onClick(menuItem),
                },
                {
                    id: MenuItemId.GO_TO_PREVIOUS_PAGE,
                    label: i18next.t("menu.view.goTo.previousPage"),
                    type: 'normal',
                    click: (menuItem: MenuItem): void => onClick(menuItem),
                },
                {
                    id: MenuItemId.GO_TO_FIRST_PAGE,
                    label: i18next.t("menu.view.goTo.firstPage"),
                    type: 'normal',
                    click: (menuItem: MenuItem): void => onClick(menuItem),
                },
                {
                    id: MenuItemId.GO_TO_LAST_PAGE,
                    label: i18next.t("menu.view.goTo.lastPage"),
                    type: 'normal',
                    click: (menuItem: MenuItem): void => onClick(menuItem),
                },
                {
                    id: MenuItemId.GO_TO_PAGE,
                    label: i18next.t("menu.view.goTo.page"),
                    type: 'normal',
                    click: (menuItem: MenuItem): void => onClick(menuItem),
                },
            ],
        },
        {
            id: MenuItemId.SYNCHRONIZE_VIEWS,
            label: i18next.t("menu.view.synchronizeViews"),
            accelerator: "CmdOrCtrl+E",
            type: 'normal',
            click: (menuItem: MenuItem): void => onClick(menuItem),
            enabled: viewMode === 'critix_editor',
        },
        {
            id: MenuItemId.SYNCHRONIZE_DOCUMENTS,
            label: i18next.t("menu.view.synchronizeDocuments"),
            accelerator: "CmdOrCtrl+Shift+Q",
            type: 'normal',
            click: (menuItem: MenuItem): void => onClick(menuItem),
            enabled: viewMode === 'critix_editor',
        },
        {
            id: MenuItemId.EXPAND_COLLAPSE,
            label: i18next.t("menu.view.expandCollapse"),
            type: 'normal',
            click: (menuItem: MenuItem): void => onClick(menuItem),
            enabled: viewMode === 'critix_editor',
        },
        {
            id: MenuItemId.THESAURUS,
            label: i18next.t("menu.view.thesaurus"),
            type: 'normal',
            click: (menuItem: MenuItem): void => onClick(menuItem),
            enabled: viewMode === 'critix_editor',
        },
    ]

    menu.submenu = subMenuItems

    return menu
}
