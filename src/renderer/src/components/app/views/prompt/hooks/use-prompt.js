import { useContext } from 'react';
import { Context } from '../context';
export function usePrompt() {
    const context = useContext(Context);
    if (!context) {
        throw new Error('usePrompt must be used within PromptProvider');
    }
    return context;
}
