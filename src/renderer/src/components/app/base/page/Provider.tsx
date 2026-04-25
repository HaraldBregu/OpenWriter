import React, { memo, useCallback, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { PageContext, type ContextValue } from './context/context';
import { pageReducer } from './context/reducer';
import { INITIAL_PAGE_STATE, type PageState } from './context/state';

const SIDEBAR_COOKIE_NAME = 'page_sidebar_layout_state';
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_KEYBOARD_SHORTCUT = '';

interface ProviderProps {
	readonly children: ReactNode;
	readonly initialState?: Partial<PageState>;
}

export const Provider = memo(function Provider({
	children,
	initialState,
}: ProviderProps): React.ReactElement {
	const [state, dispatch] = useReducer(pageReducer, {
		...INITIAL_PAGE_STATE,
		...initialState,
	});
	const isMobile = useIsMobile();

	const toggleSidebar = useCallback(() => {
		if (isMobile) {
			dispatch({ type: 'SIDEBAR_OPEN_MOBILE_TOGGLED' });
		} else {
			dispatch({ type: 'SIDEBAR_OPEN_TOGGLED' });
		}
	}, [isMobile]);

	useEffect(() => {
		document.cookie = `${SIDEBAR_COOKIE_NAME}=${state.sidebarOpen}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
	}, [state.sidebarOpen]);

	useEffect(() => {
		if (!SIDEBAR_KEYBOARD_SHORTCUT) return;
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
				event.preventDefault();
				toggleSidebar();
			}
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [toggleSidebar]);

	const value = useMemo<ContextValue>(
		() => ({ state, dispatch, isMobile, toggleSidebar }),
		[state, isMobile, toggleSidebar]
	);
	return <PageContext.Provider value={value}>{children}</PageContext.Provider>;
});
