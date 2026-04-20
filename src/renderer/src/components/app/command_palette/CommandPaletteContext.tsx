import { createContext, useContext } from 'react';

/**
 * Identifier for a registered command palette variant. New palettes
 * (e.g. workspaces, actions) should add a literal to this union.
 */
export type CommandPaletteId = 'documents';

export interface CommandPaletteContextValue {
	activePalette: CommandPaletteId | null;
	open: (palette: CommandPaletteId) => void;
	close: () => void;
	toggle: (palette: CommandPaletteId) => void;
}

export const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

export function useCommandPalette(): CommandPaletteContextValue {
	const ctx = useContext(CommandPaletteContext);
	if (!ctx) {
		throw new Error('useCommandPalette must be used inside <CommandPaletteProvider>');
	}
	return ctx;
}
