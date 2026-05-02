import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
import { Search, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCommandModal } from '@/components/app/command-modals';
import { CategoryCard } from './CategoryCard';
export function ToolsSection() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { open } = useCommandModal();
    return (_jsxs("section", { className: "space-y-3", children: [_jsx("p", { className: "text-xs font-semibold uppercase tracking-wider text-muted-foreground", children: t('home.tools', 'Tools') }), _jsxs("div", { className: "grid grid-cols-1 gap-3 sm:grid-cols-2", children: [_jsx(CategoryCard, { icon: Search, labelKey: "common.search", descriptionKey: "home.searchDescription", accent: "bg-foreground/8 text-foreground", onClick: () => open('search') }), _jsx(CategoryCard, { icon: Settings, labelKey: "menu.settings", descriptionKey: "home.settingsDescription", accent: "bg-secondary text-foreground", onClick: () => navigate('/settings/general') })] })] }));
}
