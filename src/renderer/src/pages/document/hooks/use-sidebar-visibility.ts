import type { ContextValue } from '../context/context';
import { useDocumentContext } from './use-document-context';

export function useSidebarVisibility(): Pick<
	ContextValue,
	'activeSidebar' | 'animate' | 'setActiveSidebar' | 'toggleSidebar'
> {
	const { activeSidebar, animate, setActiveSidebar, toggleSidebar } = useDocumentContext();
	return { activeSidebar, animate, setActiveSidebar, toggleSidebar };
}
