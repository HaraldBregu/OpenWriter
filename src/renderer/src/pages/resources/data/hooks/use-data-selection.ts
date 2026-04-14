import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { ResourceInfo } from '../../../../../../shared/types';

interface UseDataSelectionParams {
	filteredResources: ResourceInfo[];
}

interface UseDataSelectionReturn {
	selected: Set<string>;
	setSelected: Dispatch<SetStateAction<Set<string>>>;
	allChecked: boolean;
	someChecked: boolean;
	handleToggleAll: () => void;
	handleToggleRow: (id: string) => void;
}

export function useDataSelection({
	filteredResources,
}: UseDataSelectionParams): UseDataSelectionReturn {
	const [selected, setSelected] = useState<Set<string>>(new Set());

	const allChecked =
		filteredResources.length > 0 && filteredResources.every((r) => selected.has(r.id));
	const someChecked = !allChecked && filteredResources.some((r) => selected.has(r.id));

	const handleToggleAll = useCallback(() => {
		setSelected((current) => {
			const next = new Set(current);
			if (allChecked) {
				filteredResources.forEach((r) => next.delete(r.id));
			} else {
				filteredResources.forEach((r) => next.add(r.id));
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
