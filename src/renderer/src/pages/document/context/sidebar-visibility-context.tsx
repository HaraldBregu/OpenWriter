import React, { createContext, useCallback, useContext, useState } from 'react';

export type ActiveSidebar = 'config' | 'agentic' | 'editor' | null;

interface SidebarVisibilityContextValue {
	activeSidebar: ActiveSidebar;
	animate: boolean;
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
	const [animate, setAnimate] = useState(true);

	const toggleSidebar = useCallback((sidebar: Exclude<ActiveSidebar, null>) => {
		setActiveSidebar((prev) => {
			// Switching between two sidebars — no animation.
			// Opening from none or closing to none — animate.
			const isSwitching = prev !== null && prev !== sidebar;
			setAnimate(!isSwitching);
			return prev === sidebar ? null : sidebar;
		});
	}, []);

	return (
		<SidebarVisibilityContext.Provider
			value={{ activeSidebar, animate, setActiveSidebar, toggleSidebar }}
		>
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
