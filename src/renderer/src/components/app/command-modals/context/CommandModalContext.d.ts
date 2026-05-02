export type CommandModalId = 'documents' | 'search';
export interface CommandModalContextValue {
    activeModal: CommandModalId | null;
    open: (modal: CommandModalId) => void;
    close: () => void;
    toggle: (modal: CommandModalId) => void;
}
export declare const CommandModalContext: import("react").Context<CommandModalContextValue | null>;
export declare function useCommandModal(): CommandModalContextValue;
