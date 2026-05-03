import { isKnownChannelType } from '../../shared/types';
import type { Channel } from '../../shared/types';
import { isRecord } from './utils';

export function normalizeChannelInput(value: unknown): Channel | null {
	if (!isRecord(value)) return null;
	const id = typeof value.id === 'string' ? value.id.trim() : '';
	if (!id) return null;
	if (!isKnownChannelType(value.type)) return null;
	const token = typeof value.token === 'string' ? value.token : '';
	const enabled = value.enabled === true;
	const allowFrom = Array.isArray(value.allowFrom)
		? value.allowFrom.filter((s): s is string => typeof s === 'string').map((s) => s.trim())
		: [];
	return { id, type: value.type, enabled, token, allowFrom };
}

export function normalizeChannels(value: unknown): Channel[] {
	if (!Array.isArray(value)) return [];
	const seen = new Set<string>();
	const out: Channel[] = [];
	for (const entry of value) {
		const channel = normalizeChannelInput(entry);
		if (!channel || seen.has(channel.id)) continue;
		seen.add(channel.id);
		out.push(channel);
	}
	return out;
}

export function cloneChannel(channel: Channel): Channel {
	return {
		id: channel.id,
		type: channel.type,
		enabled: channel.enabled,
		token: channel.token,
		allowFrom: [...channel.allowFrom],
	};
}
