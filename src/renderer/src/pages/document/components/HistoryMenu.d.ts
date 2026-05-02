import React from 'react';
import type { HistoryEntry } from '../services/history-service';
interface HistoryMenuProps {
    readonly entries: HistoryEntry[];
    readonly currentEntryId: string | null;
    readonly onRestoreEntry: (id: string) => void;
    readonly onReturnToLive: () => void;
}
declare const HistoryMenu: React.FC<HistoryMenuProps>;
export default HistoryMenu;
