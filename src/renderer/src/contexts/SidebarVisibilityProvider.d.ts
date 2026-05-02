import React from 'react';
export type ActiveSidebar = `extension:${string}` | null;
export interface SidebarVisibilityContextValue {
    activeSidebar: ActiveSidebar;
    setActiveSidebar: (sidebar: ActiveSidebar) => void;
    toggleSidebar: (sidebar: Exclude<ActiveSidebar, null>) => void;
}
export declare const SidebarVisibilityContext: React.Context<SidebarVisibilityContextValue | undefined>;
export declare function SidebarVisibilityProvider({ children, initialSidebar, }: {
    children: React.ReactNode;
    initialSidebar?: ActiveSidebar;
}): import("react/jsx-runtime").JSX.Element;
