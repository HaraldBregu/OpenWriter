import type { MenuItemConstructorOptions } from 'electron';
import { ShortcutId, SHORTCUT_ACCELERATORS } from '../shared/shortcuts';

/**
 * Build hidden MenuItem entries that register accelerators for app-level
 * shortcuts. Hidden items still respond to their accelerator when nested
 * inside the application menu.
 *
 * Shortcuts are declared in `src/shared/shortcuts.ts` so the renderer can
 * import the same IDs and display per-platform labels.
 */
export function buildShortcutMenuItems(
	onShortcut: (id: ShortcutId) => void
): MenuItemConstructorOptions[] {
	return (Object.keys(SHORTCUT_ACCELERATORS) as ShortcutId[]).map((id) => ({
		label: id,
		accelerator: SHORTCUT_ACCELERATORS[id],
		visible: false,
		click: (): void => onShortcut(id),
	}));
}
