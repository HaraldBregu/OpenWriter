/**
 * Maximum file size accepted by {@link FileSystemManager.readFile} (64 MB).
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
