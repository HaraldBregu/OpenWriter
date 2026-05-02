// ---------------------------------------------------------------------------
// Shared IPC Channel Constants & Type Maps
// ---------------------------------------------------------------------------
// Single source of truth for all IPC channel names and their type signatures.
// Used by main, preload, and renderer.
//
// DO NOT import Electron, Node.js, React, or any browser APIs here.
// This file must be valid in all three process contexts.
// ---------------------------------------------------------------------------
// ===========================================================================
// Channel Name Constants (grouped by domain)
// ===========================================================================
export const WorkspaceChannels = {
    // Workspace
    getCurrent: 'workspace-get-current',
    setCurrent: 'workspace-set-current',
    list: 'workspace-list',
    create: 'workspace-create',
    clear: 'workspace-clear',
    changed: 'workspace:changed',
    deleted: 'workspace:deleted',
    // Indexing
    getIndexingInfo: 'indexing:get-info',
    // Shell
    openWorkspaceFolder: 'workspace:open-workspace-folder',
    openDataFolder: 'workspace:open-data-folder',
    openContentsFolder: 'workspace:open-contents-folder',
    openFilesFolder: 'workspace:open-files-folder',
    openImagesFolder: 'workspace:open-images-folder',
    openDocumentFolder: 'workspace:open-document-folder',
    getDocumentPath: 'workspace:get-document-path',
    // Document images
    saveDocumentImage: 'output:save-document-image',
    listDocumentImages: 'output:list-document-images',
    documentImageChanged: 'output:document-image-changed',
    // Output
    outputSave: 'output:save',
    outputLoadAll: 'output:load-all',
    loadByType: 'output:load-by-type',
    outputLoadOne: 'output:load-one',
    outputDelete: 'output:delete',
    outputTrash: 'output:trash',
    outputFileChanged: 'output:file-changed',
    // Filesystem
    fsReadFile: 'fs:read-file',
    fsReadFileBinary: 'fs:read-file-binary',
    fsWriteFile: 'fs:write-file',
    fsCreateFolder: 'fs:create-folder',
    fsDeleteFolder: 'fs:delete-folder',
    fsDeleteFile: 'fs:delete-file',
    fsRename: 'fs:rename',
    fsListDir: 'fs:list-dir',
    // Project workspace
    getProjectInfo: 'project-workspace:get-info',
    updateProjectName: 'project-workspace:update-name',
    updateProjectDescription: 'project-workspace:update-description',
    // Document config + content (merged writer)
    getDocumentConfig: 'workspace:get-document-config',
    documentConfigChanged: 'workspace:document-config-changed',
    getDocumentContent: 'workspace:get-document-content',
    updateDocumentContent: 'workspace:update-document-content',
    updateDocumentConfig: 'workspace:update-document-config',
    // Contents (workspace/contents/)
    getContents: 'contents:get-all',
    getContentsFolders: 'contents:get-folders',
    insertContents: 'contents:insert',
    deleteContent: 'contents:delete',
    // Files (workspace/files/)
    // Images (workspace/images/)
    getImages: 'images:get-all',
    insertImages: 'images:insert',
    deleteImage: 'images:delete',
    imagesChanged: 'images:changed',
};
export const WindowChannels = {
    minimize: 'window:minimize',
    maximize: 'window:maximize',
    close: 'window:close',
    isMaximized: 'window:is-maximized',
    isFullScreen: 'window:is-fullscreen',
    maximizeChange: 'window:maximize-change',
    fullScreenChange: 'window:fullscreen-change',
    getPlatform: 'window:get-platform',
    popupMenu: 'window:popup-menu',
};
export const TaskChannels = {
    submit: 'task:submit',
    cancel: 'task:cancel',
    list: 'task:list',
    event: 'task:event',
    getSnapshot: 'task:get-snapshot',
    findForDocument: 'task:find-for-document',
};
export const AssistantChannels = {
    send: 'assistant:send',
    reset: 'assistant:reset',
    response: 'assistant:response',
};
export const AppChannels = {
    playSound: 'play-sound',
    setTheme: 'set-theme',
    setLanguage: 'set-language',
    contextMenu: 'context-menu',
    contextMenuEditable: 'context-menu-editable',
    showContextMenu: 'context-menu:show',
    changeLanguage: 'change-language',
    changeTheme: 'change-theme',
    fileOpened: 'file-opened',
    // Writing context menu (formerly ContextMenuChannels)
    showWritingContextMenu: 'context-menu:writing',
    writingContextMenuAction: 'context-menu:writing-action',
    // Store / Provider management
    getProviders: 'app:get-providers',
    addProvider: 'app:add-provider',
    deleteProvider: 'app:delete-provider',
    getAgents: 'app:get-agents',
    updateAgent: 'app:update-agent',
    getStartupInfo: 'app:get-startup-info',
    getProfile: 'app:get-profile',
    setProfile: 'app:set-profile',
    completeFirstRunConfiguration: 'app:complete-first-run-configuration',
    getModels: 'app:get-models',
    // Logs
    getLogs: 'app:get-logs',
    openLogsFolder: 'app:open-logs-folder',
    // App data folder
    openAppDataFolder: 'app:open-app-data-folder',
    getAppDataFolder: 'app:get-app-data-folder',
    // Theme management
    getCustomThemes: 'app:get-custom-themes',
    openThemesFolder: 'app:open-themes-folder',
    importTheme: 'app:import-theme',
    getCustomThemeTokens: 'app:get-custom-theme-tokens',
    deleteTheme: 'app:delete-theme',
    // System settings
    openSystemAccessibility: 'app:open-system-accessibility',
    openSystemScreenRecording: 'app:open-system-screen-recording',
    // Tray
    setTrayEnabled: 'app:set-tray-enabled',
    getTrayEnabled: 'app:get-tray-enabled',
    // Cron jobs
    cronSchedule: 'app:cron-schedule',
    cronUnschedule: 'app:cron-unschedule',
    cronListJobs: 'app:cron-list-jobs',
    cronHasJob: 'app:cron-has-job',
    cronTick: 'app:cron-tick',
    // Global keyboard shortcuts (main → renderer)
    shortcut: 'app:shortcut',
    // Developer dialogs (main → renderer)
    openTasksDialog: 'app:open-tasks-dialog',
    openLogsDialog: 'app:open-logs-dialog',
    openReduxDialog: 'app:open-redux-dialog',
    openCronDialog: 'app:open-cron-dialog',
};
