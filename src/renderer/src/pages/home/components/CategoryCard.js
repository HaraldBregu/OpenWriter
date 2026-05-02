import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
export const CategoryCard = React.memo(function CategoryCard({ icon: Icon, labelKey, descriptionKey, accent, onClick, disabled, }) {
    const { t } = useTranslation();
    return (_jsx(Card, { size: "sm", className: "group cursor-pointer transition-all hover:ring-foreground/15 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50", onClick: disabled ? undefined : onClick, "aria-disabled": disabled, children: _jsxs(CardContent, { className: "flex flex-col gap-3", children: [_jsx("div", { className: `h-9 w-9 rounded-full flex items-center justify-center transition-colors group-hover:bg-primary group-hover:text-primary-foreground ${accent}`, children: _jsx(Icon, { className: "h-4 w-4" }) }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-foreground", children: t(labelKey) }), _jsx("p", { className: "mt-0.5 text-xs text-muted-foreground", children: t(descriptionKey) })] }), _jsx(ArrowRight, { className: "mt-auto h-3.5 w-3.5 self-end text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-foreground" })] }) }));
});
CategoryCard.displayName = 'CategoryCard';
