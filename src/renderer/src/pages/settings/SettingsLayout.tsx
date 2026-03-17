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
		<div className="flex gap-4 h-full w-full max-w-lg mx-auto">
			{/* Left column — navigation (1/4 width) */}
			<div className="w-1/4 overflow-y-auto" role="navigation" aria-label={t('settings.title')}>
				<div className="px-3 py-4 space-y-0.5">
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
			<div className="w-3/4 overflow-y-auto py-6">
				<Outlet />
			</div>
		</div>
	);
}
