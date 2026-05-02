import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PenLine, Bot, FolderOpen } from 'lucide-react';
import { useCreateWriting } from '@/hooks/use-create-writing';
import { CategoryCard } from './CategoryCard';
export function QuickActions() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { createWriting, isCreating } = useCreateWriting();
    return (_jsxs("section", { className: "space-y-3", children: [_jsx("p", { className: "text-xs font-semibold uppercase tracking-wider text-muted-foreground", children: t('home.quickActions', 'Quick actions') }), _jsxs("div", { className: "grid grid-cols-1 gap-3 sm:grid-cols-3", children: [_jsx(CategoryCard, { icon: PenLine, labelKey: "home.writing", descriptionKey: "home.writingDescription", accent: "bg-foreground/8 text-foreground", onClick: createWriting, disabled: isCreating }), _jsx(CategoryCard, { icon: FolderOpen, labelKey: "home.documents", descriptionKey: "home.documentsDescription", accent: "bg-muted text-foreground", onClick: () => navigate('/resources/documents') }), _jsx(CategoryCard, { icon: Bot, labelKey: "common.agents", descriptionKey: "home.chatDescription", accent: "bg-secondary text-foreground", onClick: () => navigate('/agents') })] })] }));
}
