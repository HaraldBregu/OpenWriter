import type {
  MediaPermissionStatus,
  MediaDeviceInfo,
  NetworkConnectionStatus,
  NetworkInterfaceInfo,
  NetworkInfo,
  CronJobConfig,
  CronJobStatus,
  CronJobResult,
  LifecycleEvent,
  LifecycleState,
  FileInfo,
  FsWatchEvent,
  DialogResult,
  NotificationOptions,
  NotificationResult,
  ClipboardContent,
  ClipboardImageData,
  WorkspaceInfo,
  PipelineEvent,
  PipelineActiveRun,
  TaskSubmitPayload,
  TaskInfo,
  TaskEvent,
  OutputType,
  BlockContentItem,
  OutputFileMetadata,
  OutputFileBlock,
  OutputFile,
  OutputFileChangeEvent,
  ManagedWindowType,
  ManagedWindowInfo,
  WindowManagerState,
} from '../shared/types/ipc/types'

interface Window {
    /** General application utilities */
    app: {
      playSound: () => void
      setTheme: (theme: string) => void
      showContextMenu: () => void
      showContextMenuEditable: () => void
      onLanguageChange: (callback: (lng: string) => void) => () => void
      onThemeChange: (callback: (theme: string) => void) => () => void
      onFileOpened: (callback: (filePath: string) => void) => () => void
      popupMenu: () => void
      getPlatform: () => Promise<string>
    }

    /** Window controls (minimize / maximize / close / fullscreen).
     *  Declared optional so renderer code can guard against non-Electron environments. */
    win?: {
      minimize: () => void
      maximize: () => void
      close: () => void
      isMaximized: () => Promise<boolean>
      isFullScreen: () => Promise<boolean>
      onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void
      onFullScreenChange: (callback: (isFullScreen: boolean) => void) => () => void
    }

    /** Microphone / camera permissions and device enumeration */
    media: {
      requestMicrophonePermission: () => Promise<MediaPermissionStatus>
      requestCameraPermission: () => Promise<MediaPermissionStatus>
      getMicrophonePermissionStatus: () => Promise<MediaPermissionStatus>
      getCameraPermissionStatus: () => Promise<MediaPermissionStatus>
      getDevices: (type: 'audioinput' | 'videoinput') => Promise<MediaDeviceInfo[]>
    }

    /** Bluetooth capability queries */
    bluetooth: {
      isSupported: () => Promise<boolean>
      getPermissionStatus: () => Promise<string>
      getInfo: () => Promise<{ platform: string; supported: boolean; apiAvailable: boolean }>
    }

    /** Network connectivity and interface information */
    network: {
      isSupported: () => Promise<boolean>
      getConnectionStatus: () => Promise<NetworkConnectionStatus>
      getInterfaces: () => Promise<NetworkInterfaceInfo[]>
      getInfo: () => Promise<NetworkInfo>
      onStatusChange: (callback: (status: NetworkConnectionStatus) => void) => () => void
    }

    /** Scheduled job management */
    cron: {
      getAll: () => Promise<CronJobStatus[]>
      getJob: (id: string) => Promise<CronJobStatus | null>
      start: (id: string) => Promise<boolean>
      stop: (id: string) => Promise<boolean>
      delete: (id: string) => Promise<boolean>
      create: (config: CronJobConfig) => Promise<boolean>
      updateSchedule: (id: string, schedule: string) => Promise<boolean>
      validateExpression: (expression: string) => Promise<{ valid: boolean; description?: string; error?: string }>
      onJobResult: (callback: (result: CronJobResult) => void) => () => void
    }

    /** App lifecycle state and events */
    lifecycle: {
      getState: () => Promise<LifecycleState>
      getEvents: () => Promise<LifecycleEvent[]>
      restart: () => Promise<void>
      onEvent: (callback: (event: LifecycleEvent) => void) => () => void
    }

    /** Window manager — child / modal / frameless / widget windows */
    wm: {
      getState: () => Promise<WindowManagerState>
      createChild: () => Promise<ManagedWindowInfo>
      createModal: () => Promise<ManagedWindowInfo>
      createFrameless: () => Promise<ManagedWindowInfo>
      createWidget: () => Promise<ManagedWindowInfo>
      closeWindow: (id: number) => Promise<boolean>
      closeAll: () => Promise<void>
      onStateChange: (callback: (state: WindowManagerState) => void) => () => void
    }

    /** Filesystem operations and directory watching */
    fs: {
      openFile: () => Promise<FileInfo | null>
      readFile: (filePath: string) => Promise<FileInfo>
      saveFile: (defaultName: string, content: string) => Promise<{ success: boolean; filePath: string | null }>
      writeFile: (filePath: string, content: string) => Promise<{ success: boolean; filePath: string }>
      selectDirectory: () => Promise<string | null>
      watchDirectory: (dirPath: string) => Promise<boolean>
      unwatchDirectory: (dirPath: string) => Promise<boolean>
      getWatched: () => Promise<string[]>
      onWatchEvent: (callback: (event: FsWatchEvent) => void) => () => void
    }

    /** Native OS dialog boxes */
    dialog: {
      open: () => Promise<DialogResult>
      openDirectory: (multiSelections?: boolean) => Promise<DialogResult>
      save: () => Promise<DialogResult>
      message: (message: string, detail: string, buttons: string[]) => Promise<DialogResult>
      error: (title: string, content: string) => Promise<DialogResult>
    }

    /** Desktop notifications */
    notification: {
      isSupported: () => Promise<boolean>
      show: (options: NotificationOptions) => Promise<string>
      onEvent: (callback: (result: NotificationResult) => void) => () => void
    }

    /** Clipboard read / write operations */
    clipboard: {
      writeText: (text: string) => Promise<boolean>
      readText: () => Promise<string>
      writeHTML: (html: string) => Promise<boolean>
      readHTML: () => Promise<string>
      writeImage: (dataURL: string) => Promise<boolean>
      readImage: () => Promise<ClipboardImageData | null>
      clear: () => Promise<boolean>
      getContent: () => Promise<ClipboardContent | null>
      getFormats: () => Promise<string[]>
      hasText: () => Promise<boolean>
      hasImage: () => Promise<boolean>
      hasHTML: () => Promise<boolean>
    }

    /** Persisted AI model settings */
    store: {
      // New provider settings methods
      getAllProviderSettings: () => Promise<Record<string, { selectedModel: string; apiToken: string; temperature: number; maxTokens: number | null; reasoning: boolean }>>
      getProviderSettings: (providerId: string) => Promise<{ selectedModel: string; apiToken: string; temperature: number; maxTokens: number | null; reasoning: boolean } | null>
      setProviderSettings: (providerId: string, settings: { selectedModel: string; apiToken: string; temperature: number; maxTokens: number | null; reasoning: boolean }) => Promise<void>
      setInferenceDefaults: (providerId: string, update: { temperature?: number; maxTokens?: number | null; reasoning?: boolean }) => Promise<void>
      // Legacy methods
      getAllModelSettings: () => Promise<Record<string, { selectedModel: string; apiToken: string }>>
      getModelSettings: (providerId: string) => Promise<{ selectedModel: string; apiToken: string } | null>
      setSelectedModel: (providerId: string, modelId: string) => Promise<void>
      setApiToken: (providerId: string, token: string) => Promise<void>
      setModelSettings: (providerId: string, settings: { selectedModel: string; apiToken: string }) => Promise<void>
    }

    /** Workspace folder selection and recent workspaces */
    workspace: {
      selectFolder: () => Promise<string | null>
      getCurrent: () => Promise<string | null>
      setCurrent: (workspacePath: string) => Promise<void>
      getRecent: () => Promise<WorkspaceInfo[]>
      clear: () => Promise<void>
      directoryExists: (directoryPath: string) => Promise<boolean>
      removeRecent: (workspacePath: string) => Promise<void>
    }

    /** Post sync and file-watch events */
    posts: {
      syncToWorkspace: (posts: Array<{
        id: string
        title: string
        blocks: Array<{ id: string; content: string; createdAt: string; updatedAt: string }>
        category: string
        tags: string[]
        visibility: string
        createdAt: number
        updatedAt: number
      }>) => Promise<{
        success: boolean
        syncedCount: number
        failedCount: number
        errors?: Array<{ postId: string; error: string }>
      }>
      update: (post: {
        id: string
        title: string
        blocks: Array<{ id: string; content: string; createdAt: string; updatedAt: string }>
        category: string
        tags: string[]
        visibility: string
        createdAt: number
        updatedAt: number
      }) => Promise<void>
      delete: (postId: string) => Promise<void>
      loadFromWorkspace: () => Promise<Array<{
        id: string
        title: string
        blocks: Array<{ id: string; content: string; createdAt: string; updatedAt: string }>
        category: string
        tags: string[]
        visibility: string
        createdAt: number
        updatedAt: number
      }>>
      onFileChange: (callback: (event: {
        type: 'added' | 'changed' | 'removed'
        postId: string
        filePath: string
        timestamp: number
      }) => void) => () => void
      onWatcherError: (callback: (error: { error: string; timestamp: number }) => void) => () => void
    }

    /** Document import, download, and file-watch events */
    documents: {
      importFiles: () => Promise<Array<{
        id: string
        name: string
        path: string
        size: number
        mimeType: string
        importedAt: number
        lastModified: number
      }>>
      importByPaths: (paths: string[]) => Promise<Array<{
        id: string
        name: string
        path: string
        size: number
        mimeType: string
        importedAt: number
        lastModified: number
      }>>
      downloadFromUrl: (url: string) => Promise<{
        id: string
        name: string
        path: string
        size: number
        mimeType: string
        importedAt: number
        lastModified: number
      }>
      loadAll: () => Promise<Array<{
        id: string
        name: string
        path: string
        size: number
        mimeType: string
        importedAt: number
        lastModified: number
      }>>
      delete: (id: string) => Promise<void>
      onFileChange: (callback: (event: {
        type: 'added' | 'changed' | 'removed'
        fileId: string
        filePath: string
        timestamp: number
      }) => void) => () => void
      onWatcherError: (callback: (error: { error: string; timestamp: number }) => void) => () => void
    }

    /** AI agent execution and session management */
    agent: {
      run: (messages: Array<{ role: 'user' | 'assistant'; content: string }>, runId: string, providerId: string) => Promise<void>
      cancel: (runId: string) => void
      onEvent: (callback: (eventType: string, data: unknown) => void) => () => void
      createSession: (config: {
        sessionId: string
        providerId: string
        modelId?: string
        systemPrompt?: string
        temperature?: number
        maxTokens?: number
        metadata?: Record<string, unknown>
      }) => Promise<{
        sessionId: string
        providerId: string
        modelId: string
        createdAt: number
        lastActivity: number
        isActive: boolean
        messageCount: number
        metadata?: Record<string, unknown>
      }>
      destroySession: (sessionId: string) => Promise<boolean>
      getSession: (sessionId: string) => Promise<{
        sessionId: string
        providerId: string
        modelId: string
        createdAt: number
        lastActivity: number
        isActive: boolean
        messageCount: number
        metadata?: Record<string, unknown>
      } | null>
      listSessions: () => Promise<Array<{
        sessionId: string
        providerId: string
        modelId: string
        createdAt: number
        lastActivity: number
        isActive: boolean
        messageCount: number
        metadata?: Record<string, unknown>
      }>>
      clearSessions: () => Promise<number>
      runSession: (options: {
        sessionId: string
        runId: string
        messages: Array<{ role: 'user' | 'assistant'; content: string }>
        providerId: string
        temperature?: number
        maxTokens?: number
        stream?: boolean
      }) => Promise<void>
      cancelSession: (sessionId: string) => Promise<boolean>
      getStatus: () => Promise<{
        totalSessions: number
        activeSessions: number
        totalMessages: number
      }>
      isRunning: (runId: string) => Promise<boolean>
    }

    /** Application-specific context menus */
    contextMenu: {
      showWriting: (writingId: string, writingTitle: string) => Promise<void>
      onWritingAction: (callback: (data: { action: string; writingId: string }) => void) => () => void
      showPost: (postId: string, postTitle: string) => Promise<void>
      onPostAction: (callback: (data: { action: string; postId: string }) => void) => () => void
    }

    /** Indexed directory management */
    directories: {
      list: () => Promise<Array<{
        id: string
        path: string
        addedAt: number
        isIndexed: boolean
        lastIndexedAt?: number
      }>>
      add: (dirPath: string) => Promise<{
        id: string
        path: string
        addedAt: number
        isIndexed: boolean
        lastIndexedAt?: number
      }>
      addMany: (dirPaths: string[]) => Promise<{
        added: Array<{
          id: string
          path: string
          addedAt: number
          isIndexed: boolean
          lastIndexedAt?: number
        }>
        errors: Array<{ path: string; error: string }>
      }>
      remove: (id: string) => Promise<boolean>
      validate: (dirPath: string) => Promise<{ valid: boolean; error?: string }>
      markIndexed: (id: string, isIndexed: boolean) => Promise<boolean>
      onChanged: (callback: (directories: Array<{
        id: string
        path: string
        addedAt: number
        isIndexed: boolean
        lastIndexedAt?: number
      }>) => void) => () => void
    }

    /** Personality / conversation file management */
    personality: {
      save: (input: {
        sectionId: string
        content: string
        metadata?: Record<string, unknown>
      }) => Promise<{
        id: string
        path: string
        savedAt: number
      }>
      loadAll: () => Promise<Array<{
        id: string
        sectionId: string
        path: string
        metadata: {
          title: string
          provider: string
          model: string
          [key: string]: unknown
        }
        content: string
        savedAt: number
      }>>
      loadOne: (params: {
        sectionId: string
        id: string
      }) => Promise<{
        id: string
        sectionId: string
        path: string
        metadata: {
          title: string
          provider: string
          model: string
          [key: string]: unknown
        }
        content: string
        savedAt: number
      } | null>
      delete: (params: {
        sectionId: string
        id: string
      }) => Promise<void>
      onFileChange: (callback: (event: {
        type: 'added' | 'changed' | 'removed'
        sectionId: string
        fileId: string
        filePath: string
        timestamp: number
      }) => void) => () => void
      onWatcherError: (callback: (error: { error: string; timestamp: number }) => void) => () => void
      loadSectionConfig: (params: { sectionId: string }) => Promise<{
        schemaVersion: number
        provider: string
        model: string
        temperature?: number | null
        maxTokens?: number | null
        reasoning?: boolean
        displayName?: string
        description?: string
        createdAt: string
        updatedAt: string
      } | null>
      saveSectionConfig: (params: {
        sectionId: string
        update: {
          provider?: string
          model?: string
          temperature?: number | null
          maxTokens?: number | null
          reasoning?: boolean
          displayName?: string
          description?: string
        }
      }) => Promise<{
        schemaVersion: number
        provider: string
        model: string
        temperature?: number | null
        maxTokens?: number | null
        reasoning?: boolean
        displayName?: string
        description?: string
        createdAt: string
        updatedAt: string
      }>
      onSectionConfigChange: (callback: (event: {
        sectionId: string
        config: {
          schemaVersion: number
          provider: string
          model: string
          temperature?: number | null
          maxTokens?: number | null
          reasoning?: boolean
          displayName?: string
          description?: string
          createdAt: string
          updatedAt: string
        } | null
        timestamp: number
      }) => void) => () => void
    }

    /** Output file management for posts and writings */
    output: {
      /**
       * Create a new output folder with individual .md files per block.
       * `blocks` is an ordered array; each entry produces a <name>.md file.
       */
      save: (input: {
        type: string
        blocks: Array<{ name: string; content: string; createdAt: string; updatedAt: string }>
        metadata?: Record<string, unknown>
      }) => Promise<{ id: string; path: string; savedAt: number }>
      loadAll: () => Promise<OutputFile[]>
      loadByType: (type: string) => Promise<OutputFile[]>
      loadOne: (params: { type: string; id: string }) => Promise<OutputFile | null>
      /**
       * Update an existing output folder: rewrites changed block files and
       * updates config.json (preserving createdAt, managing per-block timestamps).
       */
      update: (params: {
        type: string
        id: string
        blocks: Array<{ name: string; content: string; createdAt: string; updatedAt: string }>
        metadata: Record<string, unknown>
      }) => Promise<void>
      delete: (params: { type: string; id: string }) => Promise<void>
      onFileChange: (callback: (event: OutputFileChangeEvent) => void) => () => void
      onWatcherError: (callback: (error: { error: string; timestamp: number }) => void) => () => void
    }

    /** Background task queue.
     *  Declared optional so renderer code can guard against non-Electron environments. */
    task?: {
      submit: (type: string, input: unknown, options?: TaskSubmitPayload['options']) => Promise<{ success: true; data: { taskId: string } } | { success: false; error: { code: string; message: string } }>
      cancel: (taskId: string) => Promise<{ success: true; data: boolean } | { success: false; error: { code: string; message: string } }>
      list: () => Promise<{ success: true; data: TaskInfo[] } | { success: false; error: { code: string; message: string } }>
      onEvent: (callback: (event: TaskEvent) => void) => () => void
    }

    /** AI inference API (pipeline-based) */
    ai: {
      inference: (agentName: string, input: { prompt: string; context?: Record<string, unknown> }) => Promise<{ success: true; data: { runId: string } } | { success: false; error: { code: string; message: string } }>
      cancel: (runId: string) => void
      onEvent: (callback: (event: PipelineEvent) => void) => () => void
      listAgents: () => Promise<{ success: true; data: string[] } | { success: false; error: { code: string; message: string } }>
      listRuns: () => Promise<{ success: true; data: PipelineActiveRun[] } | { success: false; error: { code: string; message: string } }>
    }
  }
