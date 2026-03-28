import type {
	ChatSessionEntry,
	ChatSessionFile,
	ChatSessionIndex,
	ChatSessionListItem,
	DocumentChatMessage,
} from '../context/state';

function sortEntriesByCreatedAt(entries: ChatSessionEntry[]): ChatSessionEntry[] {
	return [...entries].sort(
		(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
	);
}

function isMissingSessionFileError(error: unknown): boolean {
	return error instanceof Error && error.message.startsWith('File not found:');
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

interface SyncedSessionRecord {
	entry: ChatSessionEntry;
	file: ChatSessionFile | null;
}

export interface SyncedChatSessions {
	index: ChatSessionIndex;
	sessionItems: ChatSessionListItem[];
	latestSession: { sessionId: string; messages: DocumentChatMessage[] } | null;
}

export async function syncChatSessionsWithDisk(
	docPath: string,
	indexInput?: ChatSessionIndex
): Promise<SyncedChatSessions | null> {
	const indexPath = `${docPath}/sessions.json`;
	const chatsDir = `${docPath}/chats`;

	let index = indexInput ?? null;
	if (!index) {
		try {
			const raw = await window.workspace.readFile({ filePath: indexPath });
			index = JSON.parse(raw) as ChatSessionIndex;
		} catch {
			return null;
		}
	}

	const validRecords: SyncedSessionRecord[] = [];

	for (const entry of index.sessions) {
		try {
			const raw = await window.workspace.readFile({
				filePath: `${chatsDir}/${entry.sessionId}/messages.json`,
			});
			validRecords.push({
				entry,
				file: JSON.parse(raw) as ChatSessionFile,
			});
		} catch (error) {
			if (!isMissingSessionFileError(error)) {
				validRecords.push({ entry, file: null });
			}
		}
	}

	const syncedIndex: ChatSessionIndex = {
		version: index.version ?? 1,
		sessions: validRecords.map((record) => record.entry),
	};

	if (syncedIndex.sessions.length !== index.sessions.length) {
		try {
			await window.workspace.writeFile({
				filePath: indexPath,
				content: JSON.stringify(syncedIndex, null, 2),
				createParents: true,
			});
		} catch {
			// Best effort: keep the in-memory list synced even if index rewrite fails.
		}
	}

	const sortedRecords = sortEntriesByCreatedAt(syncedIndex.sessions).map((entry) => {
		const record = validRecords.find((item) => item.entry.sessionId === entry.sessionId);
		return record ?? { entry, file: null };
	});

	const sessionItems = sortedRecords.map((record) => ({
		id: record.entry.sessionId,
		title: titleFromMessages(record.file?.messages ?? [], 'Untitled'),
		ageLabel: formatRelativeTime(record.entry.createdAt),
		createdAt: record.entry.createdAt,
	}));

	const latestRecord = sortedRecords.find((record) => record.file !== null);

	return {
		index: syncedIndex,
		sessionItems,
		latestSession:
			latestRecord && latestRecord.file
				? {
						sessionId: latestRecord.entry.sessionId,
						messages: latestRecord.file.messages ?? [],
					}
				: null,
	};
}
