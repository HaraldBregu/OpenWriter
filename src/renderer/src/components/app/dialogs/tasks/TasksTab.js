import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bug } from 'lucide-react';
import { TaskRow } from './TaskRow';
import { LogPanel } from './LogPanel';
import { TaskDataDialog } from './TaskDataDialog';
const MAX_EVENT_HISTORY = 50;
const EMPTY_STATS = {
    queued: 0,
    running: 0,
    finished: 0,
    cancelled: 0,
};
function dataField(data, key) {
    if (typeof data === 'object' && data !== null && key in data) {
        return data[key];
    }
    return undefined;
}
function createFromInfo(info) {
    return {
        taskId: info.taskId,
        type: info.type,
        status: info.status,
        priority: info.priority,
        progress: { percent: info.status === 'finished' ? 100 : 0 },
        durationMs: info.durationMs,
        error: info.error,
        metadata: info.metadata,
        events: [],
    };
}
function createFromEvent(event) {
    const metadata = event.metadata !== undefined && event.metadata !== null
        ? event.metadata
        : undefined;
    return {
        taskId: event.taskId,
        type: '',
        status: event.state,
        priority: 'normal',
        progress: { percent: 0 },
        metadata,
        events: [],
    };
}
function appendEvent(task, event) {
    const record = {
        state: event.state,
        data: { taskId: event.taskId, data: event.data, metadata: event.metadata },
        receivedAt: Date.now(),
    };
    const base = task.events.length >= MAX_EVENT_HISTORY ? task.events.slice(1) : task.events.slice();
    base.push(record);
    return base;
}
function applyEvent(task, event) {
    const events = appendEvent(task, event);
    const metadata = event.metadata !== undefined && event.metadata !== null
        ? event.metadata
        : task.metadata;
    const base = { ...task, events, metadata };
    switch (event.state) {
        case 'queued':
        case 'started':
            return { ...base, status: event.state };
        case 'running': {
            const streamData = dataField(event.data, 'data');
            if (typeof streamData === 'string' && streamData.length > 0) {
                return { ...base, status: 'running' };
            }
            return {
                ...base,
                status: 'running',
                progress: {
                    percent: dataField(event.data, 'percent') ?? 0,
                    message: dataField(event.data, 'message'),
                    detail: dataField(event.data, 'detail'),
                },
            };
        }
        case 'finished':
            return {
                ...base,
                status: 'finished',
                progress: { percent: 100 },
                result: event.data.success ? event.data.data : undefined,
                durationMs: dataField(event.data, 'durationMs'),
            };
        case 'cancelled': {
            const errorMessage = !event.data.success && event.data.error.length > 0 ? event.data.error : undefined;
            return { ...base, status: 'cancelled', error: errorMessage };
        }
        default:
            return base;
    }
}
function reducer(state, action) {
    switch (action.type) {
        case 'hydrate': {
            let next = state;
            for (const info of action.tasks) {
                const index = next.findIndex((t) => t.taskId === info.taskId);
                if (index === -1) {
                    next = [...next, createFromInfo(info)];
                }
                else {
                    const current = next[index];
                    const merged = {
                        ...current,
                        type: info.type || current.type,
                        status: info.status,
                        priority: info.priority,
                        durationMs: info.durationMs ?? current.durationMs,
                        error: info.error ?? current.error,
                        metadata: info.metadata ?? current.metadata,
                        progress: info.status === 'finished' ? { percent: 100 } : current.progress,
                    };
                    next = [...next.slice(0, index), merged, ...next.slice(index + 1)];
                }
            }
            return next;
        }
        case 'event': {
            const { event } = action;
            if (!event.taskId)
                return state;
            const index = state.findIndex((t) => t.taskId === event.taskId);
            if (index === -1) {
                if (event.state !== 'queued')
                    return state;
                return [...state, applyEvent(createFromEvent(event), event)];
            }
            const next = applyEvent(state[index], event);
            return [...state.slice(0, index), next, ...state.slice(index + 1)];
        }
        case 'hide':
            return state.filter((t) => t.taskId !== action.taskId);
        default:
            return state;
    }
}
function computeQueueStats(tasks) {
    return tasks.reduce((stats, task) => {
        if (task.status in stats) {
            stats[task.status] += 1;
        }
        return stats;
    }, { ...EMPTY_STATS });
}
export function TasksTab() {
    const { t } = useTranslation();
    const [tasks, dispatch] = useReducer(reducer, []);
    const [selectedId, setSelectedId] = useState(null);
    const [dataDialogId, setDataDialogId] = useState(null);
    useEffect(() => {
        if (typeof window.task?.list !== 'function')
            return;
        window.task.list().then((res) => {
            if (!res.success)
                return;
            dispatch({ type: 'hydrate', tasks: res.data });
        });
    }, []);
    useEffect(() => {
        if (typeof window.task?.onEvent !== 'function')
            return;
        return window.task.onEvent((event) => {
            dispatch({ type: 'event', event });
        });
    }, []);
    const queueStats = useMemo(() => computeQueueStats(tasks), [tasks]);
    const selectedTask = tasks.find((task) => task.taskId === selectedId) ?? null;
    const dataDialogTask = tasks.find((task) => task.taskId === dataDialogId) ?? null;
    const handleSelect = useCallback((taskId) => {
        setSelectedId((prev) => (prev === taskId ? null : taskId));
    }, []);
    const handleHide = useCallback((taskId) => {
        if (selectedId === taskId)
            setSelectedId(null);
        dispatch({ type: 'hide', taskId });
    }, [selectedId]);
    const handleCancel = useCallback(async (taskId) => {
        if (typeof window.task?.cancel !== 'function')
            return;
        await window.task.cancel(taskId);
    }, []);
    return (_jsxs("div", { className: "flex flex-1 min-h-0", children: [_jsxs("div", { className: "flex flex-col flex-1 min-w-0 min-h-0", children: [_jsx("div", { className: "px-6 py-3 border-b shrink-0", children: _jsxs("div", { className: "flex items-center gap-4 text-xs text-muted-foreground", children: [_jsxs("span", { children: [_jsx("span", { className: "font-medium text-foreground", children: queueStats.running }), ' ', t('debug.running')] }), _jsxs("span", { children: [_jsx("span", { className: "font-medium text-foreground", children: queueStats.queued }), ' ', t('debug.queued')] }), _jsxs("span", { children: [_jsx("span", { className: "font-medium text-foreground", children: queueStats.finished }), ' ', t('debug.completed')] }), queueStats.cancelled > 0 && (_jsxs("span", { className: "text-destructive", children: [_jsx("span", { className: "font-medium", children: queueStats.cancelled }), " ", t('debug.errors')] }))] }) }), _jsx("div", { className: "flex-1 overflow-auto", children: tasks.length === 0 ? (_jsxs("div", { className: "flex flex-col items-center justify-center h-full text-muted-foreground gap-3", children: [_jsx(Bug, { className: "h-10 w-10 opacity-20" }), _jsx("p", { className: "text-sm", children: t('debug.noTasksYet') }), _jsx("p", { className: "text-xs opacity-60", children: t('debug.tasksWillAppear') })] })) : (_jsxs("table", { className: "w-full text-left", children: [_jsx("thead", { className: "border-b sticky top-0 bg-background z-10", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider", children: t('debug.id') }), _jsx("th", { className: "px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider", children: t('debug.type') }), _jsx("th", { className: "px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider", children: t('debug.status') }), _jsx("th", { className: "px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider", children: t('debug.priority') }), _jsx("th", { className: "px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider", children: t('debug.progress') }), _jsx("th", { className: "px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider", children: t('debug.duration') }), _jsx("th", { className: "px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider", children: t('debug.actions') })] }) }), _jsx("tbody", { children: tasks.map((task) => (_jsx(TaskRow, { task: task, isSelected: selectedId === task.taskId, onSelect: () => handleSelect(task.taskId), onCancel: () => handleCancel(task.taskId), onHide: () => handleHide(task.taskId), onViewData: () => setDataDialogId(task.taskId) }, task.taskId))) })] })) })] }), selectedTask && _jsx(LogPanel, { task: selectedTask, onClose: () => setSelectedId(null) }), _jsx(TaskDataDialog, { task: dataDialogTask, open: dataDialogId !== null, onOpenChange: (open) => {
                    if (!open)
                        setDataDialogId(null);
                } })] }));
}
