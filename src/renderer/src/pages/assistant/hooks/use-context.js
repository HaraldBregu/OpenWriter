import { useContext as useReactContext } from 'react';
import { AssistantContext } from '../context/context';
export function useContext() {
    const ctx = useReactContext(AssistantContext);
    if (!ctx) {
        throw new Error('useContext must be used within a Provider');
    }
    return ctx;
}
