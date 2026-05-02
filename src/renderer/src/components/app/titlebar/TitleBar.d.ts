import React from 'react';
export interface TitleBarProps {
    /** Text displayed centered in the title bar */
    title?: string;
    /** Called when the sidebar toggle button is clicked */
    onToggleSidebar?: () => void;
    /** Called when the back navigation button is clicked */
    onNavigateBack?: () => void;
    /** Called when the forward navigation button is clicked */
    onNavigateForward?: () => void;
    /** When true, renders agentic + info sidebar toggle buttons on the right */
    showSidebarToggles?: boolean;
}
export declare const TitleBar: React.NamedExoticComponent<TitleBarProps>;
