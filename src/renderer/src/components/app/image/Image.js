import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/Card';
function Image({ className, caption, description, size, cardClassName, alt = '', ...props }) {
    return (_jsxs(Card, { size: size, className: cardClassName, children: [_jsx("img", { "data-slot": "image", className: cn('w-full object-cover', className), alt: alt, ...props }), (caption || description) && (_jsxs(CardContent, { children: [caption && _jsx(CardTitle, { children: caption }), description && _jsx(CardDescription, { children: description })] }))] }));
}
export { Image };
