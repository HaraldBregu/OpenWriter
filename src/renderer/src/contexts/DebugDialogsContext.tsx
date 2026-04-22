import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { TasksDialog } from '@/components/app/dialogs/TasksDialog';
import { ReduxStateDialog } from '@/components/app/dialogs/ReduxStateDialog';
import { LogDialog } from '@/components/app/dialogs/LogDialog';

interface DebugDialogsContextValue {
	openTasksDialog: () => void;
	openReduxDialog: () => void;
	openLogDialog: () => void;
}

const DebugDialogsContext = createContext<DebugDialogsContextValue | undefined>(undefined);

export function DebugDialogsProvider({ children }: { children: ReactNode }) {
	const [tasksOpen, setTasksOpen] = useState(false);
	const [reduxOpen, setReduxOpen] = useState(false);
	const [logOpen, setLogOpen] = useState(false);

	const openTasksDialog = useCallback(() => setTasksOpen(true), []);
	const openReduxDialog = useCallback(() => setReduxOpen(true), []);
	const openLogDialog = useCallback(() => setLogOpen(true), []);

	useEffect(() => {
		const unsubTasks =
			typeof window.app?.onOpenTasksDialog === 'function'
				? window.app.onOpenTasksDialog(openTasksDialog)
				: undefined;
		const unsubLogs =
			typeof window.app?.onOpenLogsDialog === 'function'
				? window.app.onOpenLogsDialog(openLogDialog)
				: undefined;
		const unsubRedux =
			typeof window.app?.onOpenReduxDialog === 'function'
				? window.app.onOpenReduxDialog(openReduxDialog)
				: undefined;
		return () => {
			unsubTasks?.();
			unsubLogs?.();
			unsubRedux?.();
		};
	}, [openTasksDialog, openLogDialog, openReduxDialog]);

	return (
		<DebugDialogsContext.Provider value={{ openTasksDialog, openReduxDialog, openLogDialog }}>
			{children}
			<TasksDialog open={tasksOpen} onOpenChange={setTasksOpen} />
			<ReduxStateDialog open={reduxOpen} onOpenChange={setReduxOpen} />
			<LogDialog open={logOpen} onOpenChange={setLogOpen} />
		</DebugDialogsContext.Provider>
	);
}

export function useDebugDialogs(): DebugDialogsContextValue {
	const ctx = useContext(DebugDialogsContext);
	if (!ctx) throw new Error('useDebugDialogs must be used within DebugDialogsProvider');
	return ctx;
}
