export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error'

export interface UpdateInfo {
  version: string
  releaseNotes?: string
}

export interface UpdateState {
  status: UpdateStatus
  updateInfo: UpdateInfo | null
  error: string | null
}
