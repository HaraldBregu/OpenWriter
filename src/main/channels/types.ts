import type { Channel } from '../../shared/types';

export interface ChannelAdapter {
	start(): Promise<void>;
	stop(): Promise<void>;
	send(to: string, text: string): Promise<void>;
}

export type ChannelAdapterFactory = (channel: Channel) => ChannelAdapter;
