import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Provider } from './Provider';
const Layout = forwardRef(({ id, className, editor, onImageInsert, children }, ref) => {
    const containerRef = useRef(null);
    return (_jsx("div", { id: id, className: cn('h-full min-w-0 flex flex-col', className), children: _jsx("div", { className: "flex-1 overflow-y-auto overflow-x-hidden bg-background", children: _jsx("div", { className: "mx-auto flex w-full max-w-4xl flex-col gap-2 px-10 py-10", children: _jsx("div", { className: "relative w-full", ref: ref, children: _jsx("div", { ref: containerRef, className: "relative", style: { paddingLeft: 30, paddingRight: 30 }, children: editor ? (_jsx(Provider, { editor: editor, containerRef: containerRef, onImageInsert: onImageInsert, children: children })) : (children) }) }) }) }) }));
});
Layout.displayName = 'Layout';
export default Layout;
