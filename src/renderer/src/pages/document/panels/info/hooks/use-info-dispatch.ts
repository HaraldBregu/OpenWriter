import { useContext, type Dispatch } from 'react';
import { InfoDispatchContext } from '../context/contexts';
import type { InfoAction } from '../context/actions';

export function useInfoDispatch(): Dispatch<InfoAction> {
	const ctx = useContext(InfoDispatchContext);
	if (ctx === null) {
		throw new Error('useInfoDispatch must be used within InfoProvider');
	}
	return ctx;
}
