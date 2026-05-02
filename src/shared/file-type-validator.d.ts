/**
 * File type validation utilities for filtering text-based files.
 *
 * Ensures only text format files are processed, excluding images and videos.
 */
/**
 * Supported text file extensions categorized by type.
 */
export declare const TEXT_FILE_EXTENSIONS: {
    readonly plainText: readonly [".txt", ".text"];
    readonly markdown: readonly [".md", ".markdown", ".mdown", ".mkd", ".mdx"];
    readonly javascript: readonly [".js", ".jsx", ".mjs", ".cjs"];
    readonly typescript: readonly [".ts", ".tsx"];
    readonly web: readonly [".html", ".htm", ".css", ".scss", ".sass", ".less"];
    readonly config: readonly [".json", ".yaml", ".yml", ".toml", ".ini", ".conf", ".env"];
    readonly xml: readonly [".xml", ".xhtml"];
    readonly python: readonly [".py", ".pyw", ".pyx", ".pyi"];
    readonly java: readonly [".java", ".class", ".jar"];
    readonly csharp: readonly [".cs", ".csx"];
    readonly cpp: readonly [".cpp", ".c", ".cc", ".cxx", ".h", ".hpp", ".hxx"];
    readonly go: readonly [".go"];
    readonly rust: readonly [".rs", ".toml"];
    readonly php: readonly [".php", ".phtml"];
    readonly ruby: readonly [".rb", ".rake", ".gemspec"];
    readonly shell: readonly [".sh", ".bash", ".zsh", ".fish"];
    readonly documents: readonly [".md", ".rtf", ".tex", ".log"];
    readonly data: readonly [".csv", ".tsv", ".sql"];
    readonly other: readonly [".gitignore", ".editorconfig", ".prettierrc", ".eslintrc"];
};
/**
 * Image file extensions (to be rejected).
 */
export declare const IMAGE_FILE_EXTENSIONS: readonly [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg", ".ico", ".tiff", ".tif", ".psd", ".raw", ".heic", ".heif", ".avif", ".jfif", ".svgz"];
/**
 * Video file extensions (to be rejected).
 */
export declare const VIDEO_FILE_EXTENSIONS: readonly [".mp4", ".avi", ".mov", ".wmv", ".flv", ".mkv", ".webm", ".m4v", ".mpg", ".mpeg", ".3gp", ".ogv", ".f4v", ".vob", ".m2ts", ".mts", ".ts"];
/**
 * Audio file extensions (to be rejected).
 */
export declare const AUDIO_FILE_EXTENSIONS: readonly [".mp3", ".wav", ".ogg", ".flac", ".aac", ".m4a", ".wma", ".opus", ".oga", ".mid", ".midi", ".ape", ".alac"];
/**
 * Binary/archive file extensions (to be rejected).
 */
export declare const BINARY_FILE_EXTENSIONS: readonly [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz", ".exe", ".dll", ".so", ".dylib", ".bin", ".iso"];
/**
 * Get all supported text file extensions as a flat array.
 */
export declare function getAllTextExtensions(): string[];
/**
 * Get all rejected file extensions (non-text files).
 */
export declare function getRejectedExtensions(): string[];
/**
 * Validation result for file type checking.
 */
export interface FileTypeValidationResult {
    isValid: boolean;
    fileType?: 'text' | 'image' | 'video' | 'audio' | 'binary';
    extension: string;
    reason?: string;
}
/**
 * Validates if a file is a text-based file by checking its extension.
 *
 * @param filePath - Path to the file to validate
 * @returns Validation result with details
 */
export declare function validateTextFile(filePath: string): FileTypeValidationResult;
/**
 * Validates multiple files and returns separate arrays of valid and invalid files.
 *
 * @param filePaths - Array of file paths to validate
 * @returns Object containing valid files and validation errors
 */
export declare function validateTextFiles(filePaths: string[]): {
    validFiles: string[];
    invalidFiles: Array<{
        path: string;
        reason: string;
        fileType?: string;
    }>;
};
/**
 * Extract file extension from a file path.
 * Handles edge cases like multiple dots and hidden files.
 *
 * @param filePath - File path to extract extension from
 * @returns File extension including the dot, or empty string if none
 */
export declare function getFileExtension(filePath: string): string;
/**
 * Get a human-readable description of supported file types.
 */
export declare function getSupportedFileTypesDescription(): string;
/**
 * Get a human-readable list of rejected file types.
 */
export declare function getRejectedFileTypesDescription(): string;
/**
 * Check if a file extension is a text file.
 * This is a quick check without detailed validation.
 *
 * @param extension - File extension to check (with or without dot)
 * @returns True if the extension is for a text file
 */
export declare function isTextFileExtension(extension: string): boolean;
/**
 * Get file type category for display purposes.
 *
 * @param filePath - File path to categorize
 * @returns Human-readable file type category
 */
export declare function getFileTypeCategory(filePath: string): string;
