import { jsx as _jsx } from "react/jsx-runtime";
import { memo } from 'react';
import { cn } from '@/lib/utils';
export const TitleBarContainer = memo(function AppTitleBarContainer({ className, children, }) {
    return (_jsx("div", { className: cn('relative z-20 flex h-12 shrink-0 items-center select-none border-b border-border backdrop-blur-md', className), style: {
            WebkitAppRegion: 'drag',
        }, children: children }));
});
