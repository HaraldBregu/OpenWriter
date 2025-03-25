import { useEffect } from "react";
import { Editor } from "@tiptap/react";

/**
 * Interfaccia per le callback di sottoscrizione agli eventi di Electron
 */
interface EditorSubscriptions {
    onCapitalizationChange?: (type: string) => void;
    onCharacterSpacingChange?: (type: string) => void;
    onCharacterStyleChange?: (type: string) => void;
    onListStyleChange?: (type: string) => void;
    onTextAlignmentChange?: (type: string) => void;
    onIndentLevelChange?: (increase: boolean) => void;
    onShowSpacingSettings?: () => void;
    onSetSpacing?: (space: string) => void;
    onLigatureChange?: (type: string) => void;
}

/**
 * @param activeEditor
 * @param subscriptions
 */
function useEditorSubscriptions(activeEditor: Editor | null, subscriptions: EditorSubscriptions) {
    useEffect(() => {
        if (!window.electron) return;

        const unsubscribers: Array<() => void> = [];

        if (subscriptions.onCapitalizationChange) {
            // unsubscribers.push(window.electron.onCapitalizationChange(subscriptions.onCapitalizationChange));
            unsubscribers.push(
                window.electron.ipcRenderer.on('change-capitalization', (_: any, type: string) => {
                    subscriptions.onCapitalizationChange?.(type)
                })
            )
        }

        if (subscriptions.onCharacterSpacingChange) {
            // unsubscribers.push(window.electron.onCharacterSpacingChange(subscriptions.onCharacterSpacingChange));
            unsubscribers.push(
                window.electron.ipcRenderer.on('change-character-spacing', (_: any, type: string) => {
                    subscriptions.onCharacterSpacingChange?.(type)
                })
            )

        }

        if (subscriptions.onCharacterStyleChange) {
            // unsubscribers.push(window.electron.onCharacterStyleChange(subscriptions.onCharacterStyleChange));
            unsubscribers.push(
                window.electron.ipcRenderer.on('change-character-style', (_: any, type: string) => {
                    subscriptions.onCharacterStyleChange?.(type)
                })
            )
        }

        if (subscriptions.onListStyleChange) {
            // unsubscribers.push(window.electron.onListStyleChange(subscriptions.onListStyleChange));
            unsubscribers.push(
                window.electron.ipcRenderer.on('change-list-style', (_: any, type: string) => {
                    subscriptions.onListStyleChange?.(type)
                })
            )

        }

        if (subscriptions.onTextAlignmentChange) {
            //unsubscribers.push(window.electron.onTextAlignmentChange(subscriptions.onTextAlignmentChange));
            unsubscribers.push(
                window.electron.ipcRenderer.on('change-text-alignment-style', (_: any, type: string) => {
                    subscriptions.onTextAlignmentChange?.(type)
                })
            )
        }

        if (subscriptions.onIndentLevelChange) {
            //unsubscribers.push(window.electron.onIndentLevelChange(subscriptions.onIndentLevelChange));
            unsubscribers.push(
                window.electron.ipcRenderer.on('change-indent-level', (_: any, increase: boolean) => {
                    subscriptions.onIndentLevelChange?.(increase)
                })
            )
        }

        if (subscriptions.onShowSpacingSettings) {
            //    unsubscribers.push(window.electron.onShowSpacingSettings(subscriptions.onShowSpacingSettings));
            unsubscribers.push(
                window.electron.ipcRenderer.on('show-spacing-settings', (_: any) => {
                    subscriptions.onShowSpacingSettings?.()
                })
            )
        }

        if (subscriptions.onSetSpacing) {
            // unsubscribers.push(window.electron.onSetSpacing(subscriptions.onSetSpacing));
            unsubscribers.push(
                window.electron.ipcRenderer.on('set-spacing-level', (_: any, space: string) => {
                    subscriptions.onSetSpacing?.(space)
                })
            )
        }

        if (subscriptions.onLigatureChange) {
            // unsubscribers.push(window.electron.onLigatureChange(subscriptions.onLigatureChange));
            unsubscribers.push(
                window.electron.ipcRenderer.on('set-font-ligature', (_: any, type: string) => {
                    subscriptions.onLigatureChange?.(type)
                })
            )
        }

        return () => {
            unsubscribers.forEach((unsubscribe) => {
                if (typeof unsubscribe === "function") {
                    unsubscribe();
                }
            });
        };
    }, [activeEditor, subscriptions]);
}

export default useEditorSubscriptions;
