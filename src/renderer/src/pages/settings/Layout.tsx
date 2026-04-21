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
import { Separator } from '@/components/ui/Separator';

const LINK_BASE = 'block rounded-md px-2.5 py-1 text-sm transition-colors sm:px-3 sm:py-1.5';
const LINK_ACTIVE = 'bg-accent text-accent-foreground font-medium';
const LINK_INACTIVE = 'text-muted-foreground hover:text-foreground hover:bg-accent/50';

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
					<div
						className="px-2 pt-6 pb-3 sm:px-3 sm:pt-12 sm:pb-4"
						role="navigation"
						aria-label={t('settings.title')}
					>
						<div className="space-y-0.5">
							<NavLink
								to="/settings/general"
								end
								className={({ isActive }) =>
									`${LINK_BASE} ${isActive ? LINK_ACTIVE : LINK_INACTIVE}`
								}
							>
								{t('settings.tabs.general')}
							</NavLink>
							<NavLink
								to="/settings/workspace"
								end
								className={({ isActive }) =>
									`${LINK_BASE} ${isActive ? LINK_ACTIVE : LINK_INACTIVE}`
								}
							>
								{t('settings.tabs.workspace')}
							</NavLink>
						</div>

						<Separator className="my-2" />

						<div className="space-y-0.5">
							<NavLink
								to="/settings/providers"
								end
								className={({ isActive }) =>
									`${LINK_BASE} ${isActive ? LINK_ACTIVE : LINK_INACTIVE}`
								}
							>
								{t('settings.tabs.providers')}
							</NavLink>
							<NavLink
								to="/settings/models"
								end
								className={({ isActive }) =>
									`${LINK_BASE} ${isActive ? LINK_ACTIVE : LINK_INACTIVE}`
								}
							>
								{t('settings.tabs.models')}
							</NavLink>
							<NavLink
								to="/settings/agents"
								end
								className={({ isActive }) =>
									`${LINK_BASE} ${isActive ? LINK_ACTIVE : LINK_INACTIVE}`
								}
							>
								{t('settings.tabs.agents')}
							</NavLink>
							<NavLink
								to="/settings/skill"
								end
								className={({ isActive }) =>
									`${LINK_BASE} ${isActive ? LINK_ACTIVE : LINK_INACTIVE}`
								}
							>
								{t('settings.tabs.skill')}
							</NavLink>
						</div>

						<Separator className="my-2" />

						<div className="space-y-0.5">
							<NavLink
								to="/settings/editor"
								end
								className={({ isActive }) =>
									`${LINK_BASE} ${isActive ? LINK_ACTIVE : LINK_INACTIVE}`
								}
							>
								{t('settings.tabs.editor')}
							</NavLink>
							<NavLink
								to="/settings/themes"
								end
								className={({ isActive }) =>
									`${LINK_BASE} ${isActive ? LINK_ACTIVE : LINK_INACTIVE}`
								}
							>
								{t('settings.tabs.themes')}
							</NavLink>
						</div>

						<Separator className="my-2" />

						<div className="space-y-0.5">
							<NavLink
								to="/settings/system"
								end
								className={({ isActive }) =>
									`${LINK_BASE} ${isActive ? LINK_ACTIVE : LINK_INACTIVE}`
								}
							>
								{t('settings.tabs.system')}
							</NavLink>
							<NavLink
								to="/settings/developer"
								end
								className={({ isActive }) =>
									`${LINK_BASE} ${isActive ? LINK_ACTIVE : LINK_INACTIVE}`
								}
							>
								{t('settings.tabs.developer')}
							</NavLink>
						</div>
					</div>
				</PageSidebar>
				<PageSidebarInset>
					<Outlet />
				</PageSidebarInset>
			</PageBody>
		</PageContainer>
	);
}
