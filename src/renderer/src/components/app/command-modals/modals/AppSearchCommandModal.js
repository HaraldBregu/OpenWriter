import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { startTransition, useDeferredValue, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut, CommandDialog, CommandSeparator, } from '@/components/ui/Command';
import { APP_SEARCH_RESULT_KIND_LABELS } from '../search/constants';
import { useAppSearchResults } from '../search/use-app-search-results';
export function AppSearchCommandModal({ open, onOpenChange }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const deferredQuery = useDeferredValue(query);
    const { sections, totalCount } = useAppSearchResults(deferredQuery);
    function handleSelect(item) {
        onOpenChange(false);
        setQuery('');
        if (item.href) {
            navigate(item.href);
        }
    }
    function handleOpenChange(nextOpen) {
        onOpenChange(nextOpen);
        if (!nextOpen) {
            setQuery('');
        }
    }
    return (_jsxs(CommandDialog, { open: open, onOpenChange: handleOpenChange, title: t('menu.search', 'Search'), description: t('search.commandDescription', 'Search routes, documents, and resources across the app.'), className: "sm:max-w-3xl", commandProps: {
            shouldFilter: false,
            value: deferredQuery,
        }, children: [_jsx(CommandInput, { value: query, onValueChange: (value) => {
                    startTransition(() => {
                        setQuery(value);
                    });
                }, placeholder: t('menu.search', 'Search') }), _jsxs("div", { className: "flex items-center justify-between border-b px-3 py-2 text-xs text-muted-foreground", children: [_jsx("span", { children: t('search.commandHint', 'Search anything in the app') }), _jsx("span", { children: t('search.resultsSummary', {
                            count: totalCount,
                            query: deferredQuery,
                            defaultValue: deferredQuery.trim().length > 0
                                ? totalCount === 1
                                    ? '1 result for "{{query}}"'
                                    : '{{count}} results for "{{query}}"'
                                : '{{count}} results',
                        }) })] }), _jsxs(CommandList, { className: "max-h-[70vh]", children: [_jsx(CommandEmpty, { className: "px-6 py-12 text-left", children: _jsxs("div", { className: "space-y-1", children: [_jsx("p", { className: "text-sm font-medium text-foreground", children: t('search.emptyTitle', 'No matches yet') }), _jsx("p", { className: "text-sm text-muted-foreground", children: deferredQuery.trim().length > 0
                                        ? t('search.emptyDescription', {
                                            query: deferredQuery,
                                            defaultValue: 'Nothing matched "{{query}}". Try a title, path, or section name.',
                                        })
                                        : t('search.commandEmptyDescription', 'Try a route name, document title, file name, or section.') })] }) }), sections.map((section, index) => (_jsxs("div", { children: [_jsx(CommandGroup, { heading: section.title, children: section.items.map((item) => {
                                    const Icon = item.icon;
                                    return (_jsxs(CommandItem, { value: `${item.title} ${item.description} ${item.meta}`, onSelect: () => {
                                            handleSelect(item);
                                        }, className: "items-start gap-3 rounded-xl px-3 py-3", children: [_jsx("div", { className: "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground", children: _jsx(Icon, { className: "size-4" }) }), _jsxs("div", { className: "min-w-0 flex-1 space-y-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "truncate text-sm font-medium text-foreground", children: item.title }), _jsx("span", { className: "rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground", children: t(`search.kind.${item.kind}`, APP_SEARCH_RESULT_KIND_LABELS[item.kind]) })] }), _jsx("p", { className: "line-clamp-2 text-xs text-muted-foreground", children: item.description })] }), _jsx(CommandShortcut, { className: "mt-0.5 max-w-32 truncate text-right tracking-[0.12em]", children: item.meta })] }, item.id));
                                }) }), index < sections.length - 1 && _jsx(CommandSeparator, {})] }, section.id)))] })] }));
}
