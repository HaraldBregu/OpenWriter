import { useContext } from 'react';
import { InfoStateContext } from '../context/contexts';
import type { InfoState } from '../context/state';

export function useInfoState(): InfoState {
	const ctx = useContext(InfoStateContext);
	if (ctx === null) {
		throw new Error('useInfoState must be used within InfoProvider');
	}
	return ctx;
}
