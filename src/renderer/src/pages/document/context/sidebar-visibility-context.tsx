import React, { createContext, useCallback, useContext, useState } from 'react';

export type ActiveSidebar = 'config' | 'agentic' | 'editor' | null;

interface SidebarVisibilityContextValue {
	activeSidebar: ActiveSidebar;
	setActiveSidebar: (sidebar: ActiveSidebar) => void;
	toggleSidebar: (sidebar: Exclude<ActiveSidebar, null>) => void;
}

const SidebarVisibilityContext = createContext<SidebarVisibilityContextValue | null>(null);

interface SidebarVisibilityProviderProps {
	readonly children: React.ReactNode;
}

export function SidebarVisibilityProvider({
	children,
}: SidebarVisibilityProviderProps): React.JSX.Element {
	const [activeSidebar, setActiveSidebar] = useState<ActiveSidebar>('config');

	const toggleSidebar = useCallback((sidebar: Exclude<ActiveSidebar, null>) => {
		setActiveSidebar((prev) => (prev === sidebar ? null : sidebar));
	}, []);

	return (
		<SidebarVisibilityContext.Provider value={{ activeSidebar, setActiveSidebar, toggleSidebar }}>
			{children}
		</SidebarVisibilityContext.Provider>
	);
}

export function useSidebarVisibility(): SidebarVisibilityContextValue {
	const ctx = useContext(SidebarVisibilityContext);
	if (!ctx) {
		throw new Error('useSidebarVisibility must be used within a SidebarVisibilityProvider');
	}
	return ctx;
}
