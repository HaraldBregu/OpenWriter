import { MenuViewMode } from "./types";


let viewMode: MenuViewMode = "critix_editor"

export const setMenuViewMode = (mode: MenuViewMode): void => {
    viewMode = mode
}

export const getMenuViewMode = (): MenuViewMode => viewMode

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