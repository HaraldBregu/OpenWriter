import type { Channel, ChannelConnectionStatus } from '../../shared/types';

export type ChannelMessageType = keyof Channel;

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

export interface ChannelStatusUpdate {
	status: ChannelConnectionStatus;
	pairingCode?: string;
	error?: string;
}

export type ChannelInboundHandler = (msg: ChannelInboundMessage) => void;
export type ChannelStatusHandler = (update: ChannelStatusUpdate) => void;

export interface ChannelAdapter {
	start(): Promise<void>;
	stop(): Promise<void>;
	send(msg: ChannelOutboundMessage): Promise<void>;
	onMessage(handler: ChannelInboundHandler): () => void;
	onStatus(handler: ChannelStatusHandler): () => void;
}

export type ChannelAdapterFactory = (channel: Channel) => ChannelAdapter;
