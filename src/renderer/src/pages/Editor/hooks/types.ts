export interface EditorStep {
    stepType?: string;
    marks?: string[];
    attributes?: Record<string, unknown>;
    content?: string;
    from?: number;
    to?: number;
    structure?: boolean;
    slice?: unknown;
    selection?: unknown;
    jsonID?: string;
    attrs?: Record<string, unknown>;
}

export interface CustomTransaction {
    steps: EditorStep[];
    time: number;
    docChanged: boolean;
    selection?: {
        anchor: number;
        head: number;
    };
    origin?: string | null;
}

export interface TransactionDetails {
    from: number;
    to: number;
    steps: EditorStep[];
    content?: string;
}

export interface HistoryAction {
    id: string;
    type: string;
    timestamp: number;
    content: string;
    description: string;
}

// Aggiorna l'interfaccia HistoryState
export interface HistoryState {
    lastAction: HistoryAction | null;
    recentActions: HistoryAction[];
    canUndo: boolean;
    canRedo: boolean;
    currentPosition: number; // Nuova proprietà per tracciare la posizione nella cronologia
}