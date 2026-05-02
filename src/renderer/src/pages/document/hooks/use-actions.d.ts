interface DocumentActions {
    readonly handleTitleChange: (value: string) => void;
    readonly handleContentChange: (value: string) => void;
    readonly handleMoveToTrash: () => Promise<void>;
    readonly handleOpenFolder: () => void;
}
export declare function useActions(triggerSave: () => void): DocumentActions;
export {};
