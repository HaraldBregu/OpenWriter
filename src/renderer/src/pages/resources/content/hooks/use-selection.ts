import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { ResourceInfo } from '../../../../../../shared/types';

interface UseSelectionParams {
	filteredContents: ResourceInfo[];
}

interface UseSelectionReturn {
	selected: Set<string>;
	setSelected: Dispatch<SetStateAction<Set<string>>>;
	allChecked: boolean;
	someChecked: boolean;
	handleToggleAll: () => void;
	handleToggleRow: (id: string) => void;
}

export function useSelection({ filteredContents }: UseSelectionParams): UseSelectionReturn {
	const [selected, setSelected] = useState<Set<string>>(new Set());

	const allChecked =
		filteredContents.length > 0 && filteredContents.every((f) => selected.has(f.id));
	const someChecked = !allChecked && filteredContents.some((f) => selected.has(f.id));

	const handleToggleAll = useCallback(() => {
		setSelected((current) => {
			const next = new Set(current);
			if (allChecked) {
				filteredContents.forEach((f) => next.delete(f.id));
			} else {
				filteredContents.forEach((f) => next.add(f.id));
			}
			return next;
		});
	}, [allChecked, filteredContents]);

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
