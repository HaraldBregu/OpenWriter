import type { ChannelsState } from './state';
import type { ChannelsAction } from './actions';

function withSet<T>(set: ReadonlySet<T>, value: T, on: boolean): ReadonlySet<T> {
	const next = new Set(set);
	if (on) next.add(value);
	else next.delete(value);
	return next;
}

export function channelsReducer(state: ChannelsState, action: ChannelsAction): ChannelsState {
	switch (action.type) {
		case 'SET_CHANNEL':
			return { ...state, channel: action.payload };
		case 'SET_DRAFTS':
			return { ...state, drafts: action.payload };
		case 'PATCH_DRAFT':
			return {
				...state,
				drafts: {
					...state.drafts,
					[action.channelType]: { ...state.drafts[action.channelType], ...action.payload },
				},
			};
		case 'SET_SAVING':
			return { ...state, saving: withSet(state.saving, action.channelType, action.payload) };
		case 'SET_RESTARTING':
			return {
				...state,
				restarting: withSet(state.restarting, action.channelType, action.payload),
			};
		case 'SET_STATUSES':
			return { ...state, statuses: action.payload };
		case 'PATCH_STATUS':
			return {
				...state,
				statuses: { ...state.statuses, [action.payload.type]: action.payload },
			};
	}
}
