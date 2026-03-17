import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../hooks/use-language';

interface NavItemDefinition {
	readonly path: string;
	readonly labelKey: string;
}

const NAV_ITEMS: NavItemDefinition[] = [
	{ path: '/settings/general', labelKey: 'settings.tabs.general' },
	{ path: '/settings/workspace', labelKey: 'settings.tabs.workspace' },
	{ path: '/settings/models', labelKey: 'settings.tabs.models' },
	{ path: '/settings/system', labelKey: 'settings.tabs.system' },
];

function isItemActive(itemPath: string, currentPathname: string): boolean {
	const isGeneralItem = itemPath === '/settings/general';
	return isGeneralItem
		? currentPathname === '/settings' || currentPathname === '/settings/general'
		: currentPathname === itemPath;
}

const LINK_BASE = 'block px-3 py-1.5 rounded-md text-sm transition-colors';
const LINK_ACTIVE = 'bg-accent text-accent-foreground font-medium';
const LINK_INACTIVE = 'text-muted-foreground hover:text-foreground hover:bg-muted/50';

export function SettingsLayout(): React.JSX.Element {
	const { t } = useTranslation();
	const location = useLocation();
	useLanguage();

	return (
		<div className="flex h-full">
			{/* Sidebar */}
			<aside className="w-52 border-r shrink-0 overflow-y-auto">
				<div className="px-4 pt-6 pb-4">
					<h2 className="text-sm font-medium">{t('settings.title')}</h2>
				</div>
				<nav className="px-3 pb-4 space-y-0.5">
					{NAV_ITEMS.map((item) => {
						const active = isItemActive(item.path, location.pathname);
						return (
							<NavLink
								key={item.path}
								to={item.path}
								className={`${LINK_BASE} ${active ? LINK_ACTIVE : LINK_INACTIVE}`}
							>
								{t(item.labelKey)}
							</NavLink>
						);
					})}
				</nav>
			</aside>

			{/* Content */}
			<div className="flex-1 overflow-y-auto">
				<Outlet />
			</div>
		</div>
	);
}
