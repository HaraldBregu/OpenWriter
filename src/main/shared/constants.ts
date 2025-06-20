import { MenuViewMode } from "./types";


let viewMode: MenuViewMode = "critix_editor"
export const setMenuViewMode = (mode: MenuViewMode): void => { viewMode = mode }
export const getMenuViewMode = (): MenuViewMode => viewMode

let isNewDocument = true;
export const setIsNewDocument = (isNew: boolean): void => { isNewDocument = isNew }
export const getIsNewDocument = (): boolean => isNewDocument

export const Route = {
    root: "/",
    fileViewer: "/file-viewer"
} satisfies Record<string, WebContentsRoute>;

export const routeToMenuMapping: Record<WebContentsRoute, MenuViewMode> = {
    "/": "critix_editor",
    "/file-viewer": "file_viewer",
}

export const fileTypeToRouteMapping: Record<FileType, WebContentsRoute> = {
    "critx": "/",
    "pdf": "/file-viewer",
    "png": "/file-viewer",
    "jpg": "/file-viewer",
    "jpeg": "/file-viewer",
}

export const typeTypeToRouteMapping: Record<TabType, WebContentsRoute> = {
    "critx": "/",
    "pdf": "/file-viewer",
    "png": "/file-viewer",
    "jpg": "/file-viewer",
    "jpeg": "/file-viewer",
}

export const defaultSpecialCharacterConfig: CharacterConfiguration[] = [
    { code: 169, character: "Copyright", shortcut: null },
    { code: 8211, character: "En Dash", shortcut: null },
    { code: 8209, character: "Non-breaking Hyphen", shortcut: null },
    { code: 8482, character: "Trademark", shortcut: null },
    { code: 174, character: "Registered", shortcut: null },
];