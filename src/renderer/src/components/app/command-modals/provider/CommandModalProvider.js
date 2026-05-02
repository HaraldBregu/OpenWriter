import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { CommandModalContext, } from '../context/CommandModalContext';
import { COMMAND_MODAL_DEFINITIONS, SHORTCUT_TO_COMMAND_MODAL, } from '../registry/command-modal-registry';
export function CommandModalProvider({ children }) {
    const [activeModal, setActiveModal] = useState(null);
    function open(modal) {
        setActiveModal(modal);
    }
    function close() {
        setActiveModal(null);
    }
    function toggle(modal) {
        setActiveModal((current) => (current === modal ? null : modal));
    }
    useEffect(() => {
        if (typeof window.app?.onShortcut !== 'function')
            return;
        return window.app.onShortcut((shortcutId) => {
            const modal = SHORTCUT_TO_COMMAND_MODAL[shortcutId];
            if (modal) {
                setActiveModal((current) => (current === modal ? null : modal));
            }
        });
    }, []);
    function handleOpenChange(modal, isOpen) {
        setActiveModal((current) => {
            if (isOpen)
                return modal;
            return current === modal ? null : current;
        });
    }
    const contextValue = {
        activeModal,
        open,
        close,
        toggle,
    };
    return (_jsxs(CommandModalContext.Provider, { value: contextValue, children: [children, COMMAND_MODAL_DEFINITIONS.map(({ id, Component }) => (_jsx(Component, { open: activeModal === id, onOpenChange: (isOpen) => handleOpenChange(id, isOpen) }, id)))] }));
}
