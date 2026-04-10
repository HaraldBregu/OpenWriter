import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { FileEntry } from '../../../../../../shared/types';

interface UseFilesSelectionParams {
	filteredEntries: FileEntry[];
}

interface UseFilesSelectionReturn {
	selected: Set<string>;
	setSelected: Dispatch<SetStateAction<Set<string>>>;
	allChecked: boolean;
	someChecked: boolean;
	handleToggleAll: () => void;
	handleToggleRow: (id: string) => void;
}

export function useFilesSelection({
	filteredEntries,
}: UseFilesSelectionParams): UseFilesSelectionReturn {
	const [selected, setSelected] = useState<Set<string>>(new Set());

	const allChecked =
		filteredEntries.length > 0 && filteredEntries.every((f) => selected.has(f.id));
	const someChecked = !allChecked && filteredEntries.some((f) => selected.has(f.id));

	const handleToggleAll = useCallback(() => {
		setSelected((current) => {
			const next = new Set(current);
			if (allChecked) {
				filteredEntries.forEach((f) => next.delete(f.id));
			} else {
				filteredEntries.forEach((f) => next.add(f.id));
			}
			return next;
		});
	}, [allChecked, filteredEntries]);

	const handleToggleRow = useCallback((id: string) => {
		setSelected((current) => {
			const next = new Set(current);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	}, []);

	return { selected, setSelected, allChecked, someChecked, handleToggleAll, handleToggleRow };
}
