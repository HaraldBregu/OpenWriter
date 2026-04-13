import { useMemo } from 'react';
import { useAppState } from './use-app-state';
import type { AppState } from '../contexts/AppContext';

export function useAppSelector<T>(selector: (state: AppState) => T): T {
	const state = useAppState();
	return useMemo(() => selector(state), [state, selector]);
}
