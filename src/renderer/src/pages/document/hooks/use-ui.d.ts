interface DocumentUI {
    readonly sidebarOpen: boolean;
    readonly agenticSidebarOpen: boolean;
    readonly toggleSidebar: () => void;
    readonly toggleAgenticSidebar: () => void;
}
export declare function useUI(): DocumentUI;
export {};
