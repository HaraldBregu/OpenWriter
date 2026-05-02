import { useContext } from 'react';
import { EditorContext } from '../context/context';
export function useEditor() {
    const ctx = useContext(EditorContext);
    if (!ctx) {
        throw new Error('useEditor must be used within an EditorProvider');
    }
    return ctx;
}
