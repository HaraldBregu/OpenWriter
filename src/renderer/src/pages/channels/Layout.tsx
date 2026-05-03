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
import { ChannelsProvider, useChannelsContext } from './Provider';

function Bootstrap(): null {
	const { setChannel, setStatuses, patchStatus, setDrafts, persisted } = useChannelsContext();

	useEffect(() => {
		let active = true;

		window.app
			.getChannel()
			.then((channel) => {
				if (active) setChannel(channel);
			})
			.catch(() => {
				if (active) setChannel(null);
			});

		window.app
			.getChannelStatus()
			.then((statuses) => {
				if (active) setStatuses(statuses);
			})
			.catch(() => {
				if (active) setStatuses({});
			});

		const unsubscribe = window.app.onChannelStatus((event) => {
			patchStatus(event);
		});

		return () => {
			active = false;
			unsubscribe();
		};
	}, [setChannel, setStatuses, patchStatus]);

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
		<ChannelsProvider>
			<Bootstrap />
			<PageContainer>
				<PageHeader>
					<PageHeaderTitle>{t('channels.title', 'Channels')}</PageHeaderTitle>
				</PageHeader>
				<PageBody className="flex-row overflow-hidden p-0">
					<PageSidebar className="w-64 border-r-0">
						<div className="flex flex-col gap-0.5">
							<NavItem to="/channels/telegram" label={t('channels.telegram', 'Telegram')} />
							<NavItem to="/channels/whatsapp" label={t('channels.whatsapp', 'WhatsApp')} />
							<NavItem to="/channels/discord" label={t('channels.discord', 'Discord')} />
						</div>
					</PageSidebar>
					<PageSidebarInset>
						<Outlet />
					</PageSidebarInset>
				</PageBody>
			</PageContainer>
		</ChannelsProvider>
	);
}
