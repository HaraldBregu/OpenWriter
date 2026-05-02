import { useContext } from 'react';
import { SidebarVisibilityContext, } from '../contexts/SidebarVisibilityProvider';
export function useSidebarVisibility() {
    const ctx = useContext(SidebarVisibilityContext);
    if (ctx === undefined)
        throw new Error('useSidebarVisibility must be used within an AppProvider');
    return ctx;
}
