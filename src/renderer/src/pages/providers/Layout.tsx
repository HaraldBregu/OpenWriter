import { useEffect, type ReactElement } from 'react';
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
import { Button } from '@/components/ui/Button';
import { ProvidersProvider, useProvidersContext } from './Provider';

function Bootstrap(): null {
	const { setProviders, setDrafts, persisted } = useProvidersContext();

	useEffect(() => {
		let active = true;
		window.app
			.getProviders()
			.then((providers) => {
				if (active) setProviders(providers);
			})
			.catch(() => {
				if (active) setProviders([]);
			});
		return () => {
			active = false;
		};
	}, [setProviders]);

	useEffect(() => {
		setDrafts(persisted);
	}, [persisted, setDrafts]);

	return null;
}

interface NavItemProps {
	readonly to: string;
	readonly label: string;
}

function NavItem({ to, label }: NavItemProps): ReactElement {
	return (
		<NavLink to={to} end className="block outline-none">
			{({ isActive }) => (
				<Button
					nativeButton={false}
					variant={isActive ? 'secondary' : 'ghost'}
					size="md"
					className="w-full justify-start"
					render={<span />}
				>
					{label}
				</Button>
			)}
		</NavLink>
	);
}

export default function Layout(): ReactElement {
	const { t } = useTranslation();

	return (
		<ProvidersProvider>
			<Bootstrap />
			<PageContainer>
				<PageHeader>
					<PageHeaderTitle>{t('providers.title', 'Providers')}</PageHeaderTitle>
				</PageHeader>
				<PageBody className="flex-row overflow-hidden p-0">
					<PageSidebar className="w-64 border-r-0">
						<div className="flex flex-col gap-0.5">
							<NavItem to="/providers/openai" label={t('providers.openai', 'OpenAI')} />
							<NavItem
								to="/providers/anthropic"
								label={t('providers.anthropic', 'Anthropic')}
							/>
						</div>
					</PageSidebar>
					<PageSidebarInset>
						<Outlet />
					</PageSidebarInset>
				</PageBody>
			</PageContainer>
		</ProvidersProvider>
	);
}
