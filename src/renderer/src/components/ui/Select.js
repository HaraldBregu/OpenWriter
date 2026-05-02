import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { Select as SelectPrimitive } from '@base-ui/react/select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
function Select({ ...props }) {
    return _jsx(SelectPrimitive.Root, { ...props });
}
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;
const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => (_jsxs(SelectPrimitive.Trigger, { ref: ref, "data-slot": "select-trigger", className: cn('flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1', className), ...props, children: [children, _jsx(SelectPrimitive.Icon, { children: _jsx(ChevronDown, { className: "h-4 w-4 opacity-50" }) })] })));
SelectTrigger.displayName = 'SelectTrigger';
const SelectScrollUpButton = React.forwardRef(({ className, ...props }, ref) => (_jsx(SelectPrimitive.ScrollUpArrow, { ref: ref, className: cn('flex cursor-default items-center justify-center py-1', className), ...props, children: _jsx(ChevronUp, { className: "h-4 w-4" }) })));
SelectScrollUpButton.displayName = 'SelectScrollUpButton';
const SelectScrollDownButton = React.forwardRef(({ className, ...props }, ref) => (_jsx(SelectPrimitive.ScrollDownArrow, { ref: ref, className: cn('flex cursor-default items-center justify-center py-1', className), ...props, children: _jsx(ChevronDown, { className: "h-4 w-4" }) })));
SelectScrollDownButton.displayName = 'SelectScrollDownButton';
const SelectContent = React.forwardRef(({ className, children, side = 'bottom', sideOffset = 4, align, alignOffset, ...props }, ref) => (_jsx(SelectPrimitive.Portal, { children: _jsx(SelectPrimitive.Positioner, { side: side, sideOffset: sideOffset, align: align, alignOffset: alignOffset, children: _jsxs(SelectPrimitive.Popup, { ref: ref, className: cn('relative z-50 max-h-96 min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--transform-origin)', className), ...props, children: [_jsx(SelectScrollUpButton, {}), _jsx(SelectPrimitive.List, { className: "p-1", children: children }), _jsx(SelectScrollDownButton, {})] }) }) })));
SelectContent.displayName = 'SelectContent';
const SelectLabel = React.forwardRef(({ className, ...props }, ref) => (_jsx(SelectPrimitive.GroupLabel, { ref: ref, className: cn('py-1.5 pl-8 pr-2 text-sm font-semibold', className), ...props })));
SelectLabel.displayName = 'SelectLabel';
const SelectItem = React.forwardRef(({ className, children, ...props }, ref) => (_jsxs(SelectPrimitive.Item, { ref: ref, className: cn('relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50', className), ...props, children: [_jsx("span", { className: "absolute left-2 flex h-3.5 w-3.5 items-center justify-center", children: _jsx(SelectPrimitive.ItemIndicator, { children: _jsx(Check, { className: "h-4 w-4" }) }) }), _jsx(SelectPrimitive.ItemText, { children: children })] })));
SelectItem.displayName = 'SelectItem';
const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => (_jsx("div", { ref: ref, className: cn('-mx-1 my-1 h-px bg-muted', className), ...props })));
SelectSeparator.displayName = 'SelectSeparator';
export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectLabel, SelectItem, SelectSeparator, SelectScrollUpButton, SelectScrollDownButton, };
