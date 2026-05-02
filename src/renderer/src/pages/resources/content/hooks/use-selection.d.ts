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
export declare function useSelection({ filteredContents }: UseSelectionParams): UseSelectionReturn;
export {};
