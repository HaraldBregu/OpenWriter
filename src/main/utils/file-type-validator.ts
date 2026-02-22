/**
 * File type validation utilities for filtering text-based files.
 *
 * Ensures only text format files are processed, excluding images and videos.
 */

/**
 * Supported text file extensions categorized by type.
 */
export const TEXT_FILE_EXTENSIONS = {
  // Plain text and markdown
  plainText: ['.txt', '.text'],
  markdown: ['.md', '.markdown', '.mdown', '.mkd', '.mdx'],

  // Code files
  javascript: ['.js', '.jsx', '.mjs', '.cjs'],
  typescript: ['.ts', '.tsx'],
  web: ['.html', '.htm', '.css', '.scss', '.sass', '.less'],
  config: ['.json', '.yaml', '.yml', '.toml', '.ini', '.conf', '.env'],
  xml: ['.xml', '.xhtml'],

  // Programming languages
  python: ['.py', '.pyw', '.pyx', '.pyi'],
  java: ['.java', '.class', '.jar'],
  csharp: ['.cs', '.csx'],
  cpp: ['.cpp', '.c', '.cc', '.cxx', '.h', '.hpp', '.hxx'],
  go: ['.go'],
  rust: ['.rs', '.toml'],
  php: ['.php', '.phtml'],
  ruby: ['.rb', '.rake', '.gemspec'],
  shell: ['.sh', '.bash', '.zsh', '.fish'],

  // Documents
  documents: ['.md', '.rtf', '.tex', '.log'],

  // Data formats
  data: ['.csv', '.tsv', '.sql'],

  // Other text formats
  other: ['.gitignore', '.editorconfig', '.prettierrc', '.eslintrc']
} as const

/**
 * Image file extensions (to be rejected).
 */
export const IMAGE_FILE_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg',
  '.ico', '.tiff', '.tif', '.psd', '.raw', '.heic', '.heif',
  '.avif', '.jfif', '.svgz'
] as const

/**
 * Video file extensions (to be rejected).
 */
export const VIDEO_FILE_EXTENSIONS = [
  '.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm',
  '.m4v', '.mpg', '.mpeg', '.3gp', '.ogv', '.f4v', '.vob',
  '.m2ts', '.mts', '.ts'
] as const

/**
 * Audio file extensions (to be rejected).
 */
export const AUDIO_FILE_EXTENSIONS = [
  '.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.wma',
  '.opus', '.oga', '.mid', '.midi', '.ape', '.alac'
] as const

/**
 * Binary/archive file extensions (to be rejected).
 */
export const BINARY_FILE_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz',
  '.exe', '.dll', '.so', '.dylib', '.bin', '.iso'
] as const

/**
 * Get all supported text file extensions as a flat array.
 */
export function getAllTextExtensions(): string[] {
  return Object.values(TEXT_FILE_EXTENSIONS).flat()
}

/**
 * Get all rejected file extensions (non-text files).
 */
export function getRejectedExtensions(): string[] {
  return [
    ...IMAGE_FILE_EXTENSIONS,
    ...VIDEO_FILE_EXTENSIONS,
    ...AUDIO_FILE_EXTENSIONS,
    ...BINARY_FILE_EXTENSIONS
  ]
}

/**
 * Validation result for file type checking.
 */
export interface FileTypeValidationResult {
  isValid: boolean
  fileType?: 'text' | 'image' | 'video' | 'audio' | 'binary'
  extension: string
  reason?: string
}

/**
 * Validates if a file is a text-based file by checking its extension.
 *
 * @param filePath - Path to the file to validate
 * @returns Validation result with details
 */
export function validateTextFile(filePath: string): FileTypeValidationResult {
  // Extract extension (handle files with multiple dots)
  const ext = getFileExtension(filePath)

  if (!ext) {
    return {
      isValid: false,
      extension: '',
      reason: 'File has no extension'
    }
  }

  const lowerExt = ext.toLowerCase()

  // IMPORTANT: Check text files FIRST to handle conflicts
  // (e.g., .ts is both TypeScript and MPEG Transport Stream video format)
  const allTextExtensions = getAllTextExtensions()
  if (allTextExtensions.includes(lowerExt)) {
    return {
      isValid: true,
      fileType: 'text',
      extension: lowerExt
    }
  }

  // Check if it's an image
  if (IMAGE_FILE_EXTENSIONS.includes(lowerExt as typeof IMAGE_FILE_EXTENSIONS[number])) {
    return {
      isValid: false,
      fileType: 'image',
      extension: lowerExt,
      reason: `Image files (${lowerExt}) are not supported. Only text-based files are allowed.`
    }
  }

  // Check if it's a video
  if (VIDEO_FILE_EXTENSIONS.includes(lowerExt as typeof VIDEO_FILE_EXTENSIONS[number])) {
    return {
      isValid: false,
      fileType: 'video',
      extension: lowerExt,
      reason: `Video files (${lowerExt}) are not supported. Only text-based files are allowed.`
    }
  }

  // Check if it's audio
  if (AUDIO_FILE_EXTENSIONS.includes(lowerExt as typeof AUDIO_FILE_EXTENSIONS[number])) {
    return {
      isValid: false,
      fileType: 'audio',
      extension: lowerExt,
      reason: `Audio files (${lowerExt}) are not supported. Only text-based files are allowed.`
    }
  }

  // Check if it's a binary file
  if (BINARY_FILE_EXTENSIONS.includes(lowerExt as typeof BINARY_FILE_EXTENSIONS[number])) {
    return {
      isValid: false,
      fileType: 'binary',
      extension: lowerExt,
      reason: `Binary files (${lowerExt}) are not supported. Only text-based files are allowed.`
    }
  }

  // Unknown extension - reject by default for safety
  return {
    isValid: false,
    extension: lowerExt,
    reason: `Unknown file type (${lowerExt}). Only recognized text-based files are supported.`
  }
}

/**
 * Validates multiple files and returns separate arrays of valid and invalid files.
 *
 * @param filePaths - Array of file paths to validate
 * @returns Object containing valid files and validation errors
 */
export function validateTextFiles(filePaths: string[]): {
  validFiles: string[]
  invalidFiles: Array<{ path: string; reason: string; fileType?: string }>
} {
  const validFiles: string[] = []
  const invalidFiles: Array<{ path: string; reason: string; fileType?: string }> = []

  for (const filePath of filePaths) {
    const result = validateTextFile(filePath)

    if (result.isValid) {
      validFiles.push(filePath)
    } else {
      invalidFiles.push({
        path: filePath,
        reason: result.reason || 'Invalid file type',
        fileType: result.fileType
      })
    }
  }

  return { validFiles, invalidFiles }
}

/**
 * Extract file extension from a file path.
 * Handles edge cases like multiple dots and hidden files.
 *
 * @param filePath - File path to extract extension from
 * @returns File extension including the dot, or empty string if none
 */
export function getFileExtension(filePath: string): string {
  // Get the filename without path
  const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || filePath

  // Handle hidden files (e.g., .gitignore)
  if (fileName.startsWith('.') && fileName.lastIndexOf('.') === 0) {
    return fileName // Return the whole name as extension
  }

  // Find last dot
  const lastDotIndex = fileName.lastIndexOf('.')

  if (lastDotIndex === -1 || lastDotIndex === 0) {
    return '' // No extension or hidden file
  }

  return fileName.substring(lastDotIndex)
}

/**
 * Get a human-readable description of supported file types.
 */
export function getSupportedFileTypesDescription(): string {
  return 'Text files (.txt, .md), code files (.js, .ts, .py, .html, .css, .json, etc.)'
}

/**
 * Get a human-readable list of rejected file types.
 */
export function getRejectedFileTypesDescription(): string {
  return 'Images, videos, audio files, and binary documents (PDF, Word, etc.) are not supported'
}

/**
 * Check if a file extension is a text file.
 * This is a quick check without detailed validation.
 *
 * @param extension - File extension to check (with or without dot)
 * @returns True if the extension is for a text file
 */
export function isTextFileExtension(extension: string): boolean {
  const ext = extension.startsWith('.') ? extension : `.${extension}`
  return getAllTextExtensions().includes(ext.toLowerCase())
}

/**
 * Get file type category for display purposes.
 *
 * @param filePath - File path to categorize
 * @returns Human-readable file type category
 */
export function getFileTypeCategory(filePath: string): string {
  const result = validateTextFile(filePath)

  if (!result.isValid) {
    return result.fileType || 'unknown'
  }

  const ext = result.extension

  // Find which category this extension belongs to
  for (const [category, extensions] of Object.entries(TEXT_FILE_EXTENSIONS)) {
    if (extensions.includes(ext as never)) {
      return category
    }
  }

  return 'text'
}
