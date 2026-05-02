import { createContext, useContext } from 'react';
export const CommandModalContext = createContext(null);
export function useCommandModal() {
    const context = useContext(CommandModalContext);
    if (!context) {
        throw new Error('useCommandModal must be used inside <CommandModalProvider>');
    }
    return context;
}
