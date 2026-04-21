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
import { Item, ItemContent, ItemGroup, ItemSeparator, ItemTitle } from '@/components/ui/Item';

const LINK_BASE = 'block rounded-lg outline-none';
const ITEM_BASE = 'border-transparent px-2.5 py-1 sm:px-3 sm:py-1.5';
const ITEM_ACTIVE = 'bg-accent text-accent-foreground';
const ITEM_INACTIVE = 'text-muted-foreground hover:bg-accent/50 hover:text-foreground';

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
						<ItemGroup className="gap-0.5">
							<NavLink to="/settings/general" end className={LINK_BASE}>
								{({ isActive }) => (
									<Item
										size="xs"
										role="listitem"
										className={`${ITEM_BASE} ${isActive ? ITEM_ACTIVE : ITEM_INACTIVE}`}
									>
										<ItemContent>
											<ItemTitle>{t('settings.tabs.general')}</ItemTitle>
										</ItemContent>
									</Item>
								)}
							</NavLink>
							<NavLink to="/settings/workspace" end className={LINK_BASE}>
								{({ isActive }) => (
									<Item
										size="xs"
										role="listitem"
										className={`${ITEM_BASE} ${isActive ? ITEM_ACTIVE : ITEM_INACTIVE}`}
									>
										<ItemContent>
											<ItemTitle>{t('settings.tabs.workspace')}</ItemTitle>
										</ItemContent>
									</Item>
								)}
							</NavLink>
						</ItemGroup>

						<ItemSeparator />

						<ItemGroup className="gap-0.5">
							<NavLink to="/settings/providers" end className={LINK_BASE}>
								{({ isActive }) => (
									<Item
										size="xs"
										role="listitem"
										className={`${ITEM_BASE} ${isActive ? ITEM_ACTIVE : ITEM_INACTIVE}`}
									>
										<ItemContent>
											<ItemTitle>{t('settings.tabs.providers')}</ItemTitle>
										</ItemContent>
									</Item>
								)}
							</NavLink>
							<NavLink to="/settings/models" end className={LINK_BASE}>
								{({ isActive }) => (
									<Item
										size="xs"
										role="listitem"
										className={`${ITEM_BASE} ${isActive ? ITEM_ACTIVE : ITEM_INACTIVE}`}
									>
										<ItemContent>
											<ItemTitle>{t('settings.tabs.models')}</ItemTitle>
										</ItemContent>
									</Item>
								)}
							</NavLink>
							<NavLink to="/settings/agents" end className={LINK_BASE}>
								{({ isActive }) => (
									<Item
										size="xs"
										role="listitem"
										className={`${ITEM_BASE} ${isActive ? ITEM_ACTIVE : ITEM_INACTIVE}`}
									>
										<ItemContent>
											<ItemTitle>{t('settings.tabs.agents')}</ItemTitle>
										</ItemContent>
									</Item>
								)}
							</NavLink>
							<NavLink to="/settings/skill" end className={LINK_BASE}>
								{({ isActive }) => (
									<Item
										size="xs"
										role="listitem"
										className={`${ITEM_BASE} ${isActive ? ITEM_ACTIVE : ITEM_INACTIVE}`}
									>
										<ItemContent>
											<ItemTitle>{t('settings.tabs.skill')}</ItemTitle>
										</ItemContent>
									</Item>
								)}
							</NavLink>
						</ItemGroup>

						<ItemSeparator />

						<ItemGroup className="gap-0.5">
							<NavLink to="/settings/editor" end className={LINK_BASE}>
								{({ isActive }) => (
									<Item
										size="xs"
										role="listitem"
										className={`${ITEM_BASE} ${isActive ? ITEM_ACTIVE : ITEM_INACTIVE}`}
									>
										<ItemContent>
											<ItemTitle>{t('settings.tabs.editor')}</ItemTitle>
										</ItemContent>
									</Item>
								)}
							</NavLink>
							<NavLink to="/settings/themes" end className={LINK_BASE}>
								{({ isActive }) => (
									<Item
										size="xs"
										role="listitem"
										className={`${ITEM_BASE} ${isActive ? ITEM_ACTIVE : ITEM_INACTIVE}`}
									>
										<ItemContent>
											<ItemTitle>{t('settings.tabs.themes')}</ItemTitle>
										</ItemContent>
									</Item>
								)}
							</NavLink>
						</ItemGroup>

						<ItemSeparator />

						<ItemGroup className="gap-0.5">
							<NavLink to="/settings/system" end className={LINK_BASE}>
								{({ isActive }) => (
									<Item
										size="xs"
										role="listitem"
										className={`${ITEM_BASE} ${isActive ? ITEM_ACTIVE : ITEM_INACTIVE}`}
									>
										<ItemContent>
											<ItemTitle>{t('settings.tabs.system')}</ItemTitle>
										</ItemContent>
									</Item>
								)}
							</NavLink>
							<NavLink to="/settings/developer" end className={LINK_BASE}>
								{({ isActive }) => (
									<Item
										size="xs"
										role="listitem"
										className={`${ITEM_BASE} ${isActive ? ITEM_ACTIVE : ITEM_INACTIVE}`}
									>
										<ItemContent>
											<ItemTitle>{t('settings.tabs.developer')}</ItemTitle>
										</ItemContent>
									</Item>
								)}
							</NavLink>
						</ItemGroup>
					</div>
				</PageSidebar>
				<PageSidebarInset>
					<Outlet />
				</PageSidebarInset>
			</PageBody>
		</PageContainer>
	);
}
