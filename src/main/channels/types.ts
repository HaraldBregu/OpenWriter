import type { Channel } from '../../shared/types';

export type ChannelMessageType = 'TELEGRAM' | 'WHATSAPP';

export interface ChannelInboundMessage {
	type: ChannelMessageType;
	from: string;
	chatId: string;
	text: string;
}

export interface ChannelOutboundMessage {
	type: ChannelMessageType;
	to: string;
	text: string;
}

export type ChannelInboundHandler = (msg: ChannelInboundMessage) => void;

export interface ChannelAdapter {
	start(): Promise<void>;
	stop(): Promise<void>;
	send(msg: ChannelOutboundMessage): Promise<void>;
	onMessage(handler: ChannelInboundHandler): () => void;
}

export type ChannelAdapterFactory = (channel: Channel) => ChannelAdapter;
