import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type {
	Channel,
	ChannelStatusEvent,
	ChannelType,
	DiscordChannelProperties,
	TelegramChannelProperties,
	WhatsappChannelProperties,
} from '../../../../shared/types';
import { channelsReducer } from './context/reducer';
import { EMPTY_DRAFT, initialState, type DraftProperties } from './context/state';

export interface ChannelsContextValue {
	channel: Channel | null;
	statuses: Partial<Record<ChannelType, ChannelStatusEvent>>;
	drafts: Record<ChannelType, DraftProperties>;
	persisted: Record<ChannelType, DraftProperties>;
	saving: ReadonlySet<ChannelType>;
	restarting: ReadonlySet<ChannelType>;
	setChannel: (channel: Channel | null) => void;
	setStatuses: (statuses: Partial<Record<ChannelType, ChannelStatusEvent>>) => void;
	patchStatus: (event: ChannelStatusEvent) => void;
	setDrafts: (drafts: Record<ChannelType, DraftProperties>) => void;
	patchDraft: (channelType: ChannelType, patch: Partial<DraftProperties>) => void;
	handleSave: (channelType: ChannelType) => Promise<void>;
	handleRestart: (channelType: ChannelType) => Promise<void>;
}

const ChannelsContext = createContext<ChannelsContextValue | null>(null);

export function useChannelsContext(): ChannelsContextValue {
	const context = useContext(ChannelsContext);
	if (!context) {
		throw new Error('useChannelsContext must be used within a ChannelsProvider');
	}
	return context;
}

function telegramOrDiscordToDraft(
	props: TelegramChannelProperties | DiscordChannelProperties
): DraftProperties {
	return { token: props.token, allowFrom: props.allowFrom.join(', '), phoneNumber: '' };
}

function whatsappToDraft(props: WhatsappChannelProperties): DraftProperties {
	return { token: '', allowFrom: '', phoneNumber: props.phoneNumber };
}

function parseAllowFrom(raw: string): string[] {
	return raw
		.split(',')
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
}

function sanitizePhoneNumber(raw: string): string {
	return raw.replace(/[^\d]/g, '');
}

interface ChannelsProviderProps {
	readonly children: ReactNode;
}

export function ChannelsProvider({ children }: ChannelsProviderProps): ReactElement {
	const [state, dispatch] = useReducer(channelsReducer, initialState);

	const persisted = useMemo<Record<ChannelType, DraftProperties>>(
		() => ({
			telegram: state.channel ? toDraft(state.channel.telegram) : EMPTY_DRAFT,
			whatsapp: state.channel ? toDraft(state.channel.whatsapp) : EMPTY_DRAFT,
			discord: state.channel ? toDraft(state.channel.discord) : EMPTY_DRAFT,
		}),
		[state.channel]
	);

	const setChannel = useCallback((channel: Channel | null) => {
		dispatch({ type: 'SET_CHANNEL', payload: channel });
	}, []);

	const setStatuses = useCallback(
		(statuses: Partial<Record<ChannelType, ChannelStatusEvent>>) => {
			dispatch({ type: 'SET_STATUSES', payload: statuses });
		},
		[]
	);

	const patchStatus = useCallback((event: ChannelStatusEvent) => {
		dispatch({ type: 'PATCH_STATUS', payload: event });
	}, []);

	const setDrafts = useCallback((drafts: Record<ChannelType, DraftProperties>) => {
		dispatch({ type: 'SET_DRAFTS', payload: drafts });
	}, []);

	const patchDraft = useCallback(
		(channelType: ChannelType, patch: Partial<DraftProperties>) => {
			dispatch({ type: 'PATCH_DRAFT', channelType, payload: patch });
		},
		[]
	);

	const handleSave = useCallback(
		async (channelType: ChannelType) => {
			const draft = state.drafts[channelType];
			const persistedForType = persisted[channelType];
			if (
				draft.token === persistedForType.token &&
				draft.allowFrom === persistedForType.allowFrom
			) {
				return;
			}

			dispatch({ type: 'SET_SAVING', channelType, payload: true });
			try {
				const properties = {
					token: draft.token.trim(),
					allowFrom: parseAllowFrom(draft.allowFrom),
				};
				const next =
					channelType === 'telegram'
						? await window.app.setChannelProperties('telegram', properties)
						: channelType === 'whatsapp'
							? await window.app.setChannelProperties('whatsapp', properties)
							: await window.app.setChannelProperties('discord', properties);
				dispatch({ type: 'SET_CHANNEL', payload: next });
				await window.app.restartChannel(channelType);
			} finally {
				dispatch({ type: 'SET_SAVING', channelType, payload: false });
			}
		},
		[state.drafts, persisted]
	);

	const handleRestart = useCallback(async (channelType: ChannelType) => {
		dispatch({ type: 'SET_RESTARTING', channelType, payload: true });
		try {
			await window.app.restartChannel(channelType);
		} finally {
			dispatch({ type: 'SET_RESTARTING', channelType, payload: false });
		}
	}, []);

	const value: ChannelsContextValue = {
		channel: state.channel,
		statuses: state.statuses,
		drafts: state.drafts,
		persisted,
		saving: state.saving,
		restarting: state.restarting,
		setChannel,
		setStatuses,
		patchStatus,
		setDrafts,
		patchDraft,
		handleSave,
		handleRestart,
	};

	return <ChannelsContext.Provider value={value}>{children}</ChannelsContext.Provider>;
}
