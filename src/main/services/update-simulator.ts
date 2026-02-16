import { app } from 'electron'

export interface UpdateInfo {
  version: string
  releaseDate: string
  releaseNotes: string
  downloadSize: number
}

export interface UpdateProgress {
  percent: number
  transferred: number
  total: number
  bytesPerSecond: number
}

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'installing'
  | 'error'

export interface UpdateState {
  status: UpdateStatus
  updateInfo: UpdateInfo | null
  progress: UpdateProgress | null
  error: string | null
}

type StateCallback = (state: UpdateState) => void
type ProgressCallback = (progress: UpdateProgress) => void

export class UpdateSimulator {
  private state: UpdateState = {
    status: 'idle',
    updateInfo: null,
    progress: null,
    error: null
  }

  private stateCallbacks: StateCallback[] = []
  private progressCallbacks: ProgressCallback[] = []
  private downloadInterval: ReturnType<typeof setInterval> | null = null
  private restartTimeout: ReturnType<typeof setTimeout> | null = null

  /**
   * Simulate checking for updates
   */
  async checkForUpdates(): Promise<void> {
    this.setState({ status: 'checking', error: null, progress: null })

    // Simulate network delay
    await this.delay(2000)

    // 70% chance of update available
    const hasUpdate = Math.random() > 0.3

    if (hasUpdate) {
      const currentVersion = app.getVersion()
      const [major, minor, patch] = currentVersion.split('.').map(Number)
      const newPatch = patch + 1
      const newVersion = `${major}.${minor}.${newPatch}`

      const updateInfo: UpdateInfo = {
        version: newVersion,
        releaseDate: new Date().toISOString(),
        releaseNotes: this.generateReleaseNotes(newVersion),
        downloadSize: Math.floor(Math.random() * 50 + 10) * 1024 * 1024 // 10-60 MB
      }

      this.setState({
        status: 'available',
        updateInfo,
        error: null
      })
    } else {
      this.setState({
        status: 'not-available',
        error: null
      })
    }
  }

  /**
   * Simulate downloading an update
   */
  async downloadUpdate(): Promise<void> {
    if (!this.state.updateInfo) {
      this.setState({ status: 'error', error: 'No update available to download' })
      return
    }

    this.setState({ status: 'downloading', error: null })

    const totalSize = this.state.updateInfo.downloadSize
    let transferred = 0

    // Simulate download with progress updates
    return new Promise((resolve) => {
      const startTime = Date.now()

      this.downloadInterval = setInterval(() => {
        // Simulate variable download speed
        const increment = Math.floor(Math.random() * 500 + 300) * 1024 // 300-800 KB per tick
        transferred = Math.min(transferred + increment, totalSize)

        const elapsed = (Date.now() - startTime) / 1000
        const bytesPerSecond = Math.floor(transferred / elapsed)
        const percent = Math.floor((transferred / totalSize) * 100)

        const progress: UpdateProgress = {
          percent,
          transferred,
          total: totalSize,
          bytesPerSecond
        }

        this.setState({ progress })
        this.emitProgress(progress)

        // Download complete
        if (transferred >= totalSize) {
          if (this.downloadInterval) {
            clearInterval(this.downloadInterval)
            this.downloadInterval = null
          }

          this.setState({
            status: 'downloaded',
            progress: {
              percent: 100,
              transferred: totalSize,
              total: totalSize,
              bytesPerSecond
            }
          })

          resolve()
        }
      }, 200) // Update every 200ms
    })
  }

  /**
   * Simulate installing update and restarting
   */
  async installAndRestart(): Promise<void> {
    if (this.state.status !== 'downloaded') {
      this.setState({ status: 'error', error: 'Update not downloaded yet' })
      return
    }

    this.setState({ status: 'installing', error: null })

    // Simulate installation delay
    await this.delay(2000)

    // In a real app, this would call app.quit() and install
    // For simulation, we'll just show that it's ready to restart
    console.log('Simulated restart - app would restart here')

    // Optionally restart the app (commented out for safety)
    // app.relaunch()
    // app.quit()

    // For simulation purposes, reset to idle after "restart"
    this.restartTimeout = setTimeout(() => {
      this.reset()
    }, 3000)
  }

  /**
   * Cancel ongoing download
   */
  cancelDownload(): void {
    if (this.downloadInterval) {
      clearInterval(this.downloadInterval)
      this.downloadInterval = null
    }

    this.setState({
      status: 'idle',
      progress: null,
      error: 'Download cancelled'
    })
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    if (this.downloadInterval) {
      clearInterval(this.downloadInterval)
      this.downloadInterval = null
    }

    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout)
      this.restartTimeout = null
    }

    this.state = {
      status: 'idle',
      updateInfo: null,
      progress: null,
      error: null
    }

    this.emitState()
  }

  /**
   * Get current state
   */
  getState(): UpdateState {
    return { ...this.state }
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(callback: StateCallback): () => void {
    this.stateCallbacks.push(callback)
    return () => {
      this.stateCallbacks = this.stateCallbacks.filter((cb) => cb !== callback)
    }
  }

  /**
   * Subscribe to progress updates
   */
  onProgress(callback: ProgressCallback): () => void {
    this.progressCallbacks.push(callback)
    return () => {
      this.progressCallbacks = this.progressCallbacks.filter((cb) => cb !== callback)
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.downloadInterval) {
      clearInterval(this.downloadInterval)
    }
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout)
    }
    this.stateCallbacks = []
    this.progressCallbacks = []
  }

  private setState(partial: Partial<UpdateState>): void {
    this.state = { ...this.state, ...partial }
    this.emitState()
  }

  private emitState(): void {
    const state = this.getState()
    this.stateCallbacks.forEach((callback) => callback(state))
  }

  private emitProgress(progress: UpdateProgress): void {
    this.progressCallbacks.forEach((callback) => callback(progress))
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private generateReleaseNotes(version: string): string {
    const features = [
      'Improved performance and stability',
      'Fixed memory leaks in document handling',
      'Enhanced clipboard operations',
      'Better notification system',
      'Updated UI components',
      'Security patches and bug fixes',
      'Optimized file system operations',
      'Improved dark mode support',
      'Better error handling',
      'Enhanced tray icon functionality'
    ]

    const bugFixes = [
      'Fixed crash on large file operations',
      'Resolved memory leak in image processing',
      'Fixed notification click handling',
      'Corrected window positioning issues',
      'Fixed clipboard HTML parsing',
      'Resolved tray icon refresh issues'
    ]

    const selectedFeatures = this.getRandomItems(features, 3)
    const selectedBugFixes = this.getRandomItems(bugFixes, 2)

    return `# Version ${version}

## New Features
${selectedFeatures.map((f) => `- ${f}`).join('\n')}

## Bug Fixes
${selectedBugFixes.map((f) => `- ${f}`).join('\n')}

## Other Improvements
- General performance optimizations
- Updated dependencies
- Improved documentation`
  }

  private getRandomItems<T>(array: T[], count: number): T[] {
    const shuffled = [...array].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, count)
  }
}
