import fs from 'node:fs/promises'
import path from 'node:path'
import type { FileMetadata, FileManagementService } from './FileManagementService'
import type { DocumentsWatcherService } from './documents-watcher'
import { validateTextFiles, getAllTextExtensions } from '../utils/file-type-validator'

/**
 * DocumentsService manages document files within a workspace.
 *
 * Responsibilities:
 *   - Import files (copy from source or download from URL)
 *   - Load all documents from workspace directory
 *   - Delete document files
 *   - Ensure documents directory exists
 *   - Validate file types
 *
 * This service delegates actual file operations to FileManagementService
 * and coordinates with DocumentsWatcherService to prevent false change events.
 */
export class DocumentsService {
  private readonly DOCS_DIR_NAME = 'documents'

  constructor(
    private fileManagement: FileManagementService,
    private watcher: DocumentsWatcherService | null
  ) {}

  /**
   * Get the documents directory path for a workspace.
   *
   * @param workspacePath - Path to the workspace
   * @returns Path to the documents subdirectory
   */
  getDocumentsDir(workspacePath: string): string {
    return path.join(workspacePath, this.DOCS_DIR_NAME)
  }

  /**
   * Ensure the documents directory exists.
   *
   * @param workspacePath - Path to the workspace
   */
  async ensureDocumentsDirectory(workspacePath: string): Promise<void> {
    const docsDir = this.getDocumentsDir(workspacePath)
    await this.fileManagement.ensureDirectory(docsDir)
  }

  /**
   * Import files from local filesystem into the documents directory.
   *
   * @param workspacePath - Path to the workspace
   * @param filePaths - Array of file paths to import
   * @returns Array of file metadata for imported files
   */
  async importFiles(workspacePath: string, filePaths: string[]): Promise<FileMetadata[]> {
    await this.ensureDocumentsDirectory(workspacePath)

    // Validate file types
    const { validFiles, invalidFiles } = validateTextFiles(filePaths)

    if (invalidFiles.length > 0) {
      const fileList = invalidFiles
        .map(({ path: filePath, reason }) => `• ${path.basename(filePath)}: ${reason}`)
        .join('\n')

      throw new Error(
        `Some files are not supported:\n${fileList}\n\nSupported formats: ${getAllTextExtensions().join(', ')}`
      )
    }

    const docsDir = this.getDocumentsDir(workspacePath)
    const importedFiles: FileMetadata[] = []

    for (const filePath of validFiles) {
      try {
        const metadata = await this.fileManagement.copyFile(
          filePath,
          docsDir,
          this.watcher ? (destPath) => this.watcher!.markFileAsWritten(destPath) : undefined
        )
        importedFiles.push(metadata)
      } catch (err) {
        throw new Error(`Failed to import file ${path.basename(filePath)}: ${(err as Error).message}`)
      }
    }

    return importedFiles
  }

  /**
   * Download a file from a URL into the documents directory.
   *
   * @param workspacePath - Path to the workspace
   * @param url - HTTPS URL to download from (must be validated before calling)
   * @returns File metadata for the downloaded file
   */
  async downloadFromUrl(workspacePath: string, url: string): Promise<FileMetadata> {
    await this.ensureDocumentsDirectory(workspacePath)

    const docsDir = this.getDocumentsDir(workspacePath)
    return this.fileManagement.downloadFile(
      url,
      docsDir,
      this.watcher ? (destPath) => this.watcher!.markFileAsWritten(destPath) : undefined
    )
  }

  /**
   * Load all documents from the workspace directory.
   *
   * @param workspacePath - Path to the workspace
   * @returns Array of file metadata for all documents
   */
  async loadAll(workspacePath: string): Promise<FileMetadata[]> {
    const docsDir = this.getDocumentsDir(workspacePath)

    // Check if documents directory exists
    try {
      await fs.access(docsDir)
    } catch {
      // Documents directory doesn't exist yet, return empty array
      return []
    }

    // Read all files in the documents directory
    let files: string[]
    try {
      files = await fs.readdir(docsDir)
    } catch (err) {
      const error = err as NodeJS.ErrnoException
      if (error.code === 'EACCES') {
        throw new Error(`Permission denied reading documents directory: ${docsDir}`)
      }
      throw new Error(`Failed to read documents directory: ${error.message}`)
    }

    // Filter out hidden files and directories
    const validFiles = files.filter((file) => !file.startsWith('.'))
    const documents: FileMetadata[] = []

    for (const file of validFiles) {
      try {
        const filePath = path.join(docsDir, file)
        const stats = await fs.stat(filePath)

        // Skip directories
        if (stats.isDirectory()) {
          continue
        }

        const metadata = this.fileManagement.createFileMetadata(file, filePath, stats)
        documents.push(metadata)
      } catch (err) {
        // Log and skip files that can't be read
        console.warn(`[DocumentsService] Failed to load file ${file}:`, (err as Error).message)
      }
    }

    return documents
  }

  /**
   * Delete a document file.
   *
   * @param fileId - File ID (basename) to delete
   * @param workspacePath - Path to the workspace
   */
  async deleteFile(fileId: string, workspacePath: string): Promise<void> {
    const docsDir = this.getDocumentsDir(workspacePath)
    const filePath = path.join(docsDir, fileId)

    // Security: ensure the file is actually in the documents directory
    const realPath = await fs.realpath(filePath)
    const realDocsDir = await fs.realpath(docsDir)

    if (!realPath.startsWith(realDocsDir)) {
      throw new Error('Cannot delete files outside the documents directory')
    }

    try {
      // Mark file as app-written before deleting (prevents watcher events)
      this.watcher?.markFileAsWritten(filePath)
      await this.fileManagement.deleteFile(filePath)
    } catch (err) {
      throw new Error(`Failed to delete file ${fileId}: ${(err as Error).message}`)
    }
  }
}
