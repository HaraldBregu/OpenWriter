import i18next from 'i18next';
import { MenuItem, MenuItemConstructorOptions } from "electron";
import { MenuItemClickHandler, MenuItemId } from '../../shared/types';
import path from "path";
import { getRecentDocuments } from '../../document/document';
import { getIsNewDocument, getMenuViewMode } from '../../shared/constants';

const menuItems = (onClick: MenuItemClickHandler): MenuItemConstructorOptions[] => {
    const items: MenuItemConstructorOptions[] = []

    const viewMode = getMenuViewMode()
    const isNewDocument = getIsNewDocument()

    const recentDocumentsMenu = Array.isArray(getRecentDocuments()) && getRecentDocuments().length > 0 ? [...getRecentDocuments()]
        .map((doc: string) => ({
            id: MenuItemId.OPEN_RECENT_FILE,
            label: path.basename(doc),
            click: (menuItem: MenuItem): void => onClick(menuItem, doc)
        })) : [{
            label: i18next.t("menu.file.noRecentDocuments"),
            enabled: false
        }];

    items.push({
        id: MenuItemId.NEW_FILE,
        label: i18next.t("menu.file.new"),
        accelerator: "CmdOrCtrl+N",
        enabled: true,
        click: (menuItem: MenuItem): void => onClick(menuItem)
    })

    items.push({
        id: MenuItemId.OPEN_FILE,
        label: i18next.t("menu.file.open"),
        accelerator: "CmdOrCtrl+O",
        enabled: true,
        click: (menuItem: MenuItem): void => onClick(menuItem)
    })

    items.push({
        id: MenuItemId.OPEN_RECENT_FILE,
        label: i18next.t("menu.file.openRecent"),
        enabled: true,
        submenu: recentDocumentsMenu,
    })

    items.push({
        id: MenuItemId.IMPORT_FILE,
        label: i18next.t("menu.file.import"),
        accelerator: "CmdOrCtrl+Alt+I",
        enabled: true,
        click: (menuItem: MenuItem): void => onClick(menuItem)
    })

    items.push({ type: "separator" })

    items.push({
        id: MenuItemId.CLOSE_FILE,
        label: i18next.t("menu.file.close"),
        accelerator: "CmdOrCtrl+W",
        enabled: viewMode === 'critix_editor' || viewMode === 'file_viewer',
        click: (menuItem: MenuItem): void => onClick(menuItem),
    })

    items.push({
        id: MenuItemId.SAVE_FILE,
        label: i18next.t("menu.file.save"),
        accelerator: "CmdOrCtrl+S",
        enabled: viewMode === 'critix_editor',
        click: (menuItem: MenuItem): void => onClick(menuItem),
    })

    items.push({
        id: MenuItemId.SAVE_FILE_AS,
        label: i18next.t("menu.file.saveAs"),
        accelerator: "CmdOrCtrl+Alt+S",
        enabled: viewMode === 'critix_editor',
        click: (menuItem: MenuItem): void => onClick(menuItem),
    })

    items.push({
        id: MenuItemId.RENAME_FILE,
        label: i18next.t("menu.file.rename"),
        enabled: viewMode === 'critix_editor' && !isNewDocument,
        click: (menuItem: MenuItem): void => onClick(menuItem),
    })

    items.push({
        id: MenuItemId.MOVE_FILE,
        label: i18next.t("menu.file.moveTo"),
        enabled: viewMode === 'critix_editor' && !isNewDocument,
        click: (menuItem: MenuItem): void => onClick(menuItem),
    })

    items.push({
        id: MenuItemId.REVERT_FILE_TO,
        label: i18next.t("menu.file.revertTo.label"),
        // sublabel: getShortcutLabel('(CmdOrCtrl+S)'),
        submenu: [
            {
                id: MenuItemId.EXPORT_TO_PDF,
                label: i18next.t("menu.file.revertTo.lastSaved"),
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
                id: MenuItemId.EXPORT_TO_ODT,
                label: i18next.t("menu.file.revertTo.browse"),
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
        ],
    })

    items.push({ type: "separator" })

    items.push({
        id: MenuItemId.SHARE_FOR_REVIEW,
        label: i18next.t("menu.file.shareForReview"),
        enabled: viewMode === 'critix_editor',
        click: (menuItem: MenuItem): void => onClick(menuItem),
    })

    items.push({
        id: MenuItemId.LOCK_FILE,
        label: i18next.t("menu.file.lock"),
        enabled: viewMode === 'critix_editor',
        click: (menuItem: MenuItem): void => onClick(menuItem),
    })

    items.push({
        id: MenuItemId.UNLOCK_FILE,
        label: i18next.t("menu.file.unlock"),
        enabled: viewMode === 'critix_editor',
        click: (menuItem: MenuItem): void => onClick(menuItem),
    })

    items.push({ type: "separator" })

    items.push({
        id: MenuItemId.EXPORT_TO,
        label: i18next.t("menu.file.exportTo.label"),
        enabled: viewMode === 'critix_editor',
        submenu: [
            {
                id: MenuItemId.EXPORT_TO_PDF,
                label: i18next.t("menu.file.exportTo.pdf"),
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
                id: MenuItemId.EXPORT_TO_ODT,
                label: i18next.t("menu.file.exportTo.odt"),
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
                id: MenuItemId.EXPORT_TO_XML,
                label: i18next.t("menu.file.exportTo.xml"),
                click: (menuItem: MenuItem): void => onClick(menuItem),
            },
        ],
    })

    items.push({
        id: MenuItemId.LANGUAGE_AND_REGION,
        label: i18next.t("menu.file.language&Region"),
        accelerator: "CmdOrCtrl+Alt+L",
        enabled: true,
        click: (menuItem: MenuItem): void => onClick(menuItem),
    })

    items.push({ type: "separator" })
    items.push({
        id: MenuItemId.SAVE_AS_TEMPLATE,
        label: i18next.t("menu.file.saveAsTemplate"),
        accelerator: "CmdOrCtrl+Shift+S",
        enabled: viewMode === 'critix_editor',
        click: (menuItem: MenuItem): void => onClick(menuItem),
    })

    items.push({ type: "separator" })

    items.push({
        id: MenuItemId.METADATA,
        label: i18next.t("menu.file.metadata"),
        accelerator: "CmdOrCtrl+M",
        enabled: true,
        click: (menuItem: MenuItem): void => onClick(menuItem),
    })

    items.push({ type: "separator" })

    items.push({
        id: MenuItemId.PAGE_SETUP,
        label: i18next.t("menu.file.pageSetup"),
        accelerator: "Alt+CmdOrCtrl+P",
        enabled: viewMode === 'critix_editor',
        click: (menuItem: MenuItem): void => onClick(menuItem),
    })

    items.push({
        id: MenuItemId.PRINT,
        label: i18next.t("menu.file.print"),
        accelerator: "CmdOrCtrl+P",
        enabled: viewMode === 'critix_editor',
        click: (menuItem: MenuItem): void => onClick(menuItem),
    })

    return items
}

export function buildFileMenu(onClick: MenuItemClickHandler): MenuItemConstructorOptions {
    const menu: MenuItemConstructorOptions = {}
    menu.label = i18next.t("menu.file.label")
    menu.submenu = menuItems(onClick)
    return menu
}

export class FileMenu {
    static #instance: FileMenu | null = null

    static get instance(): FileMenu {
      if (!FileMenu.#instance)
        FileMenu.#instance = new FileMenu();
  
      return FileMenu.#instance;
    }

    

    items(onClick: MenuItemClickHandler): MenuItemConstructorOptions {
        return buildFileMenu(onClick)
    }
}



