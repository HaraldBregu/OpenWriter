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
	{ path: '/settings/system', labelKey: 'settings.tabs.system' },
];

const TAB_BASE = 'px-4 py-3 text-sm font-normal border-b-2 transition-colors';
const TAB_ACTIVE = 'border-foreground text-foreground';
const TAB_INACTIVE = 'border-transparent text-muted-foreground hover:text-foreground';

function getTabClass(tabPath: string, currentPathname: string): string {
	const isGeneralTab = tabPath === '/settings/general';
	const isActive = isGeneralTab
		? currentPathname === '/settings' || currentPathname === '/settings/general'
		: currentPathname === tabPath;

	return `${TAB_BASE} ${isActive ? TAB_ACTIVE : TAB_INACTIVE}`;
}

export function SettingsLayout(): React.JSX.Element {
	const { t } = useTranslation();
	const location = useLocation();
	useLanguage();

	return (
		<div className="flex flex-col h-full">
			<div className="border-b px-6">
				<nav className="flex gap-0 -mb-px">
					{TABS.map((tab) => (
						<NavLink
							key={tab.path}
							to={tab.path}
							className={getTabClass(tab.path, location.pathname)}
						>
							{t(tab.labelKey)}
						</NavLink>
					))}
				</nav>
			</div>

			<div className="flex-1 overflow-y-auto">
				<Outlet />
			</div>
		</div>
	);
}
