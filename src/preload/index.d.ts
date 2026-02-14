import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      playSound: () => void
      onLanguageChange: (callback: (lng: string) => void) => () => void
    }
  }
}
