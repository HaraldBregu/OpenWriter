import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { File, FileText } from 'lucide-react';
import { CategoryCard } from './CategoryCard';
export function ResourcesSection() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    return (_jsxs("section", { className: "space-y-3", children: [_jsx("p", { className: "text-xs font-semibold uppercase tracking-wider text-muted-foreground", children: t('appLayout.resources', 'Resources') }), _jsxs("div", { className: "grid grid-cols-1 gap-3 sm:grid-cols-2", children: [_jsx(CategoryCard, { icon: File, labelKey: "appLayout.files", descriptionKey: "home.filesDescription", accent: "bg-foreground/8 text-foreground", onClick: () => navigate('/resources/images') }), _jsx(CategoryCard, { icon: FileText, labelKey: "appLayout.content", descriptionKey: "home.contentDescription", accent: "bg-muted text-foreground", onClick: () => navigate('/resources/content') })] })] }));
}
