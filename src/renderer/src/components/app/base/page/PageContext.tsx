import React, {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
	type ReactNode,
} from 'react';

export type PageSidebarSide = 'left' | 'right';

interface PageContextValue {
	readonly isSidebarVisible: boolean;
	readonly sidebarSide: PageSidebarSide;
	readonly isHeaderVisible: boolean;
	readonly showSidebar: () => void;
	readonly hideSidebar: () => void;
	readonly toggleSidebar: () => void;
	readonly setSidebarSide: (side: PageSidebarSide) => void;
	readonly showHeader: () => void;
	readonly hideHeader: () => void;
	readonly toggleHeader: () => void;
}

const PageContext = createContext<PageContextValue | null>(null);

interface PageProviderProps {
	readonly children: ReactNode;
	readonly defaultSidebarVisible?: boolean;
	readonly defaultSidebarSide?: PageSidebarSide;
	readonly defaultHeaderVisible?: boolean;
}

export function PageProvider({
	children,
	defaultSidebarVisible = true,
	defaultSidebarSide = 'left',
	defaultHeaderVisible = true,
}: PageProviderProps): React.ReactElement {
	const [isSidebarVisible, setSidebarVisible] = useState<boolean>(defaultSidebarVisible);
	const [sidebarSide, setSidebarSideState] = useState<PageSidebarSide>(defaultSidebarSide);
	const [isHeaderVisible, setHeaderVisible] = useState<boolean>(defaultHeaderVisible);

	const showSidebar = useCallback(() => setSidebarVisible(true), []);
	const hideSidebar = useCallback(() => setSidebarVisible(false), []);
	const toggleSidebar = useCallback(() => setSidebarVisible((v) => !v), []);
	const setSidebarSide = useCallback(
		(side: PageSidebarSide) => setSidebarSideState(side),
		[]
	);
	const showHeader = useCallback(() => setHeaderVisible(true), []);
	const hideHeader = useCallback(() => setHeaderVisible(false), []);
	const toggleHeader = useCallback(() => setHeaderVisible((v) => !v), []);

	const value = useMemo<PageContextValue>(
		() => ({
			isSidebarVisible,
			sidebarSide,
			isHeaderVisible,
			showSidebar,
			hideSidebar,
			toggleSidebar,
			setSidebarSide,
			showHeader,
			hideHeader,
			toggleHeader,
		}),
		[
			isSidebarVisible,
			sidebarSide,
			isHeaderVisible,
			showSidebar,
			hideSidebar,
			toggleSidebar,
			setSidebarSide,
			showHeader,
			hideHeader,
			toggleHeader,
		]
	);

	return <PageContext.Provider value={value}>{children}</PageContext.Provider>;
}

export function usePage(): PageContextValue {
	const ctx = useContext(PageContext);
	if (!ctx) {
		throw new Error('usePage must be used within a PageProvider');
	}
	return ctx;
}
