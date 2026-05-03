import type { ReactElement } from 'react';
import { ChannelForm } from '../components';

export default function TelegramPage(): ReactElement {
	return (
		<div className="w-full max-w-2xl">
			<ChannelForm channelType="telegram" />
		</div>
	);
}
