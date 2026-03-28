import type {
	ChatSessionFile,
	ChatSessionListItem,
	DocumentChatMessage,
} from '../context/state';

/**
 * Extract the creation timestamp embedded in a UUID v7 string.
 * UUID v7 encodes a Unix ms timestamp in its first 48 bits (12 hex chars).
 * Returns null if the string is not a recognisable UUID v7.
 */
function createdAtFromUuidV7(id: string): string | null {
	try {
		const msBits = id.replace(/-/g, '').slice(0, 12);
		const ms = parseInt(msBits, 16);
		if (ms > 0) return new Date(ms).toISOString();
	} catch {
		// ignore
	}
	return null;
}

export function formatRelativeTime(iso: string): string {
	const ts = new Date(iso).getTime();
	if (!Number.isFinite(ts)) return '';
	const seconds = Math.floor((Date.now() - ts) / 1000);
	if (seconds < 60) return 'now';
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `${days}d`;
	return `${Math.floor(days / 7)}w`;
}

export function titleFromMessages(messages: DocumentChatMessage[], fallback: string): string {
	const firstUser = messages.find((m) => m.role === 'user' && m.content.trim().length > 0);
	if (!firstUser) return fallback;
	return firstUser.content.trim().replace(/\s+/g, ' ').slice(0, 64);
}

export interface SyncedChatSessions {
	sessionItems: ChatSessionListItem[];
	latestSession: { sessionId: string; messages: DocumentChatMessage[] } | null;
}

/**
 * Discover chat sessions by scanning the `chats/` directory for session
 * subfolders that contain a `messages.json` file. No `sessions.json` index
 * file is read or written.
 *
 * Each subfolder name is expected to be a UUID v7 session ID from which the
 * creation timestamp is derived.
 */
export async function syncChatSessionsFromDisk(
	docPath: string
): Promise<SyncedChatSessions | null> {
	const chatsDir = `${docPath}/chats`;

	const entries = await window.workspace.listDir({ dirPath: chatsDir });
	const sessionDirs = entries.filter((e) => e.isDirectory);

	if (sessionDirs.length === 0) return null;

	interface SessionRecord {
		sessionId: string;
		createdAt: string;
		file: ChatSessionFile | null;
	}

	const records: SessionRecord[] = [];

	for (const dir of sessionDirs) {
		const sessionId = dir.name;
		const createdAt = createdAtFromUuidV7(sessionId) ?? new Date().toISOString();

		try {
			const raw = await window.workspace.readFile({
				filePath: `${chatsDir}/${sessionId}/messages.json`,
			});
			records.push({
				sessionId,
				createdAt,
				file: JSON.parse(raw) as ChatSessionFile,
			});
		} catch {
			// Folder exists but messages.json is missing or unreadable -- skip.
		}
	}

	if (records.length === 0) return null;

	// Sort newest first.
	records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

	const sessionItems: ChatSessionListItem[] = records.map((record) => ({
		id: record.sessionId,
		title: titleFromMessages(record.file?.messages ?? [], 'Untitled'),
		ageLabel: formatRelativeTime(record.createdAt),
		createdAt: record.createdAt,
	}));

	const latestRecord = records[0];

	return {
		sessionItems,
		latestSession:
			latestRecord && latestRecord.file
				? {
						sessionId: latestRecord.sessionId,
						messages: latestRecord.file.messages ?? [],
					}
				: null,
	};
}
