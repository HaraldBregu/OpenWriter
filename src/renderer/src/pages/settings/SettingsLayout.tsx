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

export function SettingsLayout(): React.JSX.Element {
	const { t } = useTranslation();
	const location = useLocation();
	useLanguage();

	return (
		<div className="flex h-full">
			{/* Sidebar navigation */}
			<aside className="w-56 shrink-0 border-r overflow-y-auto bg-muted/30">
				<nav className="px-3 py-4 space-y-0.5" aria-label={t('settings.title')}>
					{NAV_ITEMS.map((item) => {
						const active = isItemActive(item.path, location.pathname);
						return (
							<NavLink
								key={item.path}
								to={item.path}
								className={[
									'block px-3 py-1.5 rounded-md text-sm transition-colors',
									active
										? 'bg-accent text-accent-foreground font-medium'
										: 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
								].join(' ')}
								aria-current={active ? 'page' : undefined}
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
