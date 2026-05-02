import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
export function TipSection() {
    const { t } = useTranslation();
    return (_jsx(Card, { size: "sm", children: _jsxs(CardContent, { className: "flex items-start gap-3", children: [_jsx(Star, { className: "mt-0.5 h-4 w-4 shrink-0 text-warning" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-foreground", children: t('home.tip') }), _jsx("p", { className: "mt-0.5 text-xs leading-relaxed text-muted-foreground", children: t('home.tipContent') })] })] }) }));
}
