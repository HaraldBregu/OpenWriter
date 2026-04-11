import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { FolderEntry } from '../../../../../../shared/types';

interface UseContentSelectionParams {
	filteredFolders: FolderEntry[];
}

interface UseContentSelectionReturn {
	selected: Set<string>;
	setSelected: Dispatch<SetStateAction<Set<string>>>;
	allChecked: boolean;
	someChecked: boolean;
	handleToggleAll: () => void;
	handleToggleRow: (id: string) => void;
}

export function useContentSelection({
	filteredFolders,
}: UseContentSelectionParams): UseContentSelectionReturn {
	const [selected, setSelected] = useState<Set<string>>(new Set());

	const allChecked =
		filteredFolders.length > 0 && filteredFolders.every((f) => selected.has(f.id));
	const someChecked = !allChecked && filteredFolders.some((f) => selected.has(f.id));

	const handleToggleAll = useCallback(() => {
		setSelected((current) => {
			const next = new Set(current);
			if (allChecked) {
				filteredFolders.forEach((f) => next.delete(f.id));
			} else {
				filteredFolders.forEach((f) => next.add(f.id));
			}
			return next;
		});
	}, [allChecked, filteredFolders]);

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
