// ---------------------------------------------------------------------------
// Shared Types
// ---------------------------------------------------------------------------
// Single source of truth for all data shapes used across IPC, models, and providers.
// Used by main, preload, and renderer.
//
// DO NOT import Electron, Node.js, React, or any browser APIs here.
// This file must be valid in all three process contexts.
// ---------------------------------------------------------------------------
/** Canonical list of known providers. Source of truth for ProviderId and ProviderName. */
export const PROVIDERS = [
    { id: 'openai', name: 'OpenAI', apiKey: '' },
    { id: 'anthropic', name: 'Anthropic', apiKey: '' },
];
// ---- Files (workspace/files/) ---------------------------------------------
/** Allowed file extensions for the workspace files/ folder. */
export const FILES_EXTENSIONS = ['.json', '.md', '.txt', '.pdf'];
export const FILE_TYPE_FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'image', label: 'Images' },
    { value: 'video', label: 'Video' },
    { value: 'audio', label: 'Audio' },
    { value: 'json', label: 'JSON' },
    { value: 'markdown', label: 'Markdown' },
    { value: 'text', label: 'Text' },
    { value: 'pdf', label: 'PDF' },
];
// ---- Images (workspace/images/) -------------------------------------------
/** Allowed image extensions for the workspace images/ folder. */
export const IMAGES_EXTENSIONS = [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.webp',
    '.svg',
    '.avif',
    '.bmp',
];
// ---- Task Metadata
export const TASK_STATUS_TEXT_KEY = 'statusText';
export function getTaskStatusText(metadata) {
    const value = metadata?.[TASK_STATUS_TEXT_KEY];
    if (typeof value !== 'string')
        return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}
export function withTaskStatusText(metadata, statusText) {
    const next = { ...(metadata ?? {}) };
    const trimmed = statusText?.trim();
    if (trimmed) {
        next[TASK_STATUS_TEXT_KEY] = trimmed;
    }
    else {
        delete next[TASK_STATUS_TEXT_KEY];
    }
    return Object.keys(next).length > 0 ? next : undefined;
}
