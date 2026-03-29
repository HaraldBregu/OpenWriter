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
	{ path: '/settings/agents', labelKey: 'settings.tabs.agents' },
	{ path: '/settings/system', labelKey: 'settings.tabs.system' },
];

const LINK_BASE = 'block px-3 py-1.5 rounded-md text-sm transition-colors';
const LINK_ACTIVE = 'bg-accent text-accent-foreground font-medium';
const LINK_INACTIVE = 'text-muted-foreground hover:text-foreground hover:bg-accent/50';

export function SettingsLayout(): React.JSX.Element {
	const { t } = useTranslation();
	useLanguage();

	return (
		<div className="flex min-h-full w-full items-center justify-center p-6">
			<div className="flex w-full max-w-6xl overflow-hidden rounded-3xl border bg-card shadow-sm max-h-[calc(100svh-7rem)] min-h-[36rem]">
				{/* Left column — navigation */}
				<div
					className="w-64 shrink-0 overflow-y-auto border-r bg-muted/30"
					role="navigation"
					aria-label={t('settings.title')}
				>
					<div className="px-3 py-4 space-y-0.5">
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
					</div>
				</div>

				{/* Right column — content */}
				<div className="flex-1 overflow-y-auto">
					<Outlet />
				</div>
			</div>
		</div>
	);
}
