import { useCallback, useState } from 'react';
export function useSelection({ filteredEntries }) {
    const [selected, setSelected] = useState(new Set());
    const allChecked = filteredEntries.length > 0 && filteredEntries.every((f) => selected.has(f.id));
    const someChecked = !allChecked && filteredEntries.some((f) => selected.has(f.id));
    const handleToggleAll = useCallback(() => {
        setSelected((current) => {
            const next = new Set(current);
            if (allChecked) {
                filteredEntries.forEach((f) => next.delete(f.id));
            }
            else {
                filteredEntries.forEach((f) => next.add(f.id));
            }
            return next;
        });
    }, [allChecked, filteredEntries]);
    const handleToggleRow = useCallback((id) => {
        setSelected((current) => {
            const next = new Set(current);
            if (next.has(id)) {
                next.delete(id);
            }
            else {
                next.add(id);
            }
            return next;
        });
    }, []);
    return { selected, setSelected, allChecked, someChecked, handleToggleAll, handleToggleRow };
}
