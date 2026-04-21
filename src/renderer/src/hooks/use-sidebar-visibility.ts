import { useContext } from 'react';
import {
	SidebarVisibilityContext,
	type SidebarVisibilityContextValue,
} from '../contexts/SidebarVisibilityProvider';

export function useSidebarVisibility(): SidebarVisibilityContextValue {
	const ctx = useContext(SidebarVisibilityContext);
	if (ctx === undefined)
		throw new Error('useSidebarVisibility must be used within an AppProvider');
	return ctx;
}
