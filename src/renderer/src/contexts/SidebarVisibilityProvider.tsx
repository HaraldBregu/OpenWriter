import React, { createContext, useCallback, useMemo, useState } from 'react';

export type ActiveSidebar = 'builtin:agentic' | `extension:${string}` | null;

export interface SidebarVisibilityContextValue {
	activeSidebar: ActiveSidebar;
	setActiveSidebar: (sidebar: ActiveSidebar) => void;
	toggleSidebar: (sidebar: Exclude<ActiveSidebar, null>) => void;
}

export const SidebarVisibilityContext = createContext<SidebarVisibilityContextValue | undefined>(
	undefined
);

export function SidebarVisibilityProvider({
	children,
	initialSidebar = null,
}: {
	children: React.ReactNode;
	initialSidebar?: ActiveSidebar;
}) {
	const [activeSidebar, setActiveSidebar] = useState<ActiveSidebar>(initialSidebar);

	const toggleSidebar = useCallback((sidebar: Exclude<ActiveSidebar, null>) => {
		setActiveSidebar((prev) => (prev === sidebar ? null : sidebar));
	}, []);

	const value = useMemo<SidebarVisibilityContextValue>(
		() => ({ activeSidebar, setActiveSidebar, toggleSidebar }),
		[activeSidebar, toggleSidebar]
	);

	return (
		<SidebarVisibilityContext.Provider value={value}>
			{children}
		</SidebarVisibilityContext.Provider>
	);
}
