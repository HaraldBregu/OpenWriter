import { dialog, BrowserWindow } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

export interface FileInfo {
  filePath: string
  fileName: string
  content: string
  size: number
  lastModified: number
}

export interface FsWatchEvent {
  eventType: string
  filename: string | null
  directory: string
  timestamp: number
}

export class FilesystemService {
  private watchers: Map<string, fs.FSWatcher> = new Map()
  private watchCallback: ((event: FsWatchEvent) => void) | null = null

  async openFileDialog(): Promise<FileInfo | null> {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(focusedWindow!, {
      properties: ['openFile'],
      filters: [
        { name: 'Text Files', extensions: ['txt', 'md', 'json', 'js', 'ts', 'tsx', 'jsx', 'html', 'css', 'xml', 'yaml', 'yml', 'csv', 'log', 'ini', 'cfg', 'env'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const filePath = result.filePaths[0]
    return this.readFile(filePath)
  }

  async readFile(filePath: string): Promise<FileInfo> {
    const content = await fs.promises.readFile(filePath, 'utf-8')
    const stats = await fs.promises.stat(filePath)
    return {
      filePath,
      fileName: path.basename(filePath),
      content,
      size: stats.size,
      lastModified: stats.mtimeMs
    }
  }

  async writeFile(filePath: string, content: string): Promise<{ success: boolean; filePath: string }> {
    await fs.promises.writeFile(filePath, content, 'utf-8')
    return { success: true, filePath }
  }

  async saveFileDialog(defaultName: string, content: string): Promise<{ success: boolean; filePath: string | null }> {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    const result = await dialog.showSaveDialog(focusedWindow!, {
      defaultPath: defaultName,
      filters: [
        { name: 'Text Files', extensions: ['txt', 'md', 'json', 'js', 'ts'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (result.canceled || !result.filePath) {
      return { success: false, filePath: null }
    }

    await this.writeFile(result.filePath, content)
    return { success: true, filePath: result.filePath }
  }

  async selectDirectory(): Promise<string | null> {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(focusedWindow!, {
      properties: ['openDirectory']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  }

  watchDirectory(dirPath: string): boolean {
    if (this.watchers.has(dirPath)) {
      return false
    }

    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
      return false
    }

    const watcher = fs.watch(dirPath, { recursive: false }, (eventType, filename) => {
      const event: FsWatchEvent = {
        eventType,
        filename,
        directory: dirPath,
        timestamp: Date.now()
      }
      this.watchCallback?.(event)
    })

    watcher.on('error', () => {
      this.unwatchDirectory(dirPath)
    })

    this.watchers.set(dirPath, watcher)
    return true
  }

  unwatchDirectory(dirPath: string): boolean {
    const watcher = this.watchers.get(dirPath)
    if (!watcher) return false
    watcher.close()
    this.watchers.delete(dirPath)
    return true
  }

  getWatchedDirectories(): string[] {
    return Array.from(this.watchers.keys())
  }

  onWatchEvent(callback: (event: FsWatchEvent) => void): void {
    this.watchCallback = callback
  }

  destroy(): void {
    for (const [, watcher] of this.watchers) {
      watcher.close()
    }
    this.watchers.clear()
  }
}
