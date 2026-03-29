export const HISTORY_DIR_NAME = 'history';
export const MAX_HISTORY_ENTRIES = 50;

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

	return { id, title, savedAt };
}

export async function listHistoryEntries(docPath: string): Promise<HistoryEntry[]> {
	const dir = historyDir(docPath);
	let files: { name: string; isDirectory: boolean }[];
	try {
		files = await window.workspace.listDir({ dirPath: dir });
	} catch {
		return [];
	}

	const jsonFiles = files
		.filter((f) => !f.isDirectory && f.name.endsWith('.json'))
		.sort((a, b) => a.name.localeCompare(b.name))
		.slice(-MAX_HISTORY_ENTRIES);

	const entries: HistoryEntry[] = [];
	for (const file of jsonFiles) {
		try {
			const raw = await window.workspace.readFile({ filePath: `${dir}/${file.name}` });
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
