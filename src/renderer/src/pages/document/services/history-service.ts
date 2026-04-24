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
	await window.workspace.writeFile({
		filePath: `${dir}/${id}.json`,
		content: JSON.stringify(data),
	});

	const names = await listHistoryJsonFileNames(dir);
	const surplus = names.length - MAX_HISTORY_ENTRIES;
	if (surplus > 0) {
		const toDelete = names.slice(0, surplus);
		await Promise.all(
			toDelete.map((name) =>
				window.workspace.deleteFile({ filePath: `${dir}/${name}` }).catch(() => undefined)
			)
		);
	}

	return { id, title, savedAt };
}

export async function listHistoryEntries(docPath: string): Promise<HistoryEntry[]> {
	const dir = historyDir(docPath);
	const names = (await listHistoryJsonFileNames(dir)).slice(-MAX_HISTORY_ENTRIES);

	const entries: HistoryEntry[] = [];
	for (const name of names) {
		try {
			const raw = await window.workspace.readFile({ filePath: `${dir}/${name}` });
			const data = JSON.parse(raw) as HistoryEntryFile;
			entries.push({ id: data.id, title: data.title, savedAt: data.savedAt });
		} catch {
			// skip corrupted entries
		}
	}
	return entries;
}

export async function loadHistoryEntry(
	docPath: string,
	entryId: string
): Promise<{ content: string; title: string }> {
	const filePath = `${historyDir(docPath)}/${entryId}.json`;
	const raw = await window.workspace.readFile({ filePath });
	const data = JSON.parse(raw) as HistoryEntryFile;
	return { content: data.content, title: data.title };
}

export async function readLatestHistoryEntry(
	docPath: string
): Promise<{ id: string; content: string; title: string } | null> {
	const dir = historyDir(docPath);
	const names = await listHistoryJsonFileNames(dir);
	const latest = names[names.length - 1];
	if (!latest) return null;
	try {
		const raw = await window.workspace.readFile({ filePath: `${dir}/${latest}` });
		const data = JSON.parse(raw) as HistoryEntryFile;
		return { id: data.id, content: data.content, title: data.title };
	} catch {
		return null;
	}
}
