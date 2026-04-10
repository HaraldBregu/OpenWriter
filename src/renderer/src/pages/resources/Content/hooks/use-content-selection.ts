import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { ResourceInfo } from '../../../../../../shared/types';

interface UseContentSelectionParams {
	filteredResources: ResourceInfo[];
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
	filteredResources,
}: UseContentSelectionParams): UseContentSelectionReturn {
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
