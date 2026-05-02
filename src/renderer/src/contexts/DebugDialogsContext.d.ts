import type { ReactNode } from 'react';
interface DebugDialogsContextValue {
    openTasksDialog: () => void;
    openReduxDialog: () => void;
    openLogDialog: () => void;
    openCronDialog: () => void;
}
export declare function DebugDialogsProvider({ children }: {
    children: ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare function useDebugDialogs(): DebugDialogsContextValue;
export {};
