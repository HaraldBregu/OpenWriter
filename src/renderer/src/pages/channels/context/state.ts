import type { Channel, ChannelStatusEvent, ChannelType } from '../../../../../shared/types';

export interface DraftProperties {
	readonly token: string;
	readonly allowFrom: string;
}

export const EMPTY_DRAFT: DraftProperties = { token: '', allowFrom: '' };

export interface ChannelsState {
	channel: Channel | null;
	drafts: Record<ChannelType, DraftProperties>;
	saving: ReadonlySet<ChannelType>;
	restarting: ReadonlySet<ChannelType>;
	statuses: Partial<Record<ChannelType, ChannelStatusEvent>>;
}

export const initialState: ChannelsState = {
	channel: null,
	drafts: {
		telegram: EMPTY_DRAFT,
		whatsapp: EMPTY_DRAFT,
		discord: EMPTY_DRAFT,
	},
	saving: new Set(),
	restarting: new Set(),
	statuses: {},
};
