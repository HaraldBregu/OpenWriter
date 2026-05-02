import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react';
import { Checkbox } from '@/components/ui/Checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from '@/components/ui/Table';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/Select';
import { formatBytes, formatDate } from './resource-utils';
const ALL_TYPES_VALUE = 'all';
const COLUMN_KEYS = [
    { key: 'name', i18nKey: 'library.name' },
    { key: 'mimeType', i18nKey: 'library.type' },
    { key: 'size', i18nKey: 'library.size', className: 'text-right' },
    { key: 'importedAt', i18nKey: 'library.imported' },
    { key: 'lastModified', i18nKey: 'library.lastModified' },
];
function compareResources(left, right, key, direction) {
    let result;
    if (key === 'name' || key === 'mimeType') {
        result = left[key].localeCompare(right[key]);
    }
    else {
        result = left[key] - right[key];
    }
    return direction === 'asc' ? result : -result;
}
function SortIcon({ column, sortKey, sortDirection, }) {
    if (column !== sortKey || sortDirection === 'none') {
        return _jsx(ArrowUpDown, { className: "ml-1 inline h-3.5 w-3.5 text-muted-foreground/50" });
    }
    if (sortDirection === 'asc') {
        return _jsx(ArrowUp, { className: "ml-1 inline h-3.5 w-3.5" });
    }
    return _jsx(ArrowDown, { className: "ml-1 inline h-3.5 w-3.5" });
}
const ResourceRow = memo(function ResourceRow({ resource, editing, isSelected, onToggle, }) {
    return (_jsxs(TableRow, { "data-state": editing && isSelected ? 'selected' : undefined, children: [editing && (_jsx(TableCell, { className: "w-[40px]", children: _jsx(Checkbox, { checked: isSelected, onCheckedChange: () => onToggle(resource.id) }) })), _jsx(TableCell, { className: "max-w-[300px] truncate font-medium", children: resource.name }), _jsx(TableCell, { className: "text-muted-foreground", children: resource.mimeType }), _jsx(TableCell, { className: "text-right tabular-nums text-muted-foreground", children: formatBytes(resource.size) }), _jsx(TableCell, { className: "text-muted-foreground", children: formatDate(resource.importedAt) }), _jsx(TableCell, { className: "text-muted-foreground", children: formatDate(resource.lastModified) })] }));
});
export const ResourceTable = memo(function ResourceTable({ resources, searchPlaceholder, editing, selected, onSelectedChange, }) {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState(ALL_TYPES_VALUE);
    const [sortKey, setSortKey] = useState('name');
    const [sortDirection, setSortDirection] = useState('none');
    const handleSort = useCallback((key) => {
        if (key === sortKey) {
            setSortDirection((current) => {
                if (current === 'none')
                    return 'asc';
                if (current === 'asc')
                    return 'desc';
                return 'none';
            });
            return;
        }
        setSortKey(key);
        setSortDirection('asc');
    }, [sortKey]);
    const mimeTypes = useMemo(() => {
        const types = new Set(resources.map((resource) => resource.mimeType));
        return Array.from(types).sort();
    }, [resources]);
    const filteredResources = useMemo(() => {
        const normalizedQuery = search.toLowerCase().trim();
        const nextResources = resources.filter((resource) => {
            if (typeFilter !== ALL_TYPES_VALUE && resource.mimeType !== typeFilter) {
                return false;
            }
            if (normalizedQuery && !resource.name.toLowerCase().includes(normalizedQuery)) {
                return false;
            }
            return true;
        });
        if (sortDirection !== 'none') {
            nextResources.sort((left, right) => compareResources(left, right, sortKey, sortDirection));
        }
        return nextResources;
    }, [resources, search, sortDirection, sortKey, typeFilter]);
    const allChecked = filteredResources.length > 0 &&
        filteredResources.every((resource) => selected.has(resource.id));
    const someChecked = !allChecked && filteredResources.some((resource) => selected.has(resource.id));
    const toggleAll = useCallback(() => {
        const nextSelected = new Set(selected);
        if (allChecked) {
            for (const resource of filteredResources) {
                nextSelected.delete(resource.id);
            }
        }
        else {
            for (const resource of filteredResources) {
                nextSelected.add(resource.id);
            }
        }
        onSelectedChange(nextSelected);
    }, [allChecked, filteredResources, onSelectedChange, selected]);
    const toggleOne = useCallback((id) => {
        const nextSelected = new Set(selected);
        if (nextSelected.has(id)) {
            nextSelected.delete(id);
        }
        else {
            nextSelected.add(id);
        }
        onSelectedChange(nextSelected);
    }, [onSelectedChange, selected]);
    return (_jsxs("div", { className: "flex flex-1 min-h-0 flex-col gap-3", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "relative flex-1", children: [_jsx(Search, { className: "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }), _jsx(Input, { placeholder: searchPlaceholder, value: search, onChange: (event) => setSearch(event.target.value), className: "pl-9" })] }), _jsxs(Select, { value: typeFilter, onValueChange: (value) => {
                            if (value !== null)
                                setTypeFilter(value);
                        }, children: [_jsx(SelectTrigger, { className: "w-[200px]", children: _jsx(SelectValue, { placeholder: t('library.allTypes') }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: ALL_TYPES_VALUE, children: t('library.allTypes') }), mimeTypes.map((type) => (_jsx(SelectItem, { value: type, children: type }, type)))] })] })] }), _jsx("div", { className: "flex-1 min-h-0 overflow-auto rounded-md border", children: _jsxs(Table, { children: [_jsx(TableHeader, { className: "sticky top-0 z-10 bg-background", children: _jsxs(TableRow, { children: [editing && (_jsx(TableHead, { className: "w-[40px]", children: _jsx(Checkbox, { checked: someChecked ? undefined : allChecked, indeterminate: someChecked, onCheckedChange: toggleAll }) })), COLUMN_KEYS.map((column) => (_jsx(TableHead, { className: column.className, children: _jsxs("button", { type: "button", className: "inline-flex items-center transition-colors hover:text-foreground", onClick: () => handleSort(column.key), children: [t(column.i18nKey), _jsx(SortIcon, { column: column.key, sortKey: sortKey, sortDirection: sortDirection })] }) }, column.key)))] }) }), _jsx(TableBody, { children: filteredResources.map((resource) => (_jsx(ResourceRow, { resource: resource, editing: editing, isSelected: selected.has(resource.id), onToggle: toggleOne }, resource.id))) })] }) })] }));
});
