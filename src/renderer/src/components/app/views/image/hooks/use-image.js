import { useContext } from 'react';
import { ImageContext } from '../context/context';
export function useImage() {
    const context = useContext(ImageContext);
    if (!context) {
        throw new Error('useImage must be used within ImageProvider');
    }
    return context;
}
