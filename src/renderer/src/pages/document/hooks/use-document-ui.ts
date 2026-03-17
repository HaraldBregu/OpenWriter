import { useCallback } from 'react';
import { useDocumentState } from './use-document-state';
import { useDocumentDispatch } from './use-document-dispatch';

interface DocumentUI {
	readonly sidebarOpen: boolean;
	readonly agenticSidebarOpen: boolean;
	readonly toggleSidebar: () => void;
	readonly toggleAgenticSidebar: () => void;
}

export function useDocumentUI(): DocumentUI {
	const { sidebarOpen, agenticSidebarOpen } = useDocumentState();
	const dispatch = useDocumentDispatch();

	const toggleSidebar = useCallback(() => dispatch({ type: 'SIDEBAR_TOGGLED' }), [dispatch]);

	const toggleAgenticSidebar = useCallback(
		() => dispatch({ type: 'AGENTIC_SIDEBAR_TOGGLED' }),
		[dispatch]
	);

	return { sidebarOpen, agenticSidebarOpen, toggleSidebar, toggleAgenticSidebar };
}
