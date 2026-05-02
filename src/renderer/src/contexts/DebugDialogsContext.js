import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { TasksDialog } from '@/components/app/dialogs/TasksDialog';
import { ReduxStateDialog } from '@/components/app/dialogs/ReduxStateDialog';
import { LogDialog } from '@/components/app/dialogs/LogDialog';
import { CronDialog } from '@/components/app/dialogs/CronDialog';
const DebugDialogsContext = createContext(undefined);
export function DebugDialogsProvider({ children }) {
    const [tasksOpen, setTasksOpen] = useState(false);
    const [reduxOpen, setReduxOpen] = useState(false);
    const [logOpen, setLogOpen] = useState(false);
    const [cronOpen, setCronOpen] = useState(false);
    const openTasksDialog = useCallback(() => setTasksOpen(true), []);
    const openReduxDialog = useCallback(() => setReduxOpen(true), []);
    const openLogDialog = useCallback(() => setLogOpen(true), []);
    const openCronDialog = useCallback(() => setCronOpen(true), []);
    useEffect(() => {
        const unsubTasks = typeof window.app?.onOpenTasksDialog === 'function'
            ? window.app.onOpenTasksDialog(openTasksDialog)
            : undefined;
        const unsubLogs = typeof window.app?.onOpenLogsDialog === 'function'
            ? window.app.onOpenLogsDialog(openLogDialog)
            : undefined;
        const unsubRedux = typeof window.app?.onOpenReduxDialog === 'function'
            ? window.app.onOpenReduxDialog(openReduxDialog)
            : undefined;
        const unsubCron = typeof window.app?.onOpenCronDialog === 'function'
            ? window.app.onOpenCronDialog(openCronDialog)
            : undefined;
        return () => {
            unsubTasks?.();
            unsubLogs?.();
            unsubRedux?.();
            unsubCron?.();
        };
    }, [openTasksDialog, openLogDialog, openReduxDialog, openCronDialog]);
    return (_jsxs(DebugDialogsContext.Provider, { value: { openTasksDialog, openReduxDialog, openLogDialog, openCronDialog }, children: [children, _jsx(TasksDialog, { open: tasksOpen, onOpenChange: setTasksOpen }), _jsx(ReduxStateDialog, { open: reduxOpen, onOpenChange: setReduxOpen }), _jsx(LogDialog, { open: logOpen, onOpenChange: setLogOpen }), _jsx(CronDialog, { open: cronOpen, onOpenChange: setCronOpen })] }));
}
export function useDebugDialogs() {
    const ctx = useContext(DebugDialogsContext);
    if (!ctx)
        throw new Error('useDebugDialogs must be used within DebugDialogsProvider');
    return ctx;
}
