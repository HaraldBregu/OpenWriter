import { jsx as _jsx } from "react/jsx-runtime";
import { memo } from 'react';
import { SidebarInset } from '@/components/ui/Sidebar';
export const SidebarPageContainer = memo(function Sidebar({ children, }) {
    return (_jsx("div", { className: "flex flex-1 min-h-0 w-full", style: {
            backgroundColor: 'var(--sidebar-background, hsl(var(--sidebar-background)))',
        }, children: children }));
});
export const SidebarPageInset = memo(function SidebarInsetLayout({ children, }) {
    return (_jsx(SidebarInset, { className: "flex flex-col flex-1 min-h-0 min-w-0", children: _jsx("main", { className: "flex-1 overflow-y-auto overflow-x-hidden", style: {
                backgroundColor: 'var(--page-background, hsl(var(--background)))',
            }, children: children }) }));
});
