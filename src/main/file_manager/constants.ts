/**
 * Maximum file size accepted by {@link FileManager.readFile} (64 MB).
 *
 * Loading very large files into a JS string can exhaust the V8 heap and freeze
 * the UI thread. Callers that need larger files should use a streaming service.
 */
export const MAX_READ_SIZE_BYTES = 64 * 1024 * 1024;

/**
 * Maximum allowed file-name / folder-name length in characters.
 * Uses the shortest real-world limit (VFAT: 255 UTF-16 code units).
 */
export const MAX_NAME_LENGTH = 255;

/** Windows reserved device names — blocked on all platforms for portability. */
export const WINDOWS_RESERVED_NAME = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$/i;

/** Maximum download size accepted by {@link FileManager.downloadFile} (500 MB). */
export const MAX_DOWNLOAD_SIZE_BYTES = 500 * 1024 * 1024;

/** Download request timeout in milliseconds (30 seconds). */
export const DOWNLOAD_TIMEOUT_MS = 30_000;

/** Extension-to-MIME-type mapping used by {@link FileManager.getMimeType}. */
export const MIME_TYPES: Readonly<Record<string, string>> = {
	// Documents
	'.pdf': 'application/pdf',
	'.doc': 'application/msword',
	'.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'.txt': 'text/plain',
	'.md': 'text/markdown',
	'.rtf': 'application/rtf',

	// Images
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.svg': 'image/svg+xml',
	'.webp': 'image/webp',
	'.bmp': 'image/bmp',
	'.ico': 'image/x-icon',

	// Videos
	'.mp4': 'video/mp4',
	'.mov': 'video/quicktime',
	'.avi': 'video/x-msvideo',
	'.mkv': 'video/x-matroska',
	'.webm': 'video/webm',

	// Audio
	'.mp3': 'audio/mpeg',
	'.wav': 'audio/wav',
	'.ogg': 'audio/ogg',
	'.flac': 'audio/flac',
	'.m4a': 'audio/mp4',

	// Archives
	'.zip': 'application/zip',
	'.rar': 'application/x-rar-compressed',
	'.tar': 'application/x-tar',
	'.gz': 'application/gzip',
	'.7z': 'application/x-7z-compressed',

	// Code
	'.js': 'text/javascript',
	'.ts': 'text/typescript',
	'.jsx': 'text/jsx',
	'.tsx': 'text/tsx',
	'.json': 'application/json',
	'.xml': 'application/xml',
	'.html': 'text/html',
	'.css': 'text/css',
	'.py': 'text/x-python',
	'.java': 'text/x-java',
	'.cpp': 'text/x-c++src',
	'.c': 'text/x-csrc',
	'.go': 'text/x-go',
	'.rs': 'text/x-rust',

	// Spreadsheets
	'.xls': 'application/vnd.ms-excel',
	'.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'.csv': 'text/csv',

	// Presentations
	'.ppt': 'application/vnd.ms-powerpoint',
	'.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};
