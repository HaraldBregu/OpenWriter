//global types definition must not be abused,
//only use it when you need to extend the global object to let communicate electron with the renderer process (react)
/*interface Window {
  electron: {
    sendLog: (entry: unknown) => void
    sendData: (data: DocumentContentParsed) => void
    subscribeAlertMessage: (callback: (message: Alert) => void) => () => void
    getOpenedDocumentContent: (callback: (content: DocumentContent) => void) => () => void
    startNewDocument: (callback: (content: DocumentContent) => void) => () => void
    setElectronLanguage: (lang: string) => void
    onLanguageChanged: (callback: (lang: string) => void) => () => void
    onCapitalizationChange: (callback: (type: string) => void) => () => void
    onCharacterSpacingChange: (callback: (type: string) => void) => () => void
    onCharacterStyleChange: (callback: (style: string) => void) => () => void
    onListStyleChange: (callback: (style: string) => void) => () => void
    onTextAlignmentChange: (callback: (style: string) => void) => () => void
    onIndentLevelChange: (callback: (increase: boolean) => void) => () => void
    onShowSpacingSettings: (callback: () => void) => () => void
    onSetSpacing: (callback: (space: string) => void) => () => void
    getSystemFonts: (callback: (fonts: string[]) => void) => () => void
    onUndoChange: (callback: () => void) => () => void
    onRedoChange: (callback: () => void) => () => void
    updateUndoRedoState: (canUndo: boolean, canRedo: boolean) => void
    onLigatureChange: (callback: (style: string) => void) => () => void
    onInsertComment: (callback: () => void) => () => void
  }
}*/

interface Alert {
  message: string
  type: string
  comments?: CategoryState[] | []
}

interface EditorContent {
  mainText: string
  apparatusText: string
  comments?: CategoryState[] | []
}

type DocumentContent = string | null

interface DocumentContentParsed {
  mainText: string | null
  apparatusText: string | null
  comments?: CategoryState[] | []
}

interface ErrorDetails {
  errorCode: number
  errorMessage: string
  stack?: string
}

interface PerformanceDetails {
  durationMs: number
  memoryUsage?: number
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  process: 'main' | 'renderer'
  category: string
  message: string
  details?: ErrorDetails | PerformanceDetails
  duration?: number
}

type LigatureType = 'standard' | 'all' | 'none'

interface CommentState {
  id: string
  title: string
  selectedText: string
  comment: string
}

interface CategoryState {
  id: string
  name: string
  comments: CommentState[]
}

interface ConfigSettings {
  theme: 'light' | 'dark'
  fontSize: number
  language: string
  autoSave: boolean
}
