import { autoUpdater, app } from 'electron'
import { is } from '@electron-toolkit/utils'
import type { UpdateState } from '../types/update'

export class UpdateService {
  private state: UpdateState = {
    status: 'idle',
    updateInfo: null,
    error: null
  }

  private stateCallback: ((state: UpdateState) => void) | null = null
  private checkInterval: ReturnType<typeof setInterval> | null = null

  constructor() {
    if (is.dev) return

    const server = 'https://update.electronjs.org'
    const feed = `${server}/HaraldBregu/tesseract-ai/${process.platform}/${app.getVersion()}`
    autoUpdater.setFeedURL({ url: feed })

    autoUpdater.on('checking-for-update', () => {
      this.setState({ status: 'checking', error: null })
    })

    autoUpdater.on('update-available', () => {
      this.setState({ status: 'downloading', error: null })
    })

    autoUpdater.on('update-not-available', () => {
      this.setState({ status: 'not-available', error: null })
    })

    autoUpdater.on('update-downloaded', (_event, releaseNotes, releaseName) => {
      this.setState({
        status: 'downloaded',
        updateInfo: {
          version: releaseName || 'New version',
          releaseNotes: releaseNotes || undefined
        }
      })
    })

    autoUpdater.on('error', (err) => {
      this.setState({ status: 'error', error: err.message })
    })
  }

  initialize(): void {
    if (is.dev) return

    // Auto-check after 10 seconds
    setTimeout(() => {
      this.checkForUpdates()
    }, 10_000)

    // Periodic check every 4 hours
    this.checkInterval = setInterval(
      () => {
        this.checkForUpdates()
      },
      4 * 60 * 60 * 1000
    )
  }

  checkForUpdates(): void {
    if (is.dev) return
    try {
      autoUpdater.checkForUpdates()
    } catch (err) {
      console.error('Update check failed:', err)
    }
  }

  installUpdate(): void {
    if (is.dev) return
    autoUpdater.quitAndInstall()
  }

  getState(): UpdateState {
    return { ...this.state }
  }

  onStateChange(callback: (state: UpdateState) => void): void {
    this.stateCallback = callback
  }

  destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }

  private setState(partial: Partial<UpdateState>): void {
    this.state = { ...this.state, ...partial }
    this.stateCallback?.(this.getState())
  }
}
