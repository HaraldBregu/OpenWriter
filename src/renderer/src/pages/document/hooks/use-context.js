import { useContext as useReactContext } from 'react';
import { DocumentContext } from '../context/context';
export function useContext() {
    const ctx = useReactContext(DocumentContext);
    if (!ctx) {
        throw new Error('useContext must be used within a Provider');
    }
    return ctx;
}
