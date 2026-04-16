import { useContext } from 'react';
import { ImageContext } from '../components/image/context/context';
import type { ImageContextValue } from '../components/image/context/context';

export function useImage(): ImageContextValue {
	const context = useContext(ImageContext);
	if (!context) {
		throw new Error('useImage must be used within ImageProvider');
	}
	return context;
}
