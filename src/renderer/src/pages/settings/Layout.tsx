import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
	PageBody,
	PageContainer,
	PageHeader,
	PageHeaderTitle,
	PageSidebar,
	PageSidebarInset,
} from '@/components/app/base/page';
import { useLanguageMode } from '@/hooks/use-language-mode';
import { Button } from '@/components/ui/Button';

interface NavItemProps {
	readonly to: string;
	readonly label: string;
}

function NavItem({ to, label }: NavItemProps): React.JSX.Element {
	return (
		<NavLink to={to} end className="block outline-none">
			{({ isActive }) => (
				<Button
					variant={isActive ? 'secondary' : 'ghost'}
					size="sm"
					className="w-full justify-start"
					render={<span />}
				>
					{label}
				</Button>
			)}
		</NavLink>
	);
}

export function Layout(): React.JSX.Element {
	const { t } = useTranslation();
	useLanguageMode();

	return (
		<PageContainer>
			<PageHeader>
				<PageHeaderTitle>{t('settings.title')}</PageHeaderTitle>
			</PageHeader>
			<PageBody className="flex-row overflow-hidden">
				<PageSidebar className="w-64 border-r-0">
					<div className="flex flex-col gap-0.5">
						<NavItem to="/settings/general" label={t('settings.tabs.general')} />
						<NavItem to="/settings/workspace" label={t('settings.tabs.workspace')} />
					</div>
					<div className="my-2 border-t" />
					<div className="flex flex-col gap-0.5">
						<NavItem to="/settings/providers" label={t('settings.tabs.providers')} />
						<NavItem to="/settings/models" label={t('settings.tabs.models')} />
						<NavItem to="/settings/agents" label={t('settings.tabs.agents')} />
						<NavItem to="/settings/skill" label={t('settings.tabs.skill')} />
						<NavItem to="/settings/extensions" label={t('settings.tabs.extensions')} />
					</div>
					<div className="my-2 border-t" />
					<div className="flex flex-col gap-0.5">
						<NavItem to="/settings/editor" label={t('settings.tabs.editor')} />
						<NavItem to="/settings/themes" label={t('settings.tabs.themes')} />
					</div>
					<div className="my-2 border-t" />
					<div className="flex flex-col gap-0.5">
						<NavItem to="/settings/system" label={t('settings.tabs.system')} />
						<NavItem to="/settings/developer" label={t('settings.tabs.developer')} />
					</div>
				</PageSidebar>
				<PageSidebarInset>
					<Outlet />
				</PageSidebarInset>
			</PageBody>
		</PageContainer>
	);
}
