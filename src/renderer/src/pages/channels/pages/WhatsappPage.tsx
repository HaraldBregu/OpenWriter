import type { ReactElement } from 'react';
import { ChannelForm } from '../components';

export default function WhatsappPage(): ReactElement {
	return (
		<div className="w-full max-w-2xl">
			<ChannelForm channelType="whatsapp" />
		</div>
	);
}
