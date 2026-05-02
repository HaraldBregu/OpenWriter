import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { History, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger, } from '@/components/ui/Popover';
const DATE_FORMAT_OPTIONS = {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
};
function formatSavedAt(isoString) {
    return new Intl.DateTimeFormat(undefined, DATE_FORMAT_OPTIONS).format(new Date(isoString));
}
const HistoryMenu = ({ entries, currentEntryId, onRestoreEntry, onReturnToLive, }) => {
    const [open, setOpen] = useState(false);
    const reversedEntries = useMemo(() => [...entries].reverse(), [entries]);
    const onLive = currentEntryId === null;
    const handleReturnToLive = () => {
        if (!onLive)
            onReturnToLive();
        setOpen(false);
    };
    const handleRestore = (id) => {
        onRestoreEntry(id);
        setOpen(false);
    };
    return (_jsxs(Popover, { open: open, onOpenChange: setOpen, children: [_jsx(PopoverTrigger, { render: _jsx(Button, { variant: "ghost", size: "icon", title: "Version history", "aria-label": "Version history", children: _jsx(History, { "aria-hidden": "true" }) }) }), _jsxs(PopoverContent, { align: "end", className: "w-64 p-0", children: [_jsx(PopoverHeader, { className: "flex flex-row items-start justify-between gap-3 p-4 pb-3", children: _jsx("div", { className: "flex min-w-0 flex-1 flex-col gap-1", children: _jsx(PopoverTitle, { className: "truncate", children: "Version history" }) }) }), _jsx("div", { className: "border-t", children: _jsxs("div", { className: "max-h-72 overflow-y-auto", children: [_jsxs(Button, { variant: "ghost", size: "sm", onClick: handleReturnToLive, className: 'w-full justify-between ' + (onLive ? 'font-semibold' : 'font-normal'), children: [_jsx("span", { className: "truncate", children: "Current version" }), onLive && (_jsx(Check, { className: "h-3.5 w-3.5 shrink-0 text-foreground", "aria-hidden": "true" }))] }), _jsx("div", { className: "my-1 h-px bg-border" }), reversedEntries.length === 0 ? (_jsx("p", { className: "px-2 py-3 text-sm text-muted-foreground text-center", children: "No history yet" })) : (reversedEntries.map((entry) => {
                                    const isCurrent = entry.id === currentEntryId;
                                    return (_jsxs(Button, { variant: "ghost", size: "sm", onClick: () => handleRestore(entry.id), className: 'h-auto w-full justify-between py-1.5 ' +
                                            (isCurrent ? 'font-semibold' : 'font-normal'), children: [_jsxs("div", { className: "flex min-w-0 flex-col text-left", children: [_jsx("span", { className: "text-xs text-muted-foreground shrink-0", children: formatSavedAt(entry.savedAt) }), _jsx("span", { className: "truncate", children: entry.title.trim() || 'Untitled' })] }), isCurrent && (_jsx(Check, { className: "h-3.5 w-3.5 shrink-0 text-foreground", "aria-hidden": "true" }))] }, entry.id));
                                }))] }) })] })] }));
};
export default HistoryMenu;
