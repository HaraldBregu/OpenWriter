import path from 'node:path'
import { app } from 'electron'

/**
 * PathValidator provides security validation for file system operations
 * to prevent path traversal attacks (e.g., ../../../etc/passwd).
 *
 * Only allows access to specific safe directories:
 * - Documents folder
 * - Downloads folder
 * - Desktop folder
 * - Application userData folder
 */
export class PathValidator {
  private static readonly ALLOWED_BASE_PATHS = [
    app.getPath('documents'),
    app.getPath('downloads'),
    app.getPath('desktop'),
    app.getPath('userData')
  ]

  /**
   * Checks if a file path is within allowed directories
   * @param filePath - The file path to validate
   * @returns true if the path is safe, false otherwise
   */
  static isPathSafe(filePath: string): boolean {
    const normalized = path.normalize(path.resolve(filePath))
    return this.ALLOWED_BASE_PATHS.some((basePath) =>
      normalized.startsWith(path.resolve(basePath))
    )
  }

  /**
   * Asserts that a file path is safe, throwing an error if not
   * @param filePath - The file path to validate
   * @throws Error if the path is outside allowed directories
   */
  static assertPathSafe(filePath: string): void {
    if (!this.isPathSafe(filePath)) {
      throw new Error(`Path "${filePath}" is outside allowed directories`)
    }
  }

  /**
   * Get the list of allowed base paths for informational purposes
   * @returns Array of allowed base directory paths
   */
  static getAllowedPaths(): string[] {
    return [...this.ALLOWED_BASE_PATHS]
  }
}
