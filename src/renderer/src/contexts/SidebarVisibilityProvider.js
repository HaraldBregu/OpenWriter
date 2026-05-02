import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useMemo, useState } from 'react';
export const SidebarVisibilityContext = createContext(undefined);
export function SidebarVisibilityProvider({ children, initialSidebar = null, }) {
    const [activeSidebar, setActiveSidebar] = useState(initialSidebar);
    const toggleSidebar = useCallback((sidebar) => {
        setActiveSidebar((prev) => (prev === sidebar ? null : sidebar));
    }, []);
    const value = useMemo(() => ({ activeSidebar, setActiveSidebar, toggleSidebar }), [activeSidebar, toggleSidebar]);
    return (_jsx(SidebarVisibilityContext.Provider, { value: value, children: children }));
}
