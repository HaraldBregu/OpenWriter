import type { Dispatch, SetStateAction } from 'react';
import type { FileEntry } from '../../../../../../shared/types';
interface UseSelectionParams {
    filteredEntries: FileEntry[];
}
interface UseSelectionReturn {
    selected: Set<string>;
    setSelected: Dispatch<SetStateAction<Set<string>>>;
    allChecked: boolean;
    someChecked: boolean;
    handleToggleAll: () => void;
    handleToggleRow: (id: string) => void;
}
export declare function useSelection({ filteredEntries }: UseSelectionParams): UseSelectionReturn;
export {};
