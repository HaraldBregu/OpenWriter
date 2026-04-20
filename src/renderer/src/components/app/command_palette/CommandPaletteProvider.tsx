import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ShortcutId } from '../../../../../shared/shortcuts';
import {
	CommandPaletteContext,
	type CommandPaletteContextValue,
	type CommandPaletteId,
} from './CommandPaletteContext';
import { DocumentCommandPalette } from './DocumentCommandPalette';

/**
 * Maps an incoming main-process shortcut ID to the palette it should open.
 * New command palettes register here so the shortcut → palette binding stays
 * in a single place.
 */
const SHORTCUT_TO_PALETTE: Partial<Record<ShortcutId, CommandPaletteId>> = {
	[ShortcutId.openDocumentList]: 'documents',
};

interface CommandPaletteProviderProps {
	children: ReactNode;
}

export function CommandPaletteProvider({ children }: CommandPaletteProviderProps) {
	const [activePalette, setActivePalette] = useState<CommandPaletteId | null>(null);

	const open = useCallback((palette: CommandPaletteId) => {
		setActivePalette(palette);
	}, []);

	const close = useCallback(() => {
		setActivePalette(null);
	}, []);

	const toggle = useCallback((palette: CommandPaletteId) => {
		setActivePalette((current) => (current === palette ? null : palette));
	}, []);

	// Subscribe to main-process shortcut events and open the matching palette.
	useEffect(() => {
		if (typeof window.app?.onShortcut !== 'function') return;
		return window.app.onShortcut((id) => {
			const palette = SHORTCUT_TO_PALETTE[id];
			if (palette) {
				setActivePalette((current) => (current === palette ? null : palette));
			}
		});
	}, []);

	const value = useMemo<CommandPaletteContextValue>(
		() => ({ activePalette, open, close, toggle }),
		[activePalette, open, close, toggle]
	);

	const handleOpenChange = useCallback(
		(palette: CommandPaletteId, isOpen: boolean) => {
			setActivePalette((current) => {
				if (isOpen) return palette;
				return current === palette ? null : current;
			});
		},
		[]
	);

	return (
		<CommandPaletteContext.Provider value={value}>
			{children}
			<DocumentCommandPalette
				open={activePalette === 'documents'}
				onOpenChange={(isOpen) => handleOpenChange('documents', isOpen)}
			/>
		</CommandPaletteContext.Provider>
	);
}
