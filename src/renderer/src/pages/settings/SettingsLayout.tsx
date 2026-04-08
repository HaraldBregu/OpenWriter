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
	{ path: '/settings/providers', labelKey: 'settings.tabs.providers' },
	{ path: '/settings/system', labelKey: 'settings.tabs.system' },
];

const LINK_BASE = 'block rounded-md px-2.5 py-1 text-sm transition-colors sm:px-3 sm:py-1.5';
const LINK_ACTIVE = 'bg-accent text-accent-foreground font-medium';
const LINK_INACTIVE = 'text-muted-foreground hover:text-foreground hover:bg-accent/50';

export function SettingsLayout(): React.JSX.Element {
	const { t } = useTranslation();
	useLanguage();

	return (
		<div className="flex h-full w-full mx-auto pl-3 pr-0 py-4 sm:pl-6 sm:py-8">
			{/* Left column — navigation (1/4 width) */}
			<div className="w-64 overflow-y-auto" role="navigation" aria-label={t('settings.title')}>
				<div className="space-y-0.5 px-2 pt-6 pb-3 sm:px-3 sm:pt-12 sm:pb-4">
					{NAV_ITEMS.map((item) => (
						<NavLink
							key={item.path}
							to={item.path}
							end
							className={({ isActive }) => `${LINK_BASE} ${isActive ? LINK_ACTIVE : LINK_INACTIVE}`}
						>
							{t(item.labelKey)}
						</NavLink>
					))}
				</div>
			</div>

			{/* Right column — content (3/4 width) */}
			<div className="w-full overflow-y-auto">
				<Outlet />
			</div>
		</div>
	);
}
