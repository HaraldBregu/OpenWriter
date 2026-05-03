import type { Channel } from '../../shared/types';

export type ChannelMessageType = 'TELEGRAM' | 'WHATSAPP';

export interface ChannelMessage {
	type: ChannelMessageType;
	from: string;
	chatId: string;
	text: string;
}

export type ChannelMessageHandler = (msg: ChannelMessage) => void;

export interface ChannelAdapter {
	start(): Promise<void>;
	stop(): Promise<void>;
	send(to: string, text: string): Promise<void>;
	onMessage(handler: ChannelMessageHandler): () => void;
}

export type ChannelAdapterFactory = (channel: Channel) => ChannelAdapter;
