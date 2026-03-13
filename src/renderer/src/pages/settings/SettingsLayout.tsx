import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../hooks/use-language';

interface TabDefinition {
	readonly path: string;
	readonly labelKey: string;
}

const TABS: TabDefinition[] = [
	{ path: '/settings/general', labelKey: 'settings.tabs.general' },
	{ path: '/settings/models', labelKey: 'settings.tabs.models' },
	{ path: '/settings/agents', labelKey: 'settings.tabs.agents' },
	{ path: '/settings/media', labelKey: 'settings.tabs.media' },
	{ path: '/settings/devices', labelKey: 'settings.tabs.devices' },
	{ path: '/settings/tools', labelKey: 'settings.tabs.tools' },
	{ path: '/settings/system', labelKey: 'settings.tabs.system' },
];

const BASE_CLASSES =
	'px-4 py-3 text-sm font-normal border-b-2 transition-colors border-transparent text-muted-foreground hover:text-foreground';
const ACTIVE_CLASSES = 'border-foreground text-foreground';
const INACTIVE_CLASSES = 'border-transparent text-muted-foreground hover:text-foreground';

export function SettingsLayout(): React.JSX.Element {
	const { t } = useTranslation();
	const location = useLocation();
	useLanguage();

	const isGeneralActive =
		location.pathname === '/settings' || location.pathname === '/settings/general';

	return (
		<div className="flex flex-col h-full">
			<div className="border-b px-6">
				<nav className="flex gap-0 -mb-px">
					{TABS.map((tab) => {
						const isGeneral = tab.path === '/settings/general';

						if (isGeneral) {
							return (
								<NavLink
									key={tab.path}
									to={tab.path}
									className={`${BASE_CLASSES} ${isGeneralActive ? ACTIVE_CLASSES : INACTIVE_CLASSES}`}
								>
									{t(tab.labelKey)}
								</NavLink>
							);
						}

						return (
							<NavLink
								key={tab.path}
								to={tab.path}
								className={({ isActive }) =>
									`${BASE_CLASSES} ${isActive ? ACTIVE_CLASSES : INACTIVE_CLASSES}`
								}
							>
								{t(tab.labelKey)}
							</NavLink>
						);
					})}
				</nav>
			</div>

			<div className="flex-1 overflow-y-auto">
				<Outlet />
			</div>
		</div>
	);
}
