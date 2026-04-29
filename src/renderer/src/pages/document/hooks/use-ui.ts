import { useCallback } from 'react';
import { useState } from './use-state';
import { useDispatch } from './use-dispatch';

interface DocumentUI {
	readonly sidebarOpen: boolean;
	readonly agenticSidebarOpen: boolean;
	readonly toggleSidebar: () => void;
	readonly toggleAgenticSidebar: () => void;
}

export function useUI(): DocumentUI {
	const { sidebarOpen, agenticSidebarOpen } = useState();
	const dispatch = useDispatch();

	const toggleSidebar = useCallback(() => dispatch({ type: 'SIDEBAR_TOGGLED' }), [dispatch]);

	const toggleAgenticSidebar = useCallback(
		() => dispatch({ type: 'AGENTIC_SIDEBAR_TOGGLED' }),
		[dispatch]
	);

	return { sidebarOpen, agenticSidebarOpen, toggleSidebar, toggleAgenticSidebar };
}
