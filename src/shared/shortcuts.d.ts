export declare const ShortcutId: {
    /** Open the command palette that lists workspace documents. */
    readonly openDocumentList: "openDocumentList";
    /** Open the app-wide search modal. */
    readonly openAppSearch: "openAppSearch";
    /** Create a new document in the current workspace. */
    readonly newDocument: "newDocument";
};
export type ShortcutId = (typeof ShortcutId)[keyof typeof ShortcutId];
/** Human-readable key label per platform. Used in UI hints. */
export interface ShortcutBinding {
    mac: string;
    win: string;
    linux: string;
}
export declare const SHORTCUT_BINDINGS: Record<ShortcutId, ShortcutBinding>;
/**
 * Electron-format accelerator per shortcut.
 * `CmdOrCtrl` resolves to ⌘ on macOS and Ctrl on Windows/Linux.
 */
export declare const SHORTCUT_ACCELERATORS: Record<ShortcutId, string>;
export type Platform = 'mac' | 'win' | 'linux';
export declare function getShortcutLabel(id: ShortcutId, platform: Platform): string;
