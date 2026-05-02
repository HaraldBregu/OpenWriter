import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
const MAX_TICKS = 200;
export function CronDialog({ open, onOpenChange }) {
    const { t } = useTranslation();
    const [jobs, setJobs] = useState([]);
    const [ticks, setTicks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [formId, setFormId] = useState('');
    const [formExpr, setFormExpr] = useState('');
    const [formTz, setFormTz] = useState('');
    const [formRunOnStart, setFormRunOnStart] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState(null);
    const unsubRef = useRef(null);
    const fetchJobs = useCallback(async () => {
        setLoading(true);
        try {
            const result = await window.app.cronListJobs();
            setJobs(result);
        }
        finally {
            setLoading(false);
        }
    }, []);
    const handleSchedule = useCallback(async (e) => {
        e.preventDefault();
        setFormError(null);
        const id = formId.trim();
        const expression = formExpr.trim();
        if (!id || !expression) {
            setFormError(t('debug.cronFormRequired', 'Job ID and expression are required'));
            return;
        }
        setSubmitting(true);
        try {
            await window.app.cronSchedule({
                id,
                expression,
                timezone: formTz.trim() || undefined,
                runOnStart: formRunOnStart,
            });
            setFormId('');
            setFormExpr('');
            setFormTz('');
            setFormRunOnStart(false);
            await fetchJobs();
        }
        catch (err) {
            setFormError(err instanceof Error ? err.message : String(err));
        }
        finally {
            setSubmitting(false);
        }
    }, [formId, formExpr, formTz, formRunOnStart, fetchJobs, t]);
    const handleUnschedule = useCallback(async (id) => {
        try {
            await window.app.cronUnschedule(id);
            await fetchJobs();
        }
        catch (err) {
            setFormError(err instanceof Error ? err.message : String(err));
        }
    }, [fetchJobs]);
    useEffect(() => {
        if (!open)
            return;
        fetchJobs();
        unsubRef.current = window.app.onCronTick((event) => {
            setTicks((prev) => [event, ...prev].slice(0, MAX_TICKS));
        });
        return () => {
            unsubRef.current?.();
            unsubRef.current = null;
        };
    }, [open, fetchJobs]);
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "flex h-[calc(100vh-6rem)] min-w-[calc(100vw-8rem)] flex-col p-0 gap-0", children: [_jsx(DialogHeader, { className: "px-6 py-3 border-b shrink-0", children: _jsxs(DialogTitle, { className: "flex items-center gap-2 text-lg font-semibold", children: [_jsx(Clock, { className: "h-5 w-5 text-muted-foreground" }), t('debug.cron', 'Cron')] }) }), _jsxs("div", { className: "flex items-center gap-2 px-4 py-2 border-b shrink-0 bg-background", children: [_jsxs("span", { className: "text-xs text-muted-foreground", children: [_jsx("span", { className: "font-medium text-foreground", children: jobs.length }), ' ', t('debug.cronJobs', 'jobs')] }), _jsxs("span", { className: "text-xs text-muted-foreground", children: [_jsx("span", { className: "font-medium text-foreground", children: ticks.length }), ' ', t('debug.cronTicks', 'ticks')] }), _jsx("div", { className: "ml-auto" }), _jsx(Button, { variant: "ghost", size: "icon-xs", onClick: fetchJobs, disabled: loading, "aria-label": t('debug.refresh', 'Refresh'), children: _jsx(RefreshCw, { className: loading ? 'animate-spin' : '' }) })] }), _jsxs("form", { onSubmit: handleSchedule, className: "flex flex-wrap items-end gap-2 px-4 py-3 border-b shrink-0 bg-muted/20", children: [_jsxs("div", { className: "flex flex-col gap-1 flex-1 min-w-[160px]", children: [_jsx("label", { className: "text-xs font-medium text-muted-foreground", children: t('debug.cronId', 'Job ID') }), _jsx(Input, { type: "text", value: formId, onChange: (e) => setFormId(e.target.value), placeholder: "my-job", className: "h-8 text-sm", disabled: submitting })] }), _jsxs("div", { className: "flex flex-col gap-1 flex-1 min-w-[180px]", children: [_jsx("label", { className: "text-xs font-medium text-muted-foreground", children: t('debug.cronExpression', 'Expression') }), _jsx(Input, { type: "text", value: formExpr, onChange: (e) => setFormExpr(e.target.value), placeholder: "*/5 * * * *", className: "h-8 text-sm font-mono", disabled: submitting })] }), _jsxs("div", { className: "flex flex-col gap-1 w-[180px]", children: [_jsx("label", { className: "text-xs font-medium text-muted-foreground", children: t('debug.cronTimezone', 'Timezone (optional)') }), _jsx(Input, { type: "text", value: formTz, onChange: (e) => setFormTz(e.target.value), placeholder: "UTC", className: "h-8 text-sm", disabled: submitting })] }), _jsxs("label", { className: "flex items-center gap-2 h-8 text-xs text-muted-foreground", children: [_jsx(Checkbox, { checked: formRunOnStart, onCheckedChange: (v) => setFormRunOnStart(v === true), disabled: submitting }), t('debug.cronRunOnStart', 'Run on start')] }), _jsx(Button, { type: "submit", size: "sm", disabled: submitting, children: t('debug.cronSchedule', 'Schedule') }), formError && (_jsx("div", { className: "basis-full text-xs text-destructive", children: formError }))] }), _jsxs("div", { className: "flex flex-1 min-h-0", children: [_jsx("div", { className: "flex-1 min-w-0 overflow-auto border-r font-mono text-xs", children: _jsxs("table", { className: "w-full text-left border-collapse", children: [_jsx("thead", { className: "sticky top-0 bg-background border-b z-10", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-2 font-sans text-xs font-medium text-muted-foreground uppercase tracking-wider", children: t('debug.cronId', 'Job ID') }), _jsx("th", { className: "px-4 py-2 font-sans text-xs font-medium text-muted-foreground uppercase tracking-wider", children: t('debug.cronExpression', 'Expression') }), _jsx("th", { className: "px-4 py-2 w-[48px]" })] }) }), _jsx("tbody", { children: jobs.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 3, className: "px-4 py-8 text-center text-muted-foreground font-sans", children: t('debug.cronNoJobs', 'No scheduled jobs') }) })) : (jobs.map((job) => (_jsxs("tr", { className: "border-b border-border/50 hover:bg-muted/30 transition-colors", children: [_jsx("td", { className: "px-4 py-1.5 break-all", children: job.id }), _jsx("td", { className: "px-4 py-1.5 text-muted-foreground break-all", children: job.expression }), _jsx("td", { className: "px-2 py-1.5 text-right", children: _jsx(Button, { variant: "ghost", size: "icon-xs", onClick: () => handleUnschedule(job.id), "aria-label": t('debug.cronUnschedule', 'Unschedule'), children: _jsx(Trash2, {}) }) })] }, job.id)))) })] }) }), _jsx("div", { className: "flex-1 min-w-0 overflow-auto font-mono text-xs", children: _jsxs("table", { className: "w-full text-left border-collapse", children: [_jsx("thead", { className: "sticky top-0 bg-background border-b z-10", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-2 font-sans text-xs font-medium text-muted-foreground uppercase tracking-wider w-[200px]", children: t('debug.cronFiredAt', 'Fired At') }), _jsx("th", { className: "px-4 py-2 font-sans text-xs font-medium text-muted-foreground uppercase tracking-wider", children: t('debug.cronId', 'Job ID') })] }) }), _jsx("tbody", { children: ticks.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 2, className: "px-4 py-8 text-center text-muted-foreground font-sans", children: t('debug.cronNoTicks', 'No ticks observed yet') }) })) : (ticks.map((tick, idx) => (_jsxs("tr", { className: "border-b border-border/50 hover:bg-muted/30 transition-colors", children: [_jsx("td", { className: "px-4 py-1.5 text-muted-foreground whitespace-nowrap", children: tick.firedAt }), _jsx("td", { className: "px-4 py-1.5 break-all", children: tick.id })] }, idx)))) })] }) })] })] }) }));
}
