import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { ResourceInfo } from '../../../../../shared/types';

interface UseSelectionParams {
	filteredResources: ResourceInfo[];
}

interface UseSelectionReturn {
	selected: Set<string>;
	setSelected: Dispatch<SetStateAction<Set<string>>>;
	allChecked: boolean;
	someChecked: boolean;
	handleToggleAll: () => void;
	handleToggleRow: (id: string) => void;
}

export function useSelection({ filteredResources }: UseSelectionParams): UseSelectionReturn {
	const [selected, setSelected] = useState<Set<string>>(new Set());

	const allChecked =
		filteredResources.length > 0 && filteredResources.every((f) => selected.has(f.id));
	const someChecked = !allChecked && filteredResources.some((f) => selected.has(f.id));

	const handleToggleAll = useCallback(() => {
		setSelected((current) => {
			const next = new Set(current);
			if (allChecked) {
				filteredResources.forEach((f) => next.delete(f.id));
			} else {
				filteredResources.forEach((f) => next.add(f.id));
			}
			return next;
		});
	}, [allChecked, filteredResources]);

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
