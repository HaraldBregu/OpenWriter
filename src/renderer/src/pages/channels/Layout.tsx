import { useEffect, type ReactElement, type ReactNode } from 'react';
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

interface LayoutProps {
	readonly children: ReactNode;
}

export default function Layout({ children }: LayoutProps): ReactElement {
	return (
		<ChannelsProvider>
			<Bootstrap />
			{children}
		</ChannelsProvider>
	);
}
