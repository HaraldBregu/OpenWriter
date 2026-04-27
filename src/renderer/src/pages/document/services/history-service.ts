export const HISTORY_DIR_NAME = 'history';
export const MAX_HISTORY_ENTRIES = 30;

export interface HistoryEntry {
	id: string;
	title: string;
	savedAt: string; // ISO 8601
}

interface HistoryEntryFile extends HistoryEntry {
	content: string;
}

const historyEntryCache = new Map<string, HistoryEntryFile>();

function buildEntryId(): string {
	const now = new Date();
	const pad2 = (n: number): string => String(n).padStart(2, '0');
	const pad3 = (n: number): string => String(n).padStart(3, '0');
	const datePart = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}`;
	const timePart = `${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`;
	const msPart = pad3(now.getMilliseconds());
	const rand = Math.random().toString(36).slice(2, 8);
	return `${datePart}-${timePart}-${msPart}-${rand}`;
}

export function historyDir(docPath: string): string {
	return `${docPath}/${HISTORY_DIR_NAME}`;
}

function normalizeHistoryFilePath(filePath: string): string {
	return filePath.replaceAll('\\', '/');
}

function buildHistoryFilePath(docPath: string, fileName: string): string {
	return `${historyDir(docPath)}/${fileName}`;
}

function setCachedHistoryEntry(filePath: string, data: HistoryEntryFile): HistoryEntryFile {
	const normalized = normalizeHistoryFilePath(filePath);
	historyEntryCache.set(normalized, data);
	return data;
}

function deleteCachedHistoryEntry(filePath: string): void {
	historyEntryCache.delete(normalizeHistoryFilePath(filePath));
}

async function readHistoryEntryFile(filePath: string): Promise<HistoryEntryFile> {
	const normalized = normalizeHistoryFilePath(filePath);
	const cached = historyEntryCache.get(normalized);
	if (cached) {
		return cached;
	}

	const raw = await window.workspace.readFile({ filePath });
	const data = JSON.parse(raw) as HistoryEntryFile;
	return setCachedHistoryEntry(normalized, data);
}

export function isHistoryEntryFilePath(filePath: string): boolean {
	return filePath.replaceAll('\\', '/').includes(`/${HISTORY_DIR_NAME}/`);
}

async function listHistoryJsonFileNames(dir: string): Promise<string[]> {
	try {
		const files = await window.workspace.listDir({ dirPath: dir });
		return files
			.filter((f) => !f.isDirectory && f.name.endsWith('.json'))
			.map((f) => f.name)
			.sort((a, b) => a.localeCompare(b));
	} catch {
		return [];
	}
}

export async function saveHistorySnapshot(
	docPath: string,
	content: string,
	title: string
): Promise<HistoryEntry> {
	const dir = historyDir(docPath);
	await window.workspace.createFolder({ folderPath: dir, recursive: true });

	const id = buildEntryId();
	const savedAt = new Date().toISOString();
	const data: HistoryEntryFile = { id, title, savedAt, content };
	const filePath = buildHistoryFilePath(docPath, `${id}.json`);
	await window.workspace.writeFile({
		filePath,
		content: JSON.stringify(data),
	});
	setCachedHistoryEntry(filePath, data);

	const names = await listHistoryJsonFileNames(dir);
	const surplus = names.length - MAX_HISTORY_ENTRIES;
	if (surplus > 0) {
		const toDelete = names.slice(0, surplus);
		await Promise.all(
			toDelete.map((name) => {
				const surplusFilePath = buildHistoryFilePath(docPath, name);
				deleteCachedHistoryEntry(surplusFilePath);
				return window.workspace.deleteFile({ filePath: surplusFilePath }).catch(() => undefined);
			})
		);
	}

	return { id, title, savedAt };
}

export async function listHistoryEntries(docPath: string): Promise<HistoryEntry[]> {
	const dir = historyDir(docPath);
	const names = (await listHistoryJsonFileNames(dir)).slice(-MAX_HISTORY_ENTRIES);

	const entries: HistoryEntry[] = [];
	for (const name of names) {
		const filePath = buildHistoryFilePath(docPath, name);
		try {
			const data = await readHistoryEntryFile(filePath);
			entries.push({ id: data.id, title: data.title, savedAt: data.savedAt });
		} catch {
			deleteCachedHistoryEntry(filePath);
			// skip corrupted entries
		}
	}
	return entries;
}

export async function loadHistoryEntry(
	docPath: string,
	entryId: string
): Promise<{ content: string; title: string }> {
	const filePath = buildHistoryFilePath(docPath, `${entryId}.json`);
	const data = await readHistoryEntryFile(filePath);
	return { content: data.content, title: data.title };
}

export async function readLatestHistoryEntry(
	docPath: string
): Promise<{ id: string; content: string; title: string } | null> {
	const dir = historyDir(docPath);
	const names = await listHistoryJsonFileNames(dir);
	const latest = names[names.length - 1];
	if (!latest) return null;
	const filePath = buildHistoryFilePath(docPath, latest);
	try {
		const data = await readHistoryEntryFile(filePath);
		return { id: data.id, content: data.content, title: data.title };
	} catch {
		deleteCachedHistoryEntry(filePath);
		return null;
	}
}
