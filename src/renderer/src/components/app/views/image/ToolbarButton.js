import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';
export function ToolbarButton({ icon, label, onClick, active, disabled, }) {
    return (_jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { render: _jsx(Button, { variant: "ghost", size: "icon-xs", "aria-label": label, "aria-pressed": active, onClick: onClick, disabled: disabled, className: cn('h-8 w-8 rounded-full text-muted-foreground transition-colors hover:text-foreground [&_svg]:h-4 [&_svg]:w-4', active && 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary'), children: icon }) }), _jsx(TooltipContent, { side: "top", sideOffset: 4, className: "px-2 py-1 text-xs", children: label })] }));
}
