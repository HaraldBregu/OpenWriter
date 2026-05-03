import type { Channel, ChannelStatusEvent, ChannelType } from '../../../../../shared/types';
import type { DraftProperties } from './state';

export type ChannelsAction =
	| { type: 'SET_CHANNEL'; payload: Channel | null }
	| { type: 'SET_DRAFTS'; payload: Record<ChannelType, DraftProperties> }
	| { type: 'PATCH_DRAFT'; channelType: ChannelType; payload: Partial<DraftProperties> }
	| { type: 'SET_SAVING'; channelType: ChannelType; payload: boolean }
	| { type: 'SET_RESTARTING'; channelType: ChannelType; payload: boolean }
	| { type: 'SET_STATUSES'; payload: Partial<Record<ChannelType, ChannelStatusEvent>> }
	| { type: 'PATCH_STATUS'; payload: ChannelStatusEvent };
