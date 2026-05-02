import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
import { PageContainer, PageBody } from '@/components/app/base/page';
import { Separator } from '@/components/ui/Separator';
import { QuickActions, RecentDocuments, TipSection, ResourcesSection, ToolsSection, } from './components';
import Layout from './Layout';
function useGreeting() {
    const { t } = useTranslation();
    const hour = new Date().getHours();
    if (hour < 12)
        return t('home.goodMorning');
    if (hour < 18)
        return t('home.goodAfternoon');
    return t('home.goodEvening');
}
function PageContent() {
    const { t } = useTranslation();
    const greeting = useGreeting();
    return (_jsx(PageContainer, { children: _jsx(PageBody, { children: _jsxs("div", { className: "w-full space-y-10 px-8 py-12", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs font-semibold uppercase tracking-wider text-muted-foreground", children: t('home.dashboard', 'Dashboard') }), _jsx("h1", { className: "mt-2 text-2xl font-medium tracking-tight text-foreground", children: greeting }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: t('home.workOnToday') })] }), _jsx(QuickActions, {}), _jsx(Separator, {}), _jsx(ResourcesSection, {}), _jsx(Separator, {}), _jsx(ToolsSection, {}), _jsx(Separator, {}), _jsx(RecentDocuments, {}), _jsx(Separator, {}), _jsx(TipSection, {})] }) }) }));
}
export default function Page() {
    return (_jsx(Layout, { children: _jsx(PageContent, {}) }));
}
