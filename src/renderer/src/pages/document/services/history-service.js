export const HISTORY_DIR_NAME = 'history';
export const MAX_HISTORY_ENTRIES = 30;
const historyEntryCache = new Map();
function buildEntryId() {
    const now = new Date();
    const pad2 = (n) => String(n).padStart(2, '0');
    const pad3 = (n) => String(n).padStart(3, '0');
    const datePart = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}`;
    const timePart = `${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`;
    const msPart = pad3(now.getMilliseconds());
    const rand = Math.random().toString(36).slice(2, 8);
    return `${datePart}-${timePart}-${msPart}-${rand}`;
}
export function historyDir(docPath) {
    return `${docPath}/${HISTORY_DIR_NAME}`;
}
function normalizeHistoryFilePath(filePath) {
    return filePath.replaceAll('\\', '/');
}
function buildHistoryFilePath(docPath, fileName) {
    return `${historyDir(docPath)}/${fileName}`;
}
function setCachedHistoryEntry(filePath, data) {
    const normalized = normalizeHistoryFilePath(filePath);
    historyEntryCache.set(normalized, data);
    return data;
}
function deleteCachedHistoryEntry(filePath) {
    historyEntryCache.delete(normalizeHistoryFilePath(filePath));
}
async function readHistoryEntryFile(filePath) {
    const normalized = normalizeHistoryFilePath(filePath);
    const cached = historyEntryCache.get(normalized);
    if (cached) {
        return cached;
    }
    const raw = await window.workspace.readFile({ filePath });
    const data = JSON.parse(raw);
    return setCachedHistoryEntry(normalized, data);
}
export function isHistoryEntryFilePath(filePath) {
    return filePath.replaceAll('\\', '/').includes(`/${HISTORY_DIR_NAME}/`);
}
async function listHistoryJsonFileNames(dir) {
    try {
        const files = await window.workspace.listDir({ dirPath: dir });
        return files
            .filter((f) => !f.isDirectory && f.name.endsWith('.json'))
            .map((f) => f.name)
            .sort((a, b) => a.localeCompare(b));
    }
    catch {
        return [];
    }
}
export async function saveHistorySnapshot(docPath, content, title) {
    const dir = historyDir(docPath);
    await window.workspace.createFolder({ folderPath: dir, recursive: true });
    const id = buildEntryId();
    const savedAt = new Date().toISOString();
    const data = { id, title, savedAt, content };
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
        await Promise.all(toDelete.map((name) => {
            const surplusFilePath = buildHistoryFilePath(docPath, name);
            deleteCachedHistoryEntry(surplusFilePath);
            return window.workspace.deleteFile({ filePath: surplusFilePath }).catch(() => undefined);
        }));
    }
    return { id, title, savedAt };
}
export async function deleteHistoryEntries(docPath, ids) {
    if (ids.length === 0)
        return;
    await Promise.all(ids.map((id) => {
        const filePath = buildHistoryFilePath(docPath, `${id}.json`);
        deleteCachedHistoryEntry(filePath);
        return window.workspace.deleteFile({ filePath }).catch(() => undefined);
    }));
}
export async function listHistoryEntries(docPath) {
    const dir = historyDir(docPath);
    const names = (await listHistoryJsonFileNames(dir)).slice(-MAX_HISTORY_ENTRIES);
    const entries = [];
    for (const name of names) {
        const filePath = buildHistoryFilePath(docPath, name);
        try {
            const data = await readHistoryEntryFile(filePath);
            entries.push({ id: data.id, title: data.title, savedAt: data.savedAt });
        }
        catch {
            deleteCachedHistoryEntry(filePath);
            // skip corrupted entries
        }
    }
    return entries;
}
export async function loadHistoryEntry(docPath, entryId) {
    const filePath = buildHistoryFilePath(docPath, `${entryId}.json`);
    const data = await readHistoryEntryFile(filePath);
    return { content: data.content, title: data.title };
}
export async function readLatestHistoryEntry(docPath) {
    const dir = historyDir(docPath);
    const names = await listHistoryJsonFileNames(dir);
    const latest = names[names.length - 1];
    if (!latest)
        return null;
    const filePath = buildHistoryFilePath(docPath, latest);
    try {
        const data = await readHistoryEntryFile(filePath);
        return { id: data.id, content: data.content, title: data.title };
    }
    catch {
        deleteCachedHistoryEntry(filePath);
        return null;
    }
}
