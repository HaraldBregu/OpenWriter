import type { ChannelType } from '../../shared/types';

export type ChannelDispatch = (senderId: string, text: string) => Promise<string>;

export interface ChannelAdapter {
	readonly id: string;
	readonly type: ChannelType;
	start(): Promise<void>;
	stop(): Promise<void>;
}
