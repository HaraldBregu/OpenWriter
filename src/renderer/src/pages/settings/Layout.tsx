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

interface NavItemDefinition {
	readonly path: string;
	readonly labelKey: string;
}

const NAV_SECTIONS: readonly NavItemDefinition[][] = [
	[
		{ path: '/settings/general', labelKey: 'settings.tabs.general' },
		{ path: '/settings/workspace', labelKey: 'settings.tabs.workspace' },
	],
	[
		{ path: '/settings/providers', labelKey: 'settings.tabs.providers' },
		{ path: '/settings/models', labelKey: 'settings.tabs.models' },
		{ path: '/settings/agents', labelKey: 'settings.tabs.agents' },
		{ path: '/settings/skill', labelKey: 'settings.tabs.skill' },
	],
	[
		{ path: '/settings/editor', labelKey: 'settings.tabs.editor' },
		{ path: '/settings/themes', labelKey: 'settings.tabs.themes' },
	],
	[
		{ path: '/settings/system', labelKey: 'settings.tabs.system' },
		{ path: '/settings/developer', labelKey: 'settings.tabs.developer' },
	],
];

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
						{NAV_SECTIONS.map((section, sectionIndex) => (
							<React.Fragment key={section[0]?.path ?? sectionIndex}>
								{sectionIndex > 0 ? <Separator className="my-2" /> : null}
								<div className="space-y-0.5">
									{section.map((item) => (
										<NavLink
											key={item.path}
											to={item.path}
											end
											className={({ isActive }) =>
												`${LINK_BASE} ${isActive ? LINK_ACTIVE : LINK_INACTIVE}`
											}
										>
											{t(item.labelKey)}
										</NavLink>
									))}
								</div>
							</React.Fragment>
						))}
					</div>
				</PageSidebar>
				<PageSidebarInset>
					<Outlet />
				</PageSidebarInset>
			</PageBody>
		</PageContainer>
	);
}
