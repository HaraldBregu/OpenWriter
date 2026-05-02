import { useContext as useReactContext } from 'react';
import { Context } from '../Context';
export function useContext() {
    const context = useReactContext(Context);
    if (!context) {
        throw new Error('useContext must be used within a FilesProvider');
    }
    return context;
}
