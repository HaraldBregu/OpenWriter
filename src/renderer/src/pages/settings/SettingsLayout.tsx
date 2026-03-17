import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
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

const LINK_BASE = 'block px-3 py-1.5 rounded-md text-sm transition-colors';
const LINK_ACTIVE = 'bg-accent text-accent-foreground font-medium';
const LINK_INACTIVE = 'text-muted-foreground hover:text-foreground hover:bg-accent/50';

export function SettingsLayout(): React.JSX.Element {
	const { t } = useTranslation();
	useLanguage();

	return (
		<div className="grid grid-cols-[200px_1fr] h-full">
			{/* Left column — navigation */}
			<aside
				className="border-r bg-muted/30 overflow-y-auto"
				aria-label={t('settings.title')}
			>
				<nav className="px-3 py-4 space-y-0.5" aria-label={t('settings.title')}>
					{NAV_ITEMS.map((item) => (
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
				</nav>
			</aside>

			{/* Right column — content */}
			<main className="overflow-y-auto">
				<Outlet />
			</main>
		</div>
	);
}
