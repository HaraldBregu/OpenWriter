import { useEffect, useState, type ReactNode } from 'react';
import {
	CommandModalContext,
	type CommandModalContextValue,
	type CommandModalId,
} from '../context/CommandModalContext';
import {
	COMMAND_MODAL_DEFINITIONS,
	SHORTCUT_TO_COMMAND_MODAL,
} from '../registry/command-modal-registry';

interface CommandModalProviderProps {
	children: ReactNode;
}

export function CommandModalProvider({ children }: CommandModalProviderProps) {
	const [activeModal, setActiveModal] = useState<CommandModalId | null>(null);

	function open(modal: CommandModalId) {
		setActiveModal(modal);
	}

	function close() {
		setActiveModal(null);
	}

	function toggle(modal: CommandModalId) {
		setActiveModal((current) => (current === modal ? null : modal));
	}

	useEffect(() => {
		if (typeof window.app?.onShortcut !== 'function') return;
		return window.app.onShortcut((shortcutId) => {
			const modal = SHORTCUT_TO_COMMAND_MODAL[shortcutId];
			if (modal) {
				setActiveModal((current) => (current === modal ? null : modal));
			}
		});
	}, []);

	function handleOpenChange(modal: CommandModalId, isOpen: boolean) {
		setActiveModal((current) => {
			if (isOpen) return modal;
			return current === modal ? null : current;
		});
	}

	const contextValue: CommandModalContextValue = {
		activeModal,
		open,
		close,
		toggle,
	};

	return (
		<CommandModalContext.Provider value={contextValue}>
			{children}
			{COMMAND_MODAL_DEFINITIONS.map(({ id, Component }) => (
				<Component
					key={id}
					open={activeModal === id}
					onOpenChange={(isOpen) => handleOpenChange(id, isOpen)}
				/>
			))}
		</CommandModalContext.Provider>
	);
}
