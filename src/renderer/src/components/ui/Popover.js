'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import * as React from 'react';
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import { cn } from '@/lib/utils';
function Popover({ ...props }) {
    return _jsx(PopoverPrimitive.Root, { ...props });
}
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverContent = React.forwardRef(({ className, align = 'center', sideOffset = 4, side, alignOffset, ...props }, ref) => (_jsx(PopoverPrimitive.Portal, { children: _jsx(PopoverPrimitive.Positioner, { align: align, alignOffset: alignOffset, side: side, sideOffset: sideOffset, className: "z-50", children: _jsx(PopoverPrimitive.Popup, { ref: ref, className: cn('z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--transform-origin)', className), ...props }) }) })));
PopoverContent.displayName = 'PopoverContent';
function PopoverHeader({ className, ...props }) {
    return _jsx("div", { className: cn('flex flex-col gap-1', className), ...props });
}
function PopoverTitle({ className, ...props }) {
    return _jsx("p", { className: cn('text-sm font-medium leading-none', className), ...props });
}
function PopoverDescription({ className, ...props }) {
    return _jsx("div", { className: cn('text-sm text-muted-foreground', className), ...props });
}
export { Popover, PopoverTrigger, PopoverContent, PopoverHeader, PopoverTitle, PopoverDescription };
