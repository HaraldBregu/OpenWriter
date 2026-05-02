import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageBody, PageContainer, PageHeader, PageHeaderTitle, PageSidebar, PageSidebarInset, } from '@/components/app/base/page';
import { useLanguageMode } from '@/hooks/use-language-mode';
import { Button } from '@/components/ui/Button';
function NavItem({ to, label }) {
    return (_jsx(NavLink, { to: to, end: true, className: "block outline-none", children: ({ isActive }) => (_jsx(Button, { nativeButton: false, variant: isActive ? 'secondary' : 'ghost', size: "md", className: "w-full justify-start", render: _jsx("span", {}), children: label })) }));
}
export function Layout() {
    const { t } = useTranslation();
    useLanguageMode();
    return (_jsxs(PageContainer, { children: [_jsx(PageHeader, { children: _jsx(PageHeaderTitle, { children: t('settings.title') }) }), _jsxs(PageBody, { className: "flex-row overflow-hidden p-0", children: [_jsx(PageSidebar, { className: "w-64 border-r-0", children: _jsxs("div", { className: "flex flex-col gap-0.5", children: [_jsx(NavItem, { to: "/settings/general", label: t('settings.tabs.general') }), _jsx(NavItem, { to: "/settings/account", label: t('settings.tabs.account') }), _jsx(NavItem, { to: "/settings/workspace", label: t('settings.tabs.workspace') }), _jsx(NavItem, { to: "/settings/providers", label: t('settings.tabs.providers') }), _jsx(NavItem, { to: "/settings/agents", label: t('settings.tabs.agents') }), _jsx(NavItem, { to: "/settings/editor", label: t('settings.tabs.editor') }), _jsx(NavItem, { to: "/settings/themes", label: t('settings.tabs.themes') }), _jsx(NavItem, { to: "/settings/system", label: t('settings.tabs.system') }), _jsx(NavItem, { to: "/settings/developer", label: t('settings.tabs.developer') })] }) }), _jsx(PageSidebarInset, { children: _jsx(Outlet, {}) })] })] }));
}
