import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { PageContainer, PageHeader, PageHeaderTitle, PageBody } from './page';
export const PageLoadingSkeleton = React.memo(function PageLoadingSkeleton() {
    return (_jsxs(PageContainer, { children: [_jsx(PageHeader, { children: _jsx(PageHeaderTitle, { children: _jsx(Skeleton, { className: "h-6 w-48" }) }) }), _jsx(PageBody, { className: "p-6", children: _jsxs("div", { className: "flex flex-col gap-4 max-w-3xl", children: [_jsx(Skeleton, { className: "h-8 w-1/2" }), _jsx(Skeleton, { className: "h-4 w-2/3" }), _jsxs("div", { className: "space-y-2 pt-4", children: [_jsx(Skeleton, { className: "h-3 w-full" }), _jsx(Skeleton, { className: "h-3 w-full" }), _jsx(Skeleton, { className: "h-3 w-11/12" }), _jsx(Skeleton, { className: "h-3 w-10/12" }), _jsx(Skeleton, { className: "h-3 w-full" }), _jsx(Skeleton, { className: "h-3 w-9/12" })] })] }) })] }));
});
PageLoadingSkeleton.displayName = 'PageLoadingSkeleton';
