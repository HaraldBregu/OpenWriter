import { useState, useEffect, useCallback, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { Transaction } from '@tiptap/pm/state';
import { Step } from '@tiptap/pm/transform';
import { Slice } from '@tiptap/pm/model';

// Typed interfaces for different Step types
interface StepWithSlice extends Step {
    slice: Slice;
}

interface StepWithFromTo extends Step {
    from: number;
    to: number;
}

function hasSlice(step: Step): step is StepWithSlice {
    const stepWithSlice = step as unknown as StepWithSlice;
    return !!(stepWithSlice.slice && stepWithSlice.slice.content && typeof stepWithSlice.slice.content.size === 'number');
}

function hasFromTo(step: Step): step is StepWithFromTo {
    return 'from' in step && 'to' in step;
}

export interface HistoryState {
    lastAction: HistoryAction | null;
    recentActions: HistoryAction[];
    canUndo: boolean;
    canRedo: boolean;
    currentPosition: number;
}

export const useHistoryState = (editor: Editor | null) => {

    const [historyState, setHistoryState] = useState<HistoryState>({
        lastAction: null,
        recentActions: [],
        canUndo: false,
        canRedo: false,
        currentPosition: -1
    });

    // References for action throttling
    const typingTimeoutRef = useRef<number | null>(null);
    const lastActionTypeRef = useRef<string | null>(null);
    const bufferChangesRef = useRef<boolean>(false);
    const accumulatedChangesRef = useRef<{ type: string, description: string } | null>(null);

    // Wait time to consider typing action completed (in ms)
    const TYPING_DEBOUNCE = 500;

    const generateUniqueId = useCallback(() => {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }, []);

    const analyzeTransaction = useCallback((transaction: Transaction) => {
        let type = 'text-change';
        let description = 'Modifica del testo';

        const formatType = transaction.getMeta('formatType');
        if (formatType) {
            type = formatType as string;
            switch (type) {
                case 'bold': description = 'Testo in grassetto'; break;
                case 'italic': description = 'Testo in corsivo'; break;
                case 'heading': description = 'Titolo'; break;
                case 'color': description = 'Colore testo modificato'; break;
                case 'highlight': description = 'Evidenziazione testo'; break;
                default: description = `Formattazione: ${type}`; break;
            }
            return { type, description };
        }

        // Se non ci sono metadati specifici, analizza i passi per determinare il tipo
        if (transaction.steps.length > 0) {
            let insertCount = 0;
            let deleteCount = 0;

            transaction.steps.forEach(step => {
                if (hasSlice(step) && step.slice.content.size > 0) {
                    insertCount++;
                }
                if (hasFromTo(step) && step.from !== step.to) {
                    deleteCount++;
                }
            });

            if (insertCount > 0 && deleteCount > 0) {
                type = 'replace';
                description = 'Text replaced';
            } else if (insertCount > 0) {
                type = 'insert';
                description = 'Text inserted';
            } else if (deleteCount > 0) {
                type = 'delete';
                description = 'Text deleted';
            }
        }

        return { type, description };
    }, []);

    const trackHistoryActions = useCallback((type: string, description: string) => {
        if (!editor) return;

        const isTypingAction = ['insert', 'delete', 'replace', 'text-change'].includes(type);

        if (isTypingAction) {
            // If not already in a typing session, start debounce
            if (!bufferChangesRef.current) {
                bufferChangesRef.current = true;
                accumulatedChangesRef.current = { type, description };
                typingTimeoutRef.current = window.setTimeout(() => {
                    const finalAction: HistoryAction = {
                        id: generateUniqueId(),
                        type: accumulatedChangesRef.current!.type,
                        timestamp: Date.now(),
                        content: editor.getHTML(),
                        description: accumulatedChangesRef.current!.description
                    };

                    setHistoryState(prev => {
                        const newActions = prev.currentPosition < prev.recentActions.length - 1
                            ? prev.recentActions.slice(0, prev.currentPosition + 1)
                            : [...prev.recentActions];

                        return {
                            ...prev,
                            lastAction: finalAction,
                            recentActions: [...newActions, finalAction].slice(-20),
                            currentPosition: newActions.length,
                            canUndo: true,
                            canRedo: false
                        };
                    });

                    bufferChangesRef.current = false;
                    accumulatedChangesRef.current = null;
                    typingTimeoutRef.current = null;
                }, TYPING_DEBOUNCE);
            } else {
                // Update accumulated action if needed
                accumulatedChangesRef.current = { type, description };
            }
            return;
        }

        // If action is not typing, clear any ongoing debounce and record immediately
        if (typingTimeoutRef.current !== null) {
            window.clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
            bufferChangesRef.current = false;
            accumulatedChangesRef.current = null;
        }

        const action: HistoryAction = {
            id: generateUniqueId(),
            type,
            timestamp: Date.now(),
            content: editor.getHTML(),
            description
        };

        setHistoryState(prev => {
            const newActions = prev.currentPosition < prev.recentActions.length - 1
                ? prev.recentActions.slice(0, prev.currentPosition + 1)
                : [...prev.recentActions];

            return {
                ...prev,
                lastAction: action,
                recentActions: [...newActions, action].slice(-20),
                currentPosition: newActions.length,
                canUndo: true,
                canRedo: false
            };
        });

        lastActionTypeRef.current = type;
    }, [editor, generateUniqueId]);

    // Function to restore a selected state
    const restoreHistoryAction = useCallback((actionId: string) => {
        const actionIndex = historyState.recentActions.findIndex(a => a.id === actionId);
        if (actionIndex === -1 || !editor) return;

        const targetAction = historyState.recentActions[actionIndex];
        // Restore saved content
        editor.commands.setContent(targetAction.content, false);

        // Keep only actions before the selected one (also removing the clicked one)
        const newActions = historyState.recentActions.slice(0, actionIndex);

        setHistoryState({
            lastAction: newActions.length ? newActions[newActions.length - 1] : null,
            recentActions: newActions,
            currentPosition: newActions.length - 1,
            canUndo: newActions.length > 0,
            canRedo: false
        });
    }, [editor, historyState.recentActions]);

    useEffect(() => {
        if (!editor) return;

        const handleTransaction = ({ transaction }: { transaction: Transaction }) => {
            if (transaction.docChanged) {
                const { type, description } = analyzeTransaction(transaction);
                trackHistoryActions(type, description);
            }
        };

        editor.on('transaction', handleTransaction);

        return () => {
            // Pulizia
            if (typingTimeoutRef.current) {
                window.clearTimeout(typingTimeoutRef.current);
            }
            editor.off('transaction', handleTransaction);
        };
    }, [editor, analyzeTransaction, trackHistoryActions]);

    useEffect(() => {
        if (!editor) return;

        const updateUndoState = () => {
            const canUndo = editor.can().undo();
            const canRedo = editor.can().redo();

            setHistoryState(prev => {
                if (!canUndo && prev.recentActions.length > 0) {
                    return {
                        ...prev,
                        lastAction: null,
                        recentActions: [],
                        currentPosition: -1,
                        canUndo,
                        canRedo
                    };
                }
                if (prev.canRedo !== canRedo) {
                    return { ...prev, canRedo };
                }
                return prev;
            });
        };

        editor.on('update', updateUndoState);

        return () => {
            editor.off('update', updateUndoState);
        };
    }, [editor]);

    return { historyState, trackHistoryActions, restoreHistoryAction };
};