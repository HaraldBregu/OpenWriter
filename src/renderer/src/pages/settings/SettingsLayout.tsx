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
		<div className="h-full max-w-screen-md mx-auto">
			<div className="grid grid-cols-[240px_1fr] h-full">
				{/* Left column — navigation */}
				<div
					className="flex flex-col border-r bg-muted/50 overflow-y-auto"
					role="navigation"
					aria-label={t('settings.title')}
				>
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

				{/* Right column — content */}
				<div className="flex flex-col overflow-y-auto px-8 py-6">
					<Outlet />
				</div>
			</div>
		</div>
	);
}
