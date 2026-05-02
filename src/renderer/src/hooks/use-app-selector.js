import { useMemo } from 'react';
import { useAppState } from './use-app-state';
export function useAppSelector(selector) {
    const state = useAppState();
    return useMemo(() => selector(state), [state, selector]);
}
