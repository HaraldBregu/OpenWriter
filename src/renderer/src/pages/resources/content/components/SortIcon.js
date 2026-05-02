import { jsx as _jsx } from "react/jsx-runtime";
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
export function SortIcon({ active, direction }) {
    if (!active || direction === 'none')
        return _jsx(ArrowUpDown, { className: "ml-1 inline h-3 w-3 opacity-40" });
    if (direction === 'asc')
        return _jsx(ArrowUp, { className: "ml-1 inline h-3 w-3" });
    return _jsx(ArrowDown, { className: "ml-1 inline h-3 w-3" });
}
